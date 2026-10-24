// Rebuild distributable SQL from the shared workflow definitions. No database access.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const schemaPath = path.join(root, "database", "schema.sql");
const migrationPath = path.join(root, "database", "migrations", "20261024_v5_workflows.sql");
const viewingMigrationPath = path.join(root, "database", "migrations", "20261025_viewing_proposals.sql");
const cleanupMigrationPath = path.join(root, "database", "migrations", "20261025_contract_viewing_cleanup.sql");
const marker = "-- BEGIN V5 WORKFLOW OBJECTS 20261024";
function build() {
  let schema = fs.readFileSync(schemaPath, "utf8").replaceAll("\r\n", "\n");
  const objects = fs.readFileSync(path.join(root, "database", "source", "workflows.sql"), "utf8").replaceAll("\r\n", "\n").trimEnd() + "\n";
  const proposals = fs.readFileSync(path.join(root, "database", "source", "viewing-proposals.sql"), "utf8").replaceAll("\r\n", "\n").trimEnd() + "\n";
  const cleanup = fs.readFileSync(path.join(root, "database", "source", "contract-viewing-cleanup.sql"), "utf8").replaceAll("\r\n", "\n").trimEnd() + "\n";
  schema = schema.split(marker)[0].trimEnd() + "\n";
  for (const name of ["trg_viewings_before_update", "trg_contracts_before_insert", "trg_contracts_before_update"]) {
    schema = schema.replace(new RegExp("CREATE TRIGGER `" + name + "`[\\s\\S]*?END\\$\\$\\s*", "g"), "");
  }
  schema = schema.trimEnd() + "\n\n" + objects + "\n" + proposals + "\n" + cleanup;
  const historyDDL = /CREATE TABLE `contract_representative_history` \([\s\S]*?\) ENGINE=[^\n]+;/.exec(schema)?.[0];
  if (!historyDDL) throw new Error("History table definition is missing");
  const foreignKeys = schema.split("\n").filter((line) => line.startsWith("ALTER TABLE `contract_representative_history`") || line.includes("`fk_changes_cancelled_by`") || line.includes("`fk_join_cancelled_by`")).join("\n");
  const upgrade = `-- V5 upgrade 2026-10-24; run once against the original 39-table V5.
-- Stop application writers and back up first. DDL implicitly commits in MySQL.
-- Do not use --force. A failed preflight makes no business-data changes.
USE room_rental_v5_20261023;
SET time_zone = '+00:00';
DELIMITER $$
DROP PROCEDURE IF EXISTS _v5_preflight_upgrade$$
CREATE PROCEDURE _v5_preflight_upgrade()
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='contract_representative_history')
    OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='contracts' AND column_name='initial_representative_room_tenant_id') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='V5 workflow upgrade is already applied or incomplete; do not rerun blindly';
  END IF;
  IF EXISTS (SELECT room_id FROM contracts WHERE status IN ('DRAFT','PENDING_CONFIRMATION','CONFIRMED','ACTIVE') GROUP BY room_id HAVING COUNT(*)>1) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Preflight: reconcile multiple open contracts for the same room';
  END IF;
  IF EXISTS (SELECT 1 FROM contracts c LEFT JOIN room_tenants rt ON rt.id=c.representative_room_tenant_id AND rt.contract_id=c.id
    WHERE c.status='ACTIVE' AND (rt.id IS NULL OR rt.status<>'ACTIVE')) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Preflight: reconcile ACTIVE contracts without an ACTIVE representative';
  END IF;
  IF EXISTS (SELECT 1 FROM room_tenants rt JOIN contracts c ON c.id=rt.contract_id
    WHERE c.status IN ('TERMINATED','EXPIRED','CANCELLED') AND rt.status IN ('ACTIVE','PLANNED')) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Preflight: reconcile open stays on closed contracts';
  END IF;
  IF EXISTS (SELECT 1 FROM rooms r WHERE r.max_occupants <
    (SELECT COUNT(*) FROM room_tenants rt JOIN contracts c ON c.id=rt.contract_id WHERE rt.room_id=r.id
      AND (rt.status='ACTIVE' OR (rt.status='PLANNED' AND c.status IN ('DRAFT','PENDING_CONFIRMATION','CONFIRMED','ACTIVE'))))
    + (SELECT COUNT(*) FROM occupant_join_requests j JOIN contracts c ON c.id=j.contract_id WHERE c.room_id=r.id
      AND c.status='ACTIVE' AND j.status='APPROVED' AND j.hold_expires_at>UTC_TIMESTAMP(6)
      AND NOT EXISTS (SELECT 1 FROM room_tenants rt WHERE rt.join_request_id=j.id AND rt.status IN ('PLANNED','ACTIVE')))) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Preflight: reconcile room overcapacity including planned members and valid holds';
  END IF;
END$$
CALL _v5_preflight_upgrade()$$
DROP PROCEDURE _v5_preflight_upgrade$$
DELIMITER ;

-- Replace the old update trigger only after validation; preserve the original viewing tenant.
DROP TRIGGER IF EXISTS trg_contracts_before_update;
ALTER TABLE contracts ADD COLUMN initial_representative_room_tenant_id BIGINT AFTER representative_room_tenant_id,
  MODIFY COLUMN live_room_id BIGINT GENERATED ALWAYS AS (CASE WHEN status IN ('DRAFT','PENDING_CONFIRMATION','CONFIRMED','ACTIVE') THEN room_id ELSE NULL END) STORED;
UPDATE contracts SET initial_representative_room_tenant_id=representative_room_tenant_id;
ALTER TABLE contracts DROP FOREIGN KEY fk_contract_viewing_representative,
  ADD KEY ix_contract_current_representative (id,representative_room_tenant_id),
  ADD KEY ix_contract_initial_representative (id,initial_representative_room_tenant_id,viewing_tenant_id);
ALTER TABLE contracts DROP INDEX ix_contract_viewing_representative;
ALTER TABLE contracts ADD CONSTRAINT fk_contract_initial_representative FOREIGN KEY(id,initial_representative_room_tenant_id) REFERENCES room_tenants(contract_id,id);
ALTER TABLE contracts ADD CONSTRAINT fk_contract_viewing_initial_rep FOREIGN KEY(id,initial_representative_room_tenant_id,viewing_tenant_id) REFERENCES room_tenants(contract_id,id,tenant_id);
ALTER TABLE contract_change_requests ADD COLUMN cancelled_at DATETIME(6), ADD COLUMN cancelled_by_id BIGINT, ADD COLUMN cancellation_reason VARCHAR(1000);
ALTER TABLE occupant_join_requests ADD COLUMN cancelled_by_id BIGINT, ADD COLUMN cancellation_reason VARCHAR(1000);

${historyDDL}
${foreignKeys}

-- Baselines deliberately keep unknown start/actor/consent unknown, including closed contracts.
INSERT INTO contract_representative_history(contract_id,room_tenant_id,tenant_id,name_snapshot,event_type,basis_revision_id,started_at,ended_at,is_current,reason,consent_method)
SELECT c.id,rt.id,rt.tenant_id,rt.full_name,'LEGACY_BASELINE',c.current_revision_id,NULL,
  CASE WHEN c.status IN ('TERMINATED','EXPIRED','CANCELLED') THEN c.closed_at ELSE NULL END,
  c.status IN ('DRAFT','PENDING_CONFIRMATION','CONFIRMED','ACTIVE'),
  'Imported V5 representative; original start and consent timestamps are unknown','LEGACY_UNKNOWN'
FROM contracts c JOIN room_tenants rt ON rt.id=c.representative_room_tenant_id AND rt.contract_id=c.id;

${objects}`;
  const viewingUpgrade = `-- Run once after workflow and chat-sharing migrations. Back up and stop writers first.
-- Do not use --force. Existing confirmed viewings and contract links are preserved.
USE room_rental_v5_20261023;
SET time_zone = '+00:00';
DELIMITER $$
DROP PROCEDURE IF EXISTS _v5_preflight_viewing_proposals$$
CREATE PROCEDURE _v5_preflight_viewing_proposals()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='contract_representative_history')
    OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='chat_messages' AND column_name='shared_post_id') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Apply workflow and chat sharing migrations before viewing proposals';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='room_viewing_proposals') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Viewing proposals migration already applied or incomplete; do not rerun blindly';
  END IF;
END$$
CALL _v5_preflight_viewing_proposals()$$
DROP PROCEDURE _v5_preflight_viewing_proposals$$
DELIMITER ;

${proposals}`;
  const cleanupUpgrade = `-- Run once AFTER 20261025_viewing_proposals.sql. Back up and stop writers first.
-- Routine-only upgrade: no new tables, no historical schedules rewritten.
USE room_rental_v5_20261023;
SET time_zone = '+00:00';
DELIMITER $$
DROP PROCEDURE IF EXISTS _v5_preflight_contract_viewing_cleanup$$
CREATE PROCEDURE _v5_preflight_contract_viewing_cleanup()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='room_viewing_proposals')
    OR NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema=DATABASE() AND routine_name='sp_create_rental_contract') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Apply viewing proposals migration before contract viewing cleanup';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema=DATABASE() AND routine_name='sp_create_rental_contract' AND routine_comment='V5_CONTRACT_VIEWING_CLEANUP_20261025') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Contract viewing cleanup migration already applied; do not rerun blindly';
  END IF;
END$$
CALL _v5_preflight_contract_viewing_cleanup()$$
DROP PROCEDURE _v5_preflight_contract_viewing_cleanup$$
DELIMITER ;

${cleanup}`;
  return { schema, upgrade, viewingUpgrade, cleanupUpgrade };
}
if (require.main === module) {
  const { schema, upgrade, viewingUpgrade, cleanupUpgrade } = build();
  if (process.argv.includes("--print-fresh")) process.stdout.write(schema);
  else if (process.argv.includes("--print-upgrade")) process.stdout.write(upgrade);
  else if (process.argv.includes("--check")) {
    if (fs.readFileSync(schemaPath, "utf8").replaceAll("\r\n", "\n") !== schema || fs.readFileSync(migrationPath, "utf8").replaceAll("\r\n", "\n") !== upgrade || fs.readFileSync(viewingMigrationPath, "utf8").replaceAll("\r\n", "\n") !== viewingUpgrade || fs.readFileSync(cleanupMigrationPath, "utf8").replaceAll("\r\n", "\n") !== cleanupUpgrade) throw new Error("SQL bundles differ from shared workflow source; rebuild them");
    console.log("Fresh schema and migration match the shared workflow definitions.");
  } else { fs.writeFileSync(schemaPath, schema); fs.writeFileSync(migrationPath, upgrade); fs.writeFileSync(viewingMigrationPath, viewingUpgrade); fs.writeFileSync(cleanupMigrationPath, cleanupUpgrade); }
}
module.exports = { build };
