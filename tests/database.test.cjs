// Integration checks use an isolated temporary MySQL instance, never the user's server.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const net = require("node:net");
const { spawn } = require("node:child_process");
const bin = process.env.MYSQL_BIN || "C:/Program Files/MySQL/MySQL Server 8.0/bin";
const root = path.resolve(__dirname, "..");
function processResult(executable, args, input = "", timeout = 60000) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd: os.tmpdir(), windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    const timer = setTimeout(() => { child.kill(); reject(new Error(`Timed out: ${path.basename(executable)} (${input.slice(0, 100).replaceAll("\n", " ")})`)); }, timeout);
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.stdout.on("data", (chunk) => { stdout += chunk; }); child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code) => { clearTimeout(timer); resolve({ code, stdout, stderr }); });
    child.stdin.on("error", () => {}); child.stdin.end(input);
  });
}
async function main() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "troday-mysql-"));
  let server;
  let serverLog = "";
  let query;
  let ownsServer = false;
  try {
    const initialized = await processResult(path.join(bin, "mysqld.exe"), ["--no-defaults", "--initialize-insecure", `--basedir=${path.dirname(bin)}`, `--datadir=${directory}`, "--console"], "", 30000);
    assert.equal(initialized.code, 0, initialized.stderr);
    const socket = net.createServer(); await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve));
    const port = socket.address().port; await new Promise((resolve) => socket.close(resolve));
    server = spawn(path.join(bin, "mysqld.exe"), ["--no-defaults", `--basedir=${path.dirname(bin)}`, `--datadir=${directory}`, `--port=${port}`, "--bind-address=127.0.0.1", "--mysqlx=0", "--skip-log-bin", "--default-time-zone=+00:00", "--innodb-buffer-pool-size=64M", "--innodb-redo-log-capacity=32M", "--innodb-flush-log-at-trx-commit=2", "--console"], { cwd: os.tmpdir(), windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
    server.on("error", (error) => { serverLog += error.message; }); server.stderr.on("data", (chunk) => { serverLog += chunk; });
    const args = ["--no-defaults", "--protocol=TCP", "--host=127.0.0.1", `--port=${port}`, "--user=root", "--connect-timeout=1", "--default-character-set=utf8mb4", "--batch", "--raw", "--skip-column-names"];
    query = async (sql, database, expectedError) => {
      const result = await processResult(path.join(bin, "mysql.exe"), [...args, ...(database ? [database] : [])], sql);
      if (expectedError) { assert.notEqual(result.code, 0, "Expected SQL to fail"); assert.match(result.stderr, expectedError); }
      else assert.equal(result.code, 0, result.stderr);
      return result.stdout.trim();
    };
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      const result = await processResult(path.join(bin, "mysql.exe"), args, "SELECT 1;", 3000).catch(() => ({ code: 1 }));
      if (result.code === 0) { ready = true; break; }
      if (server.exitCode != null) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(ready, serverLog.slice(-3000));
    assert.equal(path.resolve(await query("SELECT @@datadir;")), path.resolve(directory), "Connected server is not the temporary instance");
    ownsServer = true;
    console.log(`Temporary MySQL ${await query("SELECT VERSION();")} ready.`);
    const { schema, upgrade, viewingUpgrade, cleanupUpgrade } = require("../scripts/build-database.cjs").build();
    await query(schema.replaceAll("room_rental_v5_20261023", "rr_v5_fresh_test"));
    assert.equal(await query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE';", "rr_v5_fresh_test"), "41");
    if (process.argv.includes("--probe")) console.log("Fresh schema import passed (41 tables).");
    else await runTests(query, { schema, upgrade, viewingUpgrade, cleanupUpgrade });
  } catch (error) {
    error.message += `\nTemporary server log:\n${serverLog.slice(-4000)}`; throw error;
  } finally {
    if (query && ownsServer && server?.exitCode == null) {
      try { await query("SHUTDOWN;"); } catch { server.kill(); }
    }
    if (server && !ownsServer && server.exitCode == null) server.kill();
    if (server && server.exitCode == null) await new Promise((resolve) => { server.once("close", resolve); setTimeout(() => { server.kill(); resolve(); }, 5000).unref(); });
    const absolute = path.resolve(directory);
    // Only remove the unique test directory created above, after the temporary server stops.
    if (path.dirname(absolute) === path.resolve(os.tmpdir()) && path.basename(absolute).startsWith("troday-mysql-")) fs.rmSync(absolute, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

async function runTests(query, { schema, upgrade, viewingUpgrade, cleanupUpgrade }) {
  const fixture = fs.readFileSync(path.join(root, "tests", "fixtures", "workflow-data.sql"), "utf8");
  const original = fs.readFileSync(path.join(root, "tests", "fixtures", "v5-original-schema.sql"), "utf8");
  const sharingUpgrade = fs.readFileSync(path.join(root, "database", "migrations", "20261025_chat_post_sharing.sql"), "utf8");
  let checks = 0;
  const check = async (label, body) => { await body(); checks++; console.log(`PASS ${checks}: ${label}`); };
  const setup = async (name, old = false) => {
    await query((old ? original : schema).replaceAll("room_rental_v5_20261023", name));
    await query(fixture, name); return name;
  };
  const core = "rr_v5_fresh_test";
  await query(fixture, core);
  let winner;
  await check("capacity counts all residents and serializes two competing approvals", async () => {
    const results = await Promise.allSettled([query("CALL sp_approve_occupant_join(200,1);", core), query("CALL sp_approve_occupant_join(201,1);", core)]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    const failure = results.find((r) => r.status === "rejected"); assert.match(failure.reason.message, /No unreserved room capacity/);
    assert.equal(await query("SELECT active_count,planned_count,held_count FROM v5_room_capacity_usage WHERE room_id=1;", core), "2\t0\t1");
    winner = Number(await query("SELECT id FROM occupant_join_requests WHERE status='APPROVED';", core));
  });
  await check("decreasing capacity and marking an occupied room available are rejected", async () => {
    await query("CALL sp_set_room_capacity(1,2,1);", core, /Capacity cannot/);
    await query("UPDATE rooms SET max_occupants=2 WHERE id=1;", core, /capacity cannot/);
    await query("UPDATE rooms SET status='AVAILABLE' WHERE id=1;", core, /cannot be marked available/);
    await query("CALL sp_set_room_capacity(1,4,NULL);", core, /Invalid room owner/);
  });
  await check("an expired approval cannot complete even before the expiry worker runs", async () => {
    const shifted = await query("SET timestamp=UNIX_TIMESTAMP()+172801; SELECT UNIX_TIMESTAMP(UTC_TIMESTAMP()) > UNIX_TIMESTAMP()-1;", core);
    assert.equal(shifted, "1");
    await query(`SET timestamp=UNIX_TIMESTAMP()+172801; CALL sp_complete_occupant_join(${winner},1);`, core, /not currently eligible/);
  });
  await check("join completion links both rows and cannot duplicate a stay", async () => {
    await query(`CALL sp_complete_occupant_join(${winner},1);`, core);
    assert.equal(await query(`SELECT COUNT(*) FROM occupant_join_requests j JOIN room_tenants rt ON rt.id=j.completed_room_tenant_id AND rt.join_request_id=j.id WHERE j.id=${winner} AND j.status='COMPLETED' AND rt.status='ACTIVE';`, core), "1");
    await query(`CALL sp_complete_occupant_join(${winner},1);`, core, /not currently eligible/);
  });
  const activation = await query("SELECT activated_at FROM contracts WHERE id=1;", core);
  await check("later-arriving Ngoc can receive representation on the same imported contract", async () => {
    await query("CALL sp_handover_representative(1,10,11,1,'Mai leaves; Ngoc accepts',TRUE);", core);
    assert.equal(await query("SELECT status,representative_room_tenant_id,initial_representative_room_tenant_id FROM contracts WHERE id=1;", core), "ACTIVE\t11\t10");
    assert.equal(await query("SELECT activated_at FROM contracts WHERE id=1;", core), activation);
    assert.equal(await query("SELECT COUNT(*) FROM v5_current_residents WHERE contract_id=1;", core), "2");
    assert.equal(await query("SELECT status FROM rooms WHERE id=1;", core), "OCCUPIED");
    assert.equal(await query("SELECT status FROM room_tenants WHERE id=10;", core), "LEFT");
  });
  await check("handover preserves bills and signed versions while cancelling old open consents", async () => {
    assert.equal(await query("SELECT payer_room_tenant_id,status FROM invoices WHERE id=500;", core), "10\tUNPAID");
    assert.equal(await query("SELECT content,representative_room_tenant_id FROM contract_revisions WHERE id=100;", core), "Original signed paper\t10");
    assert.equal(await query(`SELECT status FROM occupant_join_requests WHERE id=${winner === 200 ? 201 : 200};`, core), "CANCELLED");
    assert.equal(await query("SELECT status FROM contract_change_requests WHERE id=300;", core), "CANCELLED");
    assert.equal(await query("SELECT COUNT(*) FROM notifications WHERE type='REPRESENTATIVE_CHANGED';", core), "2");
  });
  await check("history is contiguous, unique, immutable and replay resistant", async () => {
    assert.equal(await query("SELECT COUNT(*) FROM contract_representative_history WHERE contract_id=1;", core), "2");
    assert.equal(await query("SELECT COUNT(*) FROM contract_representative_history a JOIN contract_representative_history b ON b.previous_history_id=a.id AND b.started_at=a.ended_at WHERE a.contract_id=1;", core), "1");
    await query("CALL sp_handover_representative(1,10,11,1,'Repeat',TRUE);", core, /Invalid actor/);
    await query("UPDATE contract_representative_history SET name_snapshot='Rewrite' WHERE contract_id=1;", core, /history is immutable/);
    await query("DELETE FROM contract_representative_history WHERE contract_id=1;", core, /cannot be deleted/);
  });
  await check("a draft reserves its room and a second open contract is rejected", async () => {
    await query("INSERT INTO contracts(contract_number,room_id,house_id,landlord_id,paper_document_file_id,source,status,start_date,end_date) VALUES('DRAFT-A',2,1,1,1,'PAPER_IMPORT','DRAFT',CURRENT_DATE(),CURRENT_DATE()+INTERVAL 1 YEAR);", core);
    await query("INSERT INTO contracts(contract_number,room_id,house_id,landlord_id,paper_document_file_id,source,status,start_date,end_date) VALUES('DRAFT-B',2,1,1,1,'PAPER_IMPORT','DRAFT',CURRENT_DATE(),CURRENT_DATE()+INTERVAL 1 YEAR);", core, /already has an open contract/);
    await query("SELECT id INTO @draft FROM contracts WHERE contract_number='DRAFT-A'; CALL sp_cancel_contract(@draft,1,'Draft abandoned');", core);
  });
  await check("public routines never commit or roll back the caller's existing transaction", async () => {
    await query(`DELIMITER $$
CREATE PROCEDURE fixture_nested_transaction()
BEGIN
  DECLARE caught BOOLEAN DEFAULT FALSE;
  START TRANSACTION;
  UPDATE users SET full_name='Uncommitted owner' WHERE id=1;
  BEGIN DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET caught=TRUE; CALL sp_set_room_capacity(1,4,1); END;
  IF NOT caught OR (SELECT full_name FROM users WHERE id=1)<>'Uncommitted owner' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Caller transaction was lost'; END IF;
  ROLLBACK;
END$$
CALL fixture_nested_transaction()$$
DROP PROCEDURE fixture_nested_transaction$$
DELIMITER ;`, core);
    assert.equal(await query("SELECT full_name FROM users WHERE id=1;", core), "Owner");
  });

  const arrival = await setup("rr_v5_arrival_test");
  let contractId, repId, extraId;
  await check("initial overcapacity rolls back the entire contract creation", async () => {
    await query("CALL sp_create_rental_contract(400,1,'OVER',DATE(UTC_TIMESTAMP()+INTERVAL 7 HOUR),DATE(UTC_TIMESTAMP()+INTERVAL 7 HOUR)+INTERVAL 1 YEAR,4000000,4000000,'Terms',NULL,JSON_ARRAY(JSON_OBJECT('full_name','A'),JSON_OBJECT('full_name','B')),@new);", arrival, /exceed room capacity/);
    assert.equal(await query("SELECT COUNT(*) FROM contracts;", arrival), "1");
  });
  await check("group contract can confirm representative first and the other member later", async () => {
    contractId = Number(await query("CALL sp_create_rental_contract(400,1,'GROUP',DATE(UTC_TIMESTAMP()+INTERVAL 7 HOUR),DATE(UTC_TIMESTAMP()+INTERVAL 7 HOUR)+INTERVAL 1 YEAR,4000000,4000000,'Agreed terms',NULL,JSON_ARRAY(JSON_OBJECT('full_name','Extra','tenant_id',6)),@new); SELECT @new;", arrival));
    repId = Number(await query(`SELECT representative_room_tenant_id FROM contracts WHERE id=${contractId};`, arrival));
    extraId = Number(await query(`SELECT id FROM room_tenants WHERE contract_id=${contractId} AND id<>${repId};`, arrival));
    await query(`CALL sp_confirm_contract(${contractId},5);`, arrival);
    await query(`CALL sp_confirm_move_in(${contractId},JSON_ARRAY(${extraId}),DATE(UTC_TIMESTAMP()+INTERVAL 7 HOUR),1);`, arrival, /Select the representative/);
    await query(`CALL sp_confirm_move_in(${contractId},JSON_ARRAY(${repId},${repId}),DATE(UTC_TIMESTAMP()+INTERVAL 7 HOUR),1);`, arrival, /distinct planned/);
    await query(`CALL sp_confirm_move_in(${contractId},JSON_ARRAY(${repId}),DATE(UTC_TIMESTAMP()+INTERVAL 7 HOUR),1);`, arrival);
    assert.equal(await query(`SELECT status FROM room_tenants WHERE id=${extraId};`, arrival), "PLANNED");
    await query(`CALL sp_confirm_move_in(${contractId},JSON_ARRAY(${extraId}),DATE(UTC_TIMESTAMP()+INTERVAL 7 HOUR),1);`, arrival);
    assert.equal(await query(`SELECT COUNT(*) FROM room_tenants WHERE contract_id=${contractId} AND status='ACTIVE';`, arrival), "2");
  });
  await check("handover on a NEW_RENTAL preserves original viewing and initial representative", async () => {
    await query(`CALL sp_handover_representative(${contractId},${repId},${extraId},1,'Extra takes over',FALSE);`, arrival, /recorded consent/);
    await query(`CALL sp_handover_representative(${contractId},${repId},11,1,'Wrong contract',TRUE);`, arrival, /another active resident/);
    await query(`CALL sp_handover_representative(${contractId},${repId},${extraId},1,'Extra takes over',TRUE);`, arrival);
    assert.equal(await query(`SELECT viewing_tenant_id,initial_representative_room_tenant_id,representative_room_tenant_id FROM contracts WHERE id=${contractId};`, arrival), `5\t${repId}\t${extraId}`);
    await query("CALL sp_set_viewing_outcome(400,5,'WITHDRAW',NULL);", arrival, /Cancel or close/);
  });
  await check("last departure closes the representative tenure and then allows withdrawal", async () => {
    await query(`CALL sp_move_out(${contractId},${extraId},DATE(UTC_TIMESTAMP()+INTERVAL 7 HOUR),1);`, arrival);
    assert.equal(await query(`SELECT status FROM contracts WHERE id=${contractId};`, arrival), "TERMINATED");
    assert.equal(await query(`SELECT COUNT(*) FROM contract_representative_history WHERE contract_id=${contractId} AND is_current=TRUE;`, arrival), "0");
    await query("CALL sp_set_viewing_outcome(400,5,'WITHDRAW',NULL);", arrival);
    assert.equal(await query("SELECT rental_decision FROM room_viewing_requests WHERE id=400;", arrival), "WITHDRAWN");
  });

  const small = await setup("rr_v5_small_test");
  const prepareTransfer = async (database, target) => query(`UPDATE contract_change_requests SET type='TRANSFER',target_room_id=${target},proposal_snapshot=JSON_OBJECT('content','Agreed target-room terms','end_date',DATE(UTC_TIMESTAMP()+INTERVAL 7 HOUR)+INTERVAL 1 YEAR) WHERE id=300;`, database);
  await check("transfer to a small room changes nothing", async () => {
    await prepareTransfer(small, 3);
    await query("CALL sp_apply_contract_change(300,1,@next);", small, /enough capacity/);
    assert.equal(await query("SELECT status FROM contracts WHERE id=1;", small), "ACTIVE");
    assert.equal(await query("SELECT COUNT(*) FROM contracts;", small), "1");
    assert.equal(await query("SELECT status FROM contract_change_requests WHERE id=300;", small), "READY_TO_APPLY");
  });
  await check("transfer carries every open member and records source departures", async () => {
    await query("INSERT INTO room_tenants(contract_id,room_id,full_name,status,intake_source,planned_move_in_date) VALUES(1,1,'Planned person','PLANNED','INITIAL_CONTRACT',DATE(UTC_TIMESTAMP()+INTERVAL 7 HOUR));", small);
    await prepareTransfer(small, 2);
    const next = Number(await query("CALL sp_apply_contract_change(300,1,@next); SELECT @next;", small));
    assert.equal(await query(`SELECT COUNT(*) FROM room_tenants WHERE contract_id=${next} AND status='PLANNED' AND move_in_date IS NULL AND move_out_date IS NULL;`, small), "3");
    assert.equal(await query("SELECT COUNT(*) FROM room_tenants WHERE contract_id=1 AND status='LEFT' AND move_out_date IS NOT NULL AND move_out_confirmed_by_id=1;", small), "2");
    assert.equal(await query("SELECT COUNT(*) FROM room_tenants WHERE contract_id=1 AND status='CANCELLED';", small), "1");
    assert.equal(await query(`SELECT previous_contract_id,status FROM contracts WHERE id=${next};`, small), "1\tCONFIRMED");
    assert.equal(await query("SELECT status FROM contract_change_requests WHERE id=300;", small), "COMPLETED");
    await query(`SELECT JSON_ARRAYAGG(id) INTO @members FROM room_tenants WHERE contract_id=${next}; CALL sp_confirm_move_in(${next},@members,DATE(UTC_TIMESTAMP()+INTERVAL 7 HOUR),1);`, small);
    assert.equal(await query(`SELECT COUNT(*) FROM v5_current_residents WHERE contract_id=${next};`, small), "3");
  });
  const ending = await setup("rr_v5_end_test");
  await check("termination records every departure and cancels approved holds", async () => {
    await query("CALL sp_approve_occupant_join(200,1); CALL sp_apply_contract_change(300,1,@result);", ending);
    assert.equal(await query("SELECT COUNT(*) FROM room_tenants WHERE contract_id=1 AND status='LEFT' AND move_out_date IS NOT NULL;", ending), "2");
    assert.equal(await query("SELECT status FROM occupant_join_requests WHERE id=200;", ending), "CANCELLED");
    assert.equal(await query("SELECT status FROM rooms WHERE id=1;", ending), "AVAILABLE");
    await query("CALL sp_complete_occupant_join(200,1);", ending, /not currently eligible/);
    await query("INSERT INTO room_tenants(contract_id,room_id,full_name,status,intake_source,planned_move_in_date) VALUES(1,1,'Wrong','PLANNED','INITIAL_CONTRACT',CURRENT_DATE());", ending, /closed contract/);
  });

  const calendar = await setup("rr_v5_calendar_test");
  let viewing;
  await check("viewings reject past/overlap, allow adjacent intervals and free cancelled slots", async () => {
    await query("CALL sp_schedule_viewing(2,5,6,1,UTC_TIMESTAMP()-INTERVAL 1 MINUTE,30,NULL,@id);", calendar, /future UTC/);
    viewing = Number(await query("CALL sp_schedule_viewing(2,5,6,1,UTC_TIMESTAMP()+INTERVAL 1 DAY,30,NULL,@id); SELECT @id;", calendar));
    await query(`SELECT starts_at INTO @start FROM room_viewing_requests WHERE id=${viewing}; CALL sp_schedule_viewing(2,5,6,1,@start+INTERVAL 15 MINUTE,60,NULL,@id);`, calendar, /overlaps/);
    await query(`SELECT ends_at INTO @end FROM room_viewing_requests WHERE id=${viewing}; CALL sp_schedule_viewing(2,5,6,1,@end,30,NULL,@id);`, calendar);
    await query(`CALL sp_set_viewing_outcome(${viewing},6,'CANCEL','Change of plan'); SELECT starts_at INTO @start FROM room_viewing_requests WHERE id=${viewing}; CALL sp_schedule_viewing(2,5,6,1,@start,30,NULL,@id);`, calendar);
  });
  await check("attendance and no-show respect the actual UTC interval", async () => {
    const next = Number(await query("SELECT MAX(id) FROM room_viewing_requests;", calendar));
    await query(`CALL sp_set_viewing_outcome(${next},1,'ATTENDED',NULL);`, calendar, /cannot precede/);
    await query(`CALL sp_set_viewing_outcome(${next},1,'NO_SHOW',NULL);`, calendar, /after the appointment/);
    await query(`SET timestamp=UNIX_TIMESTAMP()+172800; CALL sp_set_viewing_outcome(${next},1,'NO_SHOW',NULL);`, calendar);
    assert.equal(await query(`SELECT status FROM room_viewing_requests WHERE id=${next};`, calendar), "NO_SHOW");
  });

  const upgraded = await setup("rr_v5_upgrade_test", true);
  await check("upgrade preserves old business rows and records an honest legacy baseline", async () => {
    await query(upgrade.replaceAll("room_rental_v5_20261023", upgraded));
    await query("INSERT INTO chat_messages(id,conversation_id,sender_id,client_message_key,content,sent_at) VALUES(7000,1,1,UUID(),'Existing conversation',UTC_TIMESTAMP(6));", upgraded);
    await query(sharingUpgrade.replaceAll("room_rental_v5_20261023", upgraded));
    await query(viewingUpgrade.replaceAll("room_rental_v5_20261023", upgraded));
    await query(cleanupUpgrade.replaceAll("room_rental_v5_20261023", upgraded));
    assert.equal(await query("SELECT content,shared_post_id FROM chat_messages WHERE id=7000;", upgraded), "Existing conversation\tNULL");
    assert.equal(await query("SELECT event_type,started_at,consent_method,is_current FROM contract_representative_history;", upgraded), "LEGACY_BASELINE\tNULL\tLEGACY_UNKNOWN\t1");
    assert.equal(await query("SELECT COUNT(*) FROM invoices;", upgraded), "1");
    await query("CALL sp_handover_representative(1,10,11,1,'Migrated handover',TRUE);", upgraded);
    assert.equal(await query("SELECT representative_room_tenant_id,initial_representative_room_tenant_id FROM contracts WHERE id=1;", upgraded), "11\t10");
  });
  await check("fresh and upgraded schemas have equivalent columns and foreign keys", async () => {
    const columns = (database) => query("SELECT table_name,column_name,column_type,is_nullable,COALESCE(column_default,'<NULL>'),extra,generation_expression FROM information_schema.columns WHERE table_schema=DATABASE() ORDER BY table_name,column_name;", database);
    assert.equal(await columns(core), await columns(upgraded));
    const keys = (database) => query("SELECT table_name,constraint_name,referenced_table_name,delete_rule,update_rule FROM information_schema.referential_constraints WHERE constraint_schema=DATABASE() ORDER BY table_name,constraint_name;", database);
    assert.equal(await keys(core), await keys(upgraded));
    const creationRoutine = (database) => query("SELECT routine_definition,routine_comment FROM information_schema.routines WHERE routine_schema=DATABASE() AND routine_name='sp_create_rental_contract';", database);
    assert.equal(await creationRoutine(core), await creationRoutine(upgraded));
    await query(upgrade.replaceAll("room_rental_v5_20261023", upgraded), undefined, /already applied or incomplete/);
  });
  const invalid = await setup("rr_v5_invalid_upgrade_test", true);
  await check("unsafe legacy occupancy is rejected before migration DDL", async () => {
    await query("UPDATE rooms SET max_occupants=1 WHERE id=1;", invalid);
    await query(upgrade.replaceAll("room_rental_v5_20261023", invalid), undefined, /Preflight: reconcile room overcapacity/);
    assert.equal(await query("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND column_name='initial_representative_room_tenant_id';", invalid), "0");
    assert.equal(await query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='contract_representative_history';", invalid), "0");
  });
  await check("legacy duplicate drafts are rejected before adding the stronger unique key", async () => {
    await query("UPDATE rooms SET max_occupants=3 WHERE id=1; INSERT INTO contracts(contract_number,room_id,house_id,landlord_id,paper_document_file_id,source,status,start_date,end_date) VALUES('OLD-DRAFT-A',2,1,1,1,'PAPER_IMPORT','DRAFT',CURRENT_DATE(),CURRENT_DATE()+INTERVAL 1 YEAR),('OLD-DRAFT-B',2,1,1,1,'PAPER_IMPORT','DRAFT',CURRENT_DATE(),CURRENT_DATE()+INTERVAL 1 YEAR);", invalid);
    await query(upgrade.replaceAll("room_rental_v5_20261023", invalid), undefined, /multiple open contracts/);
    assert.equal(await query("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND column_name='initial_representative_room_tenant_id';", invalid), "0");
  });
  await check("shared posts persist in roommate chats on fresh and upgraded schemas", async () => {
    for (const database of [core, upgraded]) {
      await query("INSERT INTO roommate_requests(id,sender_id,receiver_id,scenario,status,responded_at) VALUES(700,2,3,'SEARCH_TOGETHER','ACCEPTED',UTC_TIMESTAMP(6)); INSERT INTO conversations(id,type,roommate_request_id) VALUES(700,'ROOMMATE',700); INSERT INTO conversation_participants(conversation_id,user_id,joined_at) VALUES(700,2,UTC_TIMESTAMP(6)),(700,3,UTC_TIMESTAMP(6)); INSERT INTO chat_messages(id,conversation_id,sender_id,client_message_key,message_type,shared_post_id,sent_at) VALUES(7001,700,2,UUID(),'POST_SHARE',1,UTC_TIMESTAMP(6));", database);
      assert.equal(await query("SELECT m.message_type,m.shared_post_id,p.room_id,c.type FROM chat_messages m JOIN posts p ON p.id=m.shared_post_id JOIN conversations c ON c.id=m.conversation_id WHERE m.id=7001;", database), "POST_SHARE\t1\t4\tROOMMATE");
    }
  });
  await check("shared messages require an existing post and a matching message type", async () => {
    await query("INSERT INTO chat_messages(conversation_id,sender_id,client_message_key,message_type,shared_post_id,sent_at) VALUES(700,2,UUID(),'POST_SHARE',999999,UTC_TIMESTAMP(6));", core, /fk_messages_shared_post/);
    await query("INSERT INTO chat_messages(conversation_id,sender_id,client_message_key,message_type,sent_at) VALUES(700,2,UUID(),'POST_SHARE',UTC_TIMESTAMP(6));", core, /ck_chat_messages_post_share/);
    await query("INSERT INTO chat_messages(conversation_id,sender_id,client_message_key,content,shared_post_id,sent_at) VALUES(700,2,UUID(),'Hello',1,UTC_TIMESTAMP(6));", core, /ck_chat_messages_post_share/);
  });
  await check("shared messages preserve participant and idempotency constraints", async () => {
    await query("INSERT INTO chat_messages(conversation_id,sender_id,client_message_key,message_type,shared_post_id,sent_at) VALUES(700,5,UUID(),'POST_SHARE',1,UTC_TIMESTAMP(6));", core, /fk_messages_participant/);
    await query("INSERT INTO chat_messages(conversation_id,sender_id,client_message_key,message_type,shared_post_id,sent_at) SELECT conversation_id,sender_id,client_message_key,message_type,shared_post_id,sent_at FROM chat_messages WHERE id=7001;", core, /uq_message_client_key/);
  });
  await check("chat sharing migration rejects wrong order and repeated application", async () => {
    await query(sharingUpgrade.replaceAll("room_rental_v5_20261023", invalid), undefined, /workflow migration before chat sharing/);
    await query(sharingUpgrade.replaceAll("room_rental_v5_20261023", upgraded), undefined, /already applied or incomplete/);
    assert.equal(await query("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='chat_messages' AND column_name='shared_post_id';", invalid), "0");
  });
  const proposals = await setup("rr_v5_proposals_test");
  const key = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const request = async (n, conversation = 2, room = 5, actor = 6, hours = 24) => Number(await query(`CALL sp_request_viewing(${conversation},${room},${actor},TIMESTAMP(DATE(UTC_TIMESTAMP())+INTERVAL 7 DAY)+INTERVAL ${hours} HOUR,60,'Meet at gate','${key(n)}',@p); SELECT @p;`, proposals));
  let first, second, official;
  await check("tenant proposals preserve confirmed schedules, enforce context and deduplicate retries", async () => {
    first = await request(1);
    assert.equal(await request(1), first);
    assert.equal(await query("SELECT COUNT(*) FROM room_viewing_requests;", proposals), "1");
    assert.equal(await query("SELECT status,scheduled_viewing_id FROM room_viewing_proposals;", proposals), "PENDING\tNULL");
    assert.equal(await query("SELECT status FROM rooms WHERE id=5;", proposals), "AVAILABLE");
    await query(`CALL sp_request_viewing(2,5,6,UTC_TIMESTAMP()+INTERVAL 10 DAY,60,'Changed','${key(1)}',@p);`, proposals, /different content/);
    await query(`CALL sp_request_viewing(2,5,6,UTC_TIMESTAMP()+INTERVAL 10 DAY,60,NULL,'${key(2)}',@p);`, proposals, /uq_proposal_pending/);
    await query(`CALL sp_request_viewing(1,5,6,UTC_TIMESTAMP()+INTERVAL 10 DAY,60,NULL,'${key(3)}',@p);`, proposals, /correct published room conversation/);
    await query(`CALL sp_request_viewing(2,5,1,UTC_TIMESTAMP()+INTERVAL 10 DAY,60,NULL,'${key(4)}',@p);`, proposals, /active viewing participants/);
    assert.equal(await query("SELECT COUNT(*) FROM notifications WHERE type='VIEWING_PROPOSED';", proposals), "1");
  });
  await check("pending requests do not reserve a slot; competing approvals create only one official schedule", async () => {
    await query("INSERT INTO conversations(id,type,room_id,post_id) VALUES(703,'ROOM_INQUIRY',5,2); INSERT INTO conversation_participants(conversation_id,user_id,joined_at) VALUES(703,1,UTC_TIMESTAMP(6)),(703,5,UTC_TIMESTAMP(6));", proposals);
    second = await request(5,703,5,5);
    const results = await Promise.allSettled([query(`CALL sp_review_viewing_proposal(${first},1,'ACCEPT',NULL,@v);`, proposals), query(`CALL sp_review_viewing_proposal(${second},1,'ACCEPT',NULL,@v);`, proposals)]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.match(results.find((r) => r.status === "rejected").reason.message, /overlaps/);
    assert.equal(await query("SELECT COUNT(*) FROM room_viewing_requests WHERE room_id=5;", proposals), "1");
    assert.equal(await query("SELECT COUNT(*) FROM room_viewing_proposals WHERE status='ACCEPTED';", proposals), "1");
    assert.equal(await query("SELECT COUNT(*) FROM room_viewing_proposals WHERE status='PENDING';", proposals), "1");
    official = Number(await query("SELECT scheduled_viewing_id FROM room_viewing_proposals WHERE status='ACCEPTED';", proposals));
  });
  await check("acceptance retries reuse the linked schedule even after cancellation, without duplicate notifications", async () => {
    const accepted = Number(await query("SELECT id FROM room_viewing_proposals WHERE status='ACCEPTED';", proposals));
    assert.equal(await query(`CALL sp_review_viewing_proposal(${accepted},1,'ACCEPT',NULL,@v); SELECT @v;`, proposals), String(official));
    await query(`CALL sp_set_viewing_outcome(${official},1,'CANCEL','Change of plan'); CALL sp_review_viewing_proposal(${accepted},1,'ACCEPT',NULL,@v);`, proposals);
    assert.equal(await query(`SELECT status,created_by_id FROM room_viewing_requests WHERE id=${official};`, proposals), "CANCELLED\t1");
    assert.equal(await query("SELECT COUNT(*) FROM notifications WHERE type='VIEWING_ACCEPT';", proposals), "1");
  });
  await check("only the owner reviews; only the requester withdraws; rejection and withdrawal retain history", async () => {
    const pending = Number(await query("SELECT id FROM room_viewing_proposals WHERE status='PENDING';", proposals));
    await query(`CALL sp_review_viewing_proposal(${pending},6,'ACCEPT',NULL,@v);`, proposals, /Only the active room owner/);
    await query(`CALL sp_review_viewing_proposal(${pending},1,'REJECT',' ',@v);`, proposals, /requires a reason/);
    await query(`CALL sp_withdraw_viewing_proposal(${pending},1);`, proposals, /Only the requesting tenant/);
    await query(`CALL sp_review_viewing_proposal(${pending},1,'REJECT','Please choose another time',@v);`, proposals);
    assert.equal(await query(`SELECT status,rejection_reason FROM room_viewing_proposals WHERE id=${pending};`, proposals), "REJECTED\tPlease choose another time");
    await query(`CALL sp_review_viewing_proposal(${pending},1,'ACCEPT',NULL,@v);`, proposals, /not pending/);
    const withdrawn = await request(6,2,5,6,26);
    await query(`CALL sp_withdraw_viewing_proposal(${withdrawn},6); CALL sp_withdraw_viewing_proposal(${withdrawn},6);`, proposals);
    assert.equal(await query(`SELECT status,withdrawn_by_id FROM room_viewing_proposals WHERE id=${withdrawn};`, proposals), "WITHDRAWN\t6");
    await query(`UPDATE room_viewing_proposals SET notes='Rewrite' WHERE id=${withdrawn};`, proposals, /immutable/);
    await query(`DELETE FROM room_viewing_proposals WHERE id=${withdrawn};`, proposals, /cannot be deleted/);
  });
  await check("approval rechecks room and publication changes without partial schedule creation", async () => {
    const pending = await request(7,2,5,6,28);
    const count = await query("SELECT COUNT(*) FROM room_viewing_requests;", proposals);
    await query("UPDATE rooms SET status='MAINTENANCE' WHERE id=5;", proposals);
    await query(`CALL sp_review_viewing_proposal(${pending},1,'ACCEPT',NULL,@v);`, proposals, /occupied or reserved/);
    await query("UPDATE rooms SET status='AVAILABLE' WHERE id=5; UPDATE posts SET status='HIDDEN' WHERE id=2;", proposals);
    await query(`CALL sp_review_viewing_proposal(${pending},1,'ACCEPT',NULL,@v);`, proposals, /correct published room conversation/);
    await query("UPDATE posts SET status='APPROVED' WHERE id=2; UPDATE users SET status='LOCKED' WHERE id=6;", proposals);
    await query(`CALL sp_review_viewing_proposal(${pending},1,'ACCEPT',NULL,@v);`, proposals, /active viewing participants/);
    await query("UPDATE users SET status='ACTIVE' WHERE id=6;", proposals);
    assert.equal(await query("SELECT COUNT(*) FROM room_viewing_requests;", proposals), count);
    assert.equal(await query(`SELECT status,scheduled_viewing_id FROM room_viewing_proposals WHERE id=${pending};`, proposals), "PENDING\tNULL");
  });
  await check("past pending requests cannot be accepted or withdrawn before expiry cleanup runs", async () => {
    const pending = Number(await query("SELECT id FROM room_viewing_proposals WHERE status='PENDING';", proposals));
    await query(`SET timestamp=UNIX_TIMESTAMP()+1728000; CALL sp_review_viewing_proposal(${pending},1,'ACCEPT',NULL,@v);`, proposals, /has expired/);
    await query(`SET timestamp=UNIX_TIMESTAMP()+1728000; CALL sp_withdraw_viewing_proposal(${pending},6);`, proposals, /has expired/);
    await query("SET timestamp=UNIX_TIMESTAMP()+1728000; CALL sp_expire_viewing_proposals();", proposals);
    assert.equal(await query(`SELECT status,expired_at IS NOT NULL FROM room_viewing_proposals WHERE id=${pending};`, proposals), "EXPIRED\t1");
  });
  await check("direct owner scheduling remains available after tenant messages in the exact room chat", async () => {
    await query("CALL sp_schedule_viewing(703,5,5,1,UTC_TIMESTAMP()+INTERVAL 4 DAY,30,NULL,@v);", proposals, /Exchange messages/);
    await query("INSERT INTO chat_messages(conversation_id,sender_id,client_message_key,message_type,content,sent_at) VALUES(703,5,UUID(),'TEXT','We agreed this time',UTC_TIMESTAMP(6)); CALL sp_schedule_viewing(703,5,5,1,UTC_TIMESTAMP()+INTERVAL 4 DAY,30,'Owner created',@v);", proposals);
    assert.equal(await query("SELECT created_by_id,status FROM room_viewing_requests WHERE notes='Owner created';", proposals), "1\tSCHEDULED");
  });
  await check("new public routines preserve the caller transaction and migration order is enforced", async () => {
    await query(`DELIMITER $$
CREATE PROCEDURE fixture_nested_proposal()
BEGIN
  DECLARE caught BOOLEAN DEFAULT FALSE;
  START TRANSACTION;
  UPDATE users SET full_name='Uncommitted proposal owner' WHERE id=1;
  BEGIN DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET caught=TRUE; CALL sp_request_viewing(2,5,6,UTC_TIMESTAMP()+INTERVAL 10 DAY,30,NULL,UUID(),@p); END;
  IF NOT caught OR (SELECT full_name FROM users WHERE id=1)<>'Uncommitted proposal owner' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Caller transaction was lost'; END IF;
  ROLLBACK;
END$$
CALL fixture_nested_proposal()$$
DROP PROCEDURE fixture_nested_proposal$$
DELIMITER ;`, proposals);
    assert.equal(await query("SELECT full_name FROM users WHERE id=1;", proposals), "Owner");
    await query(viewingUpgrade.replaceAll("room_rental_v5_20261023", invalid), undefined, /workflow and chat sharing migrations before/);
    await query(viewingUpgrade.replaceAll("room_rental_v5_20261023", upgraded), undefined, /already applied or incomplete/);
  });
  const cleanup = await setup("rr_v5_cleanup_test");
  let upcoming, accepted, pending, expired, unaffected, createdContract;
  const createContract = (number) => query(`CALL sp_create_rental_contract(400,1,'${number}',DATE(UTC_TIMESTAMP()+INTERVAL 7 HOUR),DATE(UTC_TIMESTAMP()+INTERVAL 7 HOUR)+INTERVAL 1 YEAR,4000000,4000000,'Agreed terms',NULL,JSON_ARRAY(),@contract); SELECT @contract;`, cleanup);
  await check("rental interest leaves other appointments and pending proposals open", async () => {
    await query("INSERT INTO conversations(id,type,room_id,post_id) VALUES(703,'ROOM_INQUIRY',4,1),(704,'ROOM_INQUIRY',4,1),(705,'ROOM_INQUIRY',4,1); INSERT INTO conversation_participants(conversation_id,user_id,joined_at) VALUES(703,1,UTC_TIMESTAMP(6)),(703,6,UTC_TIMESTAMP(6)),(704,1,UTC_TIMESTAMP(6)),(704,4,UTC_TIMESTAMP(6)),(705,1,UTC_TIMESTAMP(6)),(705,2,UTC_TIMESTAMP(6));", cleanup);
    accepted = Number(await query("CALL sp_request_viewing(703,4,6,UTC_TIMESTAMP()+INTERVAL 2 DAY,30,'Accepted proposal',UUID(),@p); SELECT @p;", cleanup));
    upcoming = Number(await query(`CALL sp_review_viewing_proposal(${accepted},1,'ACCEPT',NULL,@v); SELECT @v;`, cleanup));
    pending = Number(await query("CALL sp_request_viewing(704,4,4,UTC_TIMESTAMP()+INTERVAL 3 DAY,30,'Pending proposal',UUID(),@p); SELECT @p;", cleanup));
    expired = Number(await query("SET timestamp=UNIX_TIMESTAMP()-172800; CALL sp_request_viewing(705,4,2,UTC_TIMESTAMP()+INTERVAL 1 DAY,30,'Elapsed proposal',UUID(),@p); SELECT @p;", cleanup));
    unaffected = Number(await query("CALL sp_schedule_viewing(2,5,6,1,UTC_TIMESTAMP()+INTERVAL 2 DAY,30,'Other room',@v); SELECT @v;", cleanup));
    await query("INSERT INTO room_viewing_requests(id,room_id,house_id,conversation_id,tenant_id,created_by_id,starts_at,ends_at,status,attendance_confirmed_by_id,attendance_confirmed_at) SELECT 399,room_id,house_id,conversation_id,tenant_id,created_by_id,starts_at,ends_at,'COMPLETED',attendance_confirmed_by_id,attendance_confirmed_at FROM room_viewing_requests WHERE id=400; CALL sp_set_viewing_outcome(399,5,'AGREE',NULL);", cleanup);
    assert.equal(await query(`SELECT status FROM room_viewing_requests WHERE id=${upcoming};`, cleanup), "SCHEDULED");
    assert.equal(await query(`SELECT status FROM room_viewing_proposals WHERE id=${pending};`, cleanup), "PENDING");
    assert.equal(await query("SELECT status FROM rooms WHERE id=4;", cleanup), "AVAILABLE");
  });
  await check("notification failures roll back the contract, room hold, cancellations and proposal decisions together", async () => {
    await query(`DELIMITER $$
CREATE TRIGGER fixture_cleanup_notification BEFORE INSERT ON notifications FOR EACH ROW
BEGIN IF NEW.type='ROOM_VIEWINGS_CLOSED' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Fixture notification failure'; END IF; END$$
DELIMITER ;`, cleanup);
    const before = await query("SELECT COUNT(*) FROM notifications;", cleanup);
    await assert.rejects(createContract("ROLLBACK-CLEANUP"), /Fixture notification failure/);
    assert.equal(await query("SELECT COUNT(*) FROM contracts WHERE room_id=4;", cleanup), "0");
    assert.equal(await query("SELECT COUNT(*) FROM room_tenants WHERE room_id=4;", cleanup), "0");
    assert.equal(await query("SELECT status FROM rooms WHERE id=4;", cleanup), "AVAILABLE");
    assert.equal(await query(`SELECT status FROM room_viewing_requests WHERE id=${upcoming};`, cleanup), "SCHEDULED");
    assert.equal(await query(`SELECT status FROM room_viewing_proposals WHERE id=${pending};`, cleanup), "PENDING");
    assert.equal(await query("SELECT COUNT(*) FROM notifications;", cleanup), before);
    await query("DROP TRIGGER fixture_cleanup_notification;", cleanup);
  });
  await check("sending a contract cancels upcoming viewings, rejects pending requests and preserves accepted history", async () => {
    createdContract = Number(await createContract("CLEANUP"));
    assert.equal(await query(`SELECT status,cancelled_by_id,cancellation_reason IS NOT NULL,cancelled_at IS NOT NULL FROM room_viewing_requests WHERE id=${upcoming};`, cleanup), "CANCELLED\t1\t1\t1");
    assert.equal(await query(`SELECT status,reviewed_by_id,rejection_reason IS NOT NULL FROM room_viewing_proposals WHERE id=${pending};`, cleanup), "REJECTED\t1\t1");
    assert.equal(await query(`SELECT status,scheduled_viewing_id FROM room_viewing_proposals WHERE id=${accepted};`, cleanup), `ACCEPTED\t${upcoming}`);
    assert.equal(await query(`SELECT status FROM room_viewing_proposals WHERE id=${expired};`, cleanup), "EXPIRED");
    assert.equal(await query(`SELECT status FROM room_viewing_requests WHERE id=${unaffected};`, cleanup), "SCHEDULED");
    assert.equal(await query("SELECT status,rental_decision FROM room_viewing_requests WHERE id=400;", cleanup), "COMPLETED\tAGREED");
    assert.equal(await query("SELECT status FROM rooms WHERE id=4;", cleanup), "RESERVED");
    assert.equal(await query(`SELECT user_id,type,resource_type,resource_id FROM notifications WHERE event_key='viewing:${upcoming}:cancelled-room-reserved';`, cleanup), `6\tVIEWING_CANCELLED\tROOM_VIEWING\t${upcoming}`);
    assert.equal(await query(`SELECT user_id,type FROM notifications WHERE event_key='viewing-proposal:${pending}:REJECT';`, cleanup), "4\tVIEWING_REJECT");
    await assert.rejects(createContract("DUPLICATE-CLEANUP"), /occupied or reserved/);
    assert.equal(await query("SELECT COUNT(*) FROM notifications WHERE type='ROOM_VIEWINGS_CLOSED';", cleanup), "1");
  });
  await check("contract confirmation keeps the room reserved; cancellation never resurrects old schedules or proposals", async () => {
    await query(`CALL sp_confirm_contract(${createdContract},5);`, cleanup);
    assert.equal(await query("SELECT status FROM rooms WHERE id=4;", cleanup), "RESERVED");
    await query(`CALL sp_cancel_contract(${createdContract},1,'Tenant changed plan');`, cleanup);
    assert.equal(await query("SELECT status FROM rooms WHERE id=4;", cleanup), "AVAILABLE");
    assert.equal(await query(`SELECT status FROM room_viewing_requests WHERE id=${upcoming};`, cleanup), "CANCELLED");
    assert.equal(await query(`SELECT status FROM room_viewing_proposals WHERE id=${pending};`, cleanup), "REJECTED");
    await query("CALL sp_request_viewing(704,4,4,UTC_TIMESTAMP()+INTERVAL 4 DAY,30,'New request after release',UUID(),@p);", cleanup);
  });
  await check("cleanup migration enforces order and replaces the same routine on existing databases", async () => {
    await query(cleanupUpgrade.replaceAll("room_rental_v5_20261023", invalid), undefined, /viewing proposals migration before/);
    await query(cleanupUpgrade.replaceAll("room_rental_v5_20261023", upgraded), undefined, /already applied/);
  });
  await check("competing contracts and proposal approval cannot leave a future schedule on a newly held room", async () => {
    const nextProposal = Number(await query("SELECT id FROM room_viewing_proposals WHERE status='PENDING' AND room_id=4;", cleanup));
    const results = await Promise.allSettled([
      createContract("RACE-FIRST"),
      query("CALL sp_create_rental_contract(399,1,'RACE-SECOND',DATE(UTC_TIMESTAMP()+INTERVAL 7 HOUR),DATE(UTC_TIMESTAMP()+INTERVAL 7 HOUR)+INTERVAL 1 YEAR,4000000,4000000,'Agreed terms',NULL,JSON_ARRAY(),@contract);", cleanup),
      query(`CALL sp_review_viewing_proposal(${nextProposal},1,'ACCEPT',NULL,@v);`, cleanup)
    ]);
    assert.equal(results.slice(0,2).filter((r) => r.status==='fulfilled').length, 1);
    assert.match(results.slice(0,2).find((r) => r.status==='rejected').reason.message, /occupied or reserved/);
    assert.equal(await query("SELECT COUNT(*) FROM contracts WHERE room_id=4 AND status='PENDING_CONFIRMATION';", cleanup), "1");
    assert.equal(await query("SELECT COUNT(*) FROM room_viewing_requests WHERE room_id=4 AND status='SCHEDULED' AND starts_at>UTC_TIMESTAMP(6);", cleanup), "0");
    assert.equal(await query("SELECT COUNT(*) FROM room_viewing_proposals WHERE room_id=4 AND status='PENDING';", cleanup), "0");
    const proposalState = await query(`SELECT status FROM room_viewing_proposals WHERE id=${nextProposal};`, cleanup);
    assert.ok(['ACCEPTED','REJECTED'].includes(proposalState));
    if (proposalState==='ACCEPTED') assert.equal(await query(`SELECT v.status FROM room_viewing_requests v JOIN room_viewing_proposals p ON p.scheduled_viewing_id=v.id WHERE p.id=${nextProposal};`, cleanup), "CANCELLED");
    assert.equal(await query("SELECT status FROM rooms WHERE id=4;", cleanup), "RESERVED");
  });
  console.log(`${checks} MySQL integration checks passed; migrations, concurrent approvals, contract reservation cleanup, notifications and rollback verified.`);
}
