-- Run once AFTER 20261025_post_review_quota.sql. Back up and stop writers first.
-- No fabricated approvals: old houses become unverified; existing leases/history remain intact.
-- Deploy public queries using v_public_house_posts together with this migration.
USE room_rental_v5_20261023;
SET time_zone = '+00:00';
DELIMITER $$
DROP PROCEDURE IF EXISTS _v5_preflight_house_rights$$
CREATE PROCEDURE _v5_preflight_house_rights()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='posts' AND column_name='pending_review_slot') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Apply post review quota before house rights verification';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='rental_house_verifications')
    OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='rental_houses' AND column_name='verification_version') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='House rights migration already applied or incomplete; do not rerun blindly';
  END IF;
END$$
CALL _v5_preflight_house_rights()$$
DROP PROCEDURE _v5_preflight_house_rights$$
DELIMITER ;

-- Per-house rental rights. Account identity approval does not approve a house.
-- Append after post-review-quota.sql. No approvals are invented for legacy houses.
ALTER TABLE rental_houses
  ADD COLUMN name VARCHAR(150) NOT NULL DEFAULT '' AFTER landlord_id,
  ADD COLUMN row_version BIGINT NOT NULL DEFAULT 1,
  ADD COLUMN verification_version BIGINT NOT NULL DEFAULT 1,
  ADD COLUMN creation_key VARCHAR(100),
  ADD UNIQUE KEY uq_houses_creation (landlord_id,creation_key),
  ADD CONSTRAINT ck_houses_versions CHECK (row_version>0 AND verification_version>0);
UPDATE rental_houses SET name=LEFT(address,150) WHERE name='';

CREATE TABLE rental_house_verifications (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  house_id BIGINT NOT NULL,
  applicant_landlord_id BIGINT NOT NULL,
  house_version BIGINT NOT NULL,
  house_snapshot JSON NOT NULL,
  right_type VARCHAR(30) NOT NULL,
  scope_description VARCHAR(2000) NOT NULL,
  valid_from DATE NOT NULL,
  valid_until DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  submitted_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  reviewed_by_id BIGINT,
  reviewed_at DATETIME(6),
  evidence_checked_at DATETIME(6),
  rejection_reason VARCHAR(1000),
  revoked_by_id BIGINT,
  revoked_at DATETIME(6),
  revocation_reason VARCHAR(1000),
  withdrawn_at DATETIME(6),
  withdrawal_reason VARCHAR(1000),
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  pending_house_id BIGINT GENERATED ALWAYS AS (CASE WHEN status='PENDING' THEN house_id ELSE NULL END) STORED,
  approved_house_id BIGINT GENERATED ALWAYS AS (CASE WHEN status='APPROVED' THEN house_id ELSE NULL END) STORED,
  UNIQUE KEY uq_house_pending (pending_house_id),
  UNIQUE KEY uq_house_approved (approved_house_id),
  KEY ix_house_verification_history (house_id,submitted_at),
  CONSTRAINT fk_house_proof_house FOREIGN KEY (house_id) REFERENCES rental_houses(id),
  CONSTRAINT fk_house_proof_applicant FOREIGN KEY (applicant_landlord_id) REFERENCES landlords(id),
  CONSTRAINT fk_house_proof_reviewer FOREIGN KEY (reviewed_by_id) REFERENCES admins(id),
  CONSTRAINT fk_house_proof_revoker FOREIGN KEY (revoked_by_id) REFERENCES admins(id),
  CONSTRAINT ck_house_right_type CHECK (right_type IN ('OWNER','AUTHORIZED','SUBLESSOR')),
  CONSTRAINT ck_house_proof_status CHECK (status IN ('PENDING','APPROVED','REJECTED','WITHDRAWN','REVOKED','EXPIRED','SUPERSEDED')),
  CONSTRAINT ck_house_proof_scope CHECK (CHAR_LENGTH(TRIM(scope_description))>0),
  CONSTRAINT ck_house_proof_period CHECK ((valid_until IS NULL OR valid_until>=valid_from) AND (right_type='OWNER' OR valid_until IS NOT NULL)),
  CONSTRAINT ck_house_proof_review CHECK (status NOT IN ('APPROVED','REJECTED','REVOKED','EXPIRED','SUPERSEDED') OR (reviewed_by_id IS NOT NULL AND reviewed_at IS NOT NULL)),
  CONSTRAINT ck_house_proof_checked CHECK (status NOT IN ('APPROVED','REVOKED','EXPIRED','SUPERSEDED') OR evidence_checked_at IS NOT NULL),
  CONSTRAINT ck_house_proof_rejection CHECK (status<>'REJECTED' OR CHAR_LENGTH(TRIM(rejection_reason))>0),
  CONSTRAINT ck_house_proof_revocation CHECK (status<>'REVOKED' OR (revoked_by_id IS NOT NULL AND revoked_at IS NOT NULL AND CHAR_LENGTH(TRIM(revocation_reason))>0)),
  CONSTRAINT ck_house_proof_withdrawal CHECK (status<>'WITHDRAWN' OR withdrawn_at IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE house_verification_documents (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  verification_id BIGINT NOT NULL,
  file_id BIGINT NOT NULL,
  document_type VARCHAR(40) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_house_document (verification_id,file_id,document_type),
  CONSTRAINT fk_house_document_verification FOREIGN KEY (verification_id) REFERENCES rental_house_verifications(id),
  CONSTRAINT fk_house_document_file FOREIGN KEY (file_id) REFERENCES files(id),
  CONSTRAINT ck_house_document_type CHECK (document_type IN ('OWNER_PROOF','AUTHORIZATION','LEASE_AGREEMENT','SUBLET_CONSENT','OTHER'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE OR REPLACE VIEW v_effective_house_verifications AS
SELECT v.id,v.house_id,v.applicant_landlord_id,v.right_type,v.valid_from,v.valid_until
FROM rental_house_verifications v
JOIN rental_houses h ON h.id=v.house_id AND h.landlord_id=v.applicant_landlord_id AND h.verification_version=v.house_version
JOIN users u ON u.id=h.landlord_id AND u.status='ACTIVE'
WHERE v.status='APPROVED' AND v.valid_from<=DATE(UTC_TIMESTAMP()+INTERVAL 7 HOUR)
  AND (v.valid_until IS NULL OR v.valid_until>=DATE(UTC_TIMESTAMP()+INTERVAL 7 HOUR));

-- Public search/share queries MUST use this view, including already-approved old posts.
CREATE OR REPLACE VIEW v_public_house_posts AS
SELECT p.* FROM posts p JOIN rooms r ON r.id=p.room_id
JOIN v_effective_house_verifications v ON v.house_id=r.house_id WHERE p.status='APPROVED';

DELIMITER $$
CREATE PROCEDURE _v5_house_actor(IN p_actor BIGINT, IN p_role VARCHAR(30))
SQL SECURITY DEFINER
BEGIN
  IF p_actor IS NULL OR NOT EXISTS (SELECT 1 FROM users WHERE id=p_actor AND status='ACTIVE')
    OR (p_role='LANDLORD' AND NOT EXISTS (SELECT 1 FROM landlords WHERE id=p_actor))
    OR (p_role='ADMIN' AND NOT EXISTS (SELECT 1 FROM admins WHERE id=p_actor)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Invalid active house actor';
  END IF;
END$$

CREATE PROCEDURE _v5_require_house_rights(IN p_room BIGINT)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_house BIGINT;
  DECLARE v_version BIGINT;
  DECLARE v_owner BIGINT;
  DECLARE v_proof BIGINT;
  SELECT h.id,h.verification_version,h.landlord_id INTO v_house,v_version,v_owner
    FROM rental_houses h JOIN rooms r ON r.house_id=h.id WHERE r.id=p_room FOR UPDATE;
  -- Locking reads avoid an earlier REPEATABLE READ snapshot reviving revoked rights.
  SELECT v.id INTO v_proof FROM rental_house_verifications v JOIN users u ON u.id=v.applicant_landlord_id
    WHERE v.house_id=v_house AND v.house_version=v_version AND v.applicant_landlord_id=v_owner AND u.status='ACTIVE'
      AND v.status='APPROVED' AND v.valid_from<=DATE(UTC_TIMESTAMP()+INTERVAL 7 HOUR)
      AND (v.valid_until IS NULL OR v.valid_until>=DATE(UTC_TIMESTAMP()+INTERVAL 7 HOUR)) FOR SHARE;
  IF v_proof IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='House rental rights must be verified and effective';
  END IF;
END$$

CREATE PROCEDURE _v5_validate_house_documents(IN p_verification BIGINT)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_type VARCHAR(30);
  DECLARE v_owner BIGINT;
  SELECT right_type,applicant_landlord_id INTO v_type,v_owner FROM rental_house_verifications WHERE id=p_verification;
  IF v_type IS NULL OR (SELECT COUNT(*) FROM house_verification_documents WHERE verification_id=p_verification) NOT BETWEEN 1 AND 8
    OR EXISTS (SELECT 1 FROM house_verification_documents d JOIN files f ON f.id=d.file_id WHERE d.verification_id=p_verification
      AND (f.owner_user_id<>v_owner OR f.purpose<>'LANDLORD_PROOF' OR f.visibility<>'PRIVATE' OR f.status<>'ACTIVE'
        OR f.deleted_at IS NOT NULL OR f.size_bytes NOT BETWEEN 1 AND 5242880
        OR f.mime_type NOT IN ('application/pdf','image/jpeg','image/png','image/webp')
        OR (f.expires_at IS NOT NULL AND f.expires_at<=UTC_TIMESTAMP(6)))) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='House proof files must be owned, private, active PDF or images, at most 5MB';
  END IF;
  IF (v_type IN ('OWNER','AUTHORIZED') AND NOT EXISTS (SELECT 1 FROM house_verification_documents WHERE verification_id=p_verification AND document_type='OWNER_PROOF'))
    OR (v_type='AUTHORIZED' AND NOT EXISTS (SELECT 1 FROM house_verification_documents WHERE verification_id=p_verification AND document_type='AUTHORIZATION'))
    OR (v_type='SUBLESSOR' AND (NOT EXISTS (SELECT 1 FROM house_verification_documents WHERE verification_id=p_verification AND document_type='LEASE_AGREEMENT')
      OR NOT EXISTS (SELECT 1 FROM house_verification_documents WHERE verification_id=p_verification AND document_type='SUBLET_CONSENT'))) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Missing required house ownership, authorization or sublet documents';
  END IF;
END$$

CREATE PROCEDURE sp_create_rental_house(IN p_actor BIGINT,IN p_name VARCHAR(150),IN p_address VARCHAR(500),IN p_province VARCHAR(30),IN p_creation_key VARCHAR(100),OUT p_house BIGINT)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_started BOOLEAN DEFAULT FALSE;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN IF v_started THEN ROLLBACK; END IF; RESIGNAL; END;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  START TRANSACTION; SET v_started=TRUE;
  CALL _v5_house_actor(p_actor,'LANDLORD');
  IF NULLIF(TRIM(p_name),'') IS NULL OR NULLIF(TRIM(p_address),'') IS NULL OR NULLIF(TRIM(p_province),'') IS NULL OR NULLIF(TRIM(p_creation_key),'') IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='House name, address, province and creation key required';
  END IF;
  INSERT INTO rental_houses(landlord_id,name,address,province_code,creation_key)
    VALUES(p_actor,TRIM(p_name),TRIM(p_address),p_province,p_creation_key)
    ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id);
  SET p_house=LAST_INSERT_ID();
  COMMIT;
END$$

CREATE PROCEDURE sp_update_rental_house(IN p_house BIGINT,IN p_actor BIGINT,IN p_version BIGINT,IN p_name VARCHAR(150),IN p_address VARCHAR(500),IN p_province VARCHAR(30),IN p_locality VARCHAR(30),IN p_area VARCHAR(150),IN p_latitude DECIMAL(10,7),IN p_longitude DECIMAL(10,7),IN p_notes VARCHAR(2000))
SQL SECURITY DEFINER
BEGIN
  DECLARE v_version BIGINT;
  DECLARE v_owner BIGINT;
  DECLARE v_started BOOLEAN DEFAULT FALSE;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN IF v_started THEN ROLLBACK; END IF; RESIGNAL; END;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  START TRANSACTION; SET v_started=TRUE;
  CALL _v5_house_actor(p_actor,'LANDLORD');
  SELECT landlord_id,row_version INTO v_owner,v_version FROM rental_houses WHERE id=p_house FOR UPDATE;
  IF v_owner IS NULL OR v_owner<>p_actor OR p_version IS NULL OR v_version<>p_version THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='House ownership or version changed; reload before saving';
  END IF;
  IF NULLIF(TRIM(p_name),'') IS NULL OR NULLIF(TRIM(p_address),'') IS NULL OR NULLIF(TRIM(p_province),'') IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='House name, address and province required';
  END IF;
  UPDATE rental_houses SET name=TRIM(p_name),address=TRIM(p_address),province_code=p_province,locality_code=p_locality,
    area_label=p_area,latitude=p_latitude,longitude=p_longitude,notes=p_notes WHERE id=p_house;
  COMMIT;
END$$

CREATE PROCEDURE sp_submit_house_verification(IN p_house BIGINT,IN p_actor BIGINT,IN p_right VARCHAR(30),IN p_scope VARCHAR(2000),IN p_from DATE,IN p_until DATE,IN p_documents JSON,OUT p_verification BIGINT)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_owner BIGINT;
  DECLARE v_version BIGINT;
  DECLARE v_snapshot JSON;
  DECLARE v_started BOOLEAN DEFAULT FALSE;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN IF v_started THEN ROLLBACK; END IF; RESIGNAL; END;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  START TRANSACTION; SET v_started=TRUE;
  CALL _v5_house_actor(p_actor,'LANDLORD');
  SELECT landlord_id,verification_version,JSON_OBJECT('ownerId',landlord_id,'address',address,'provinceCode',province_code,'localityCode',locality_code,'latitude',latitude,'longitude',longitude)
    INTO v_owner,v_version,v_snapshot FROM rental_houses WHERE id=p_house FOR UPDATE;
  IF v_owner IS NULL OR v_owner<>p_actor THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='House not owned by applicant'; END IF;
  IF p_right IS NULL OR p_right NOT IN ('OWNER','AUTHORIZED','SUBLESSOR') OR NULLIF(TRIM(p_scope),'') IS NULL OR p_from IS NULL
    OR (p_right<>'OWNER' AND p_until IS NULL) OR (p_until IS NOT NULL AND (p_until<p_from OR p_until<DATE(UTC_TIMESTAMP()+INTERVAL 7 HOUR))) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Invalid house right type, scope or validity period';
  END IF;
  IF p_documents IS NULL OR JSON_TYPE(p_documents)<>'ARRAY' OR JSON_LENGTH(p_documents) NOT BETWEEN 1 AND 8 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Provide 1 to 8 categorized proof files';
  END IF;
  INSERT INTO rental_house_verifications(house_id,applicant_landlord_id,house_version,house_snapshot,right_type,scope_description,valid_from,valid_until)
    VALUES(p_house,p_actor,v_version,v_snapshot,p_right,TRIM(p_scope),p_from,p_until);
  SET p_verification=LAST_INSERT_ID();
  INSERT INTO house_verification_documents(verification_id,file_id,document_type)
    SELECT p_verification,j.file_id,j.document_type FROM JSON_TABLE(p_documents,'$[*]' COLUMNS(file_id BIGINT PATH '$.fileId' ERROR ON EMPTY ERROR ON ERROR,document_type VARCHAR(40) PATH '$.documentType' ERROR ON EMPTY ERROR ON ERROR)) j;
  CALL _v5_validate_house_documents(p_verification);
  INSERT INTO notifications(user_id,type,title,content,resource_type,resource_id,event_key)
    SELECT a.id,'HOUSE_VERIFICATION','House verification pending',CONCAT('Review house #',p_house),'HOUSE_VERIFICATION',p_verification,CONCAT('house-submitted-',p_verification)
      FROM admins a JOIN users u ON u.id=a.id AND u.status='ACTIVE';
  COMMIT;
END$$

CREATE PROCEDURE sp_review_house_verification(IN p_verification BIGINT,IN p_actor BIGINT,IN p_decision VARCHAR(20),IN p_reason VARCHAR(1000),IN p_evidence_checked BOOLEAN)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_house BIGINT;
  DECLARE v_owner BIGINT;
  DECLARE v_applicant BIGINT;
  DECLARE v_version BIGINT;
  DECLARE v_submitted_version BIGINT;
  DECLARE v_status VARCHAR(30);
  DECLARE v_from DATE;
  DECLARE v_until DATE;
  DECLARE v_started BOOLEAN DEFAULT FALSE;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN IF v_started THEN ROLLBACK; END IF; RESIGNAL; END;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  START TRANSACTION; SET v_started=TRUE;
  CALL _v5_house_actor(p_actor,'ADMIN');
  SELECT house_id INTO v_house FROM rental_house_verifications WHERE id=p_verification;
  SELECT landlord_id,verification_version INTO v_owner,v_version FROM rental_houses WHERE id=v_house FOR UPDATE;
  SELECT applicant_landlord_id,house_version,status,valid_from,valid_until INTO v_applicant,v_submitted_version,v_status,v_from,v_until
    FROM rental_house_verifications WHERE id=p_verification FOR UPDATE;
  IF v_status IS NULL OR p_decision IS NULL OR p_decision NOT IN ('APPROVE','REJECT','REVOKE')
    OR (p_decision IN ('APPROVE','REJECT') AND v_status<>'PENDING') OR (p_decision='REVOKE' AND v_status<>'APPROVED') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='House verification decision no longer applicable';
  END IF;
  IF p_decision='APPROVE' THEN
    CALL _v5_house_actor(v_applicant,'LANDLORD');
    IF NOT (p_evidence_checked<=>TRUE) OR v_owner<>v_applicant OR v_version<>v_submitted_version
      OR v_from>DATE(UTC_TIMESTAMP()+INTERVAL 7 HOUR) OR (v_until IS NOT NULL AND v_until<DATE(UTC_TIMESTAMP()+INTERVAL 7 HOUR)) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Check evidence, current house identity and effective dates before approval';
    END IF;
    CALL _v5_validate_house_documents(p_verification);
    UPDATE rental_house_verifications SET status='SUPERSEDED',updated_at=UTC_TIMESTAMP(6) WHERE house_id=v_house AND status='APPROVED';
    UPDATE rental_house_verifications SET status='APPROVED',reviewed_by_id=p_actor,reviewed_at=UTC_TIMESTAMP(6),evidence_checked_at=UTC_TIMESTAMP(6),updated_at=UTC_TIMESTAMP(6) WHERE id=p_verification;
  ELSE
    IF NULLIF(TRIM(p_reason),'') IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='House rejection or revocation requires a reason'; END IF;
    IF p_decision='REJECT' THEN
      UPDATE rental_house_verifications SET status='REJECTED',rejection_reason=TRIM(p_reason),reviewed_by_id=p_actor,reviewed_at=UTC_TIMESTAMP(6),updated_at=UTC_TIMESTAMP(6) WHERE id=p_verification;
    ELSE
      UPDATE rental_house_verifications SET status='REVOKED',revocation_reason=TRIM(p_reason),revoked_by_id=p_actor,revoked_at=UTC_TIMESTAMP(6),updated_at=UTC_TIMESTAMP(6) WHERE id=p_verification;
    END IF;
  END IF;
  INSERT INTO moderation_actions(actor_user_id,target_user_id,action,reason,before_snapshot,after_snapshot,occurred_at)
    VALUES(p_actor,v_applicant,CONCAT('HOUSE_',p_decision),COALESCE(NULLIF(TRIM(p_reason),''),'Evidence checked'),JSON_OBJECT('verificationId',p_verification,'houseId',v_house,'status',v_status),JSON_OBJECT('decision',p_decision),UTC_TIMESTAMP(6));
  INSERT INTO notifications(user_id,type,title,content,resource_type,resource_id,event_key)
    VALUES(v_applicant,'HOUSE_VERIFICATION','House verification updated',CONCAT(p_decision,': ',COALESCE(p_reason,'')),'HOUSE_VERIFICATION',p_verification,CONCAT('house-',p_decision,'-',p_verification));
  COMMIT;
END$$

CREATE PROCEDURE sp_withdraw_house_verification(IN p_verification BIGINT,IN p_actor BIGINT)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_house BIGINT;
  DECLARE v_owner BIGINT;
  DECLARE v_started BOOLEAN DEFAULT FALSE;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN IF v_started THEN ROLLBACK; END IF; RESIGNAL; END;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  START TRANSACTION; SET v_started=TRUE;
  CALL _v5_house_actor(p_actor,'LANDLORD');
  SELECT house_id INTO v_house FROM rental_house_verifications WHERE id=p_verification;
  SELECT landlord_id INTO v_owner FROM rental_houses WHERE id=v_house FOR UPDATE;
  IF v_owner IS NULL OR v_owner<>p_actor OR NOT EXISTS (SELECT 1 FROM rental_house_verifications WHERE id=p_verification AND applicant_landlord_id=p_actor AND status='PENDING') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Only applicant can withdraw a pending house verification';
  END IF;
  UPDATE rental_house_verifications SET status='WITHDRAWN',withdrawn_at=UTC_TIMESTAMP(6),withdrawal_reason='Applicant withdrew',updated_at=UTC_TIMESTAMP(6) WHERE id=p_verification;
  COMMIT;
END$$

CREATE TRIGGER trg_house_before_insert_rights BEFORE INSERT ON rental_houses FOR EACH ROW
BEGIN
  IF TRIM(NEW.address)='' OR TRIM(NEW.province_code)='' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='House address and province required'; END IF;
  IF TRIM(NEW.name)='' THEN SET NEW.name=LEFT(NEW.address,150); END IF;
  SET NEW.row_version=1,NEW.verification_version=1;
END$$

CREATE TRIGGER trg_house_before_update_rights BEFORE UPDATE ON rental_houses FOR EACH ROW
BEGIN
  IF TRIM(NEW.name)='' OR TRIM(NEW.address)='' OR TRIM(NEW.province_code)='' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='House name, address and province required'; END IF;
  SET NEW.row_version=OLD.row_version+1;
  SET NEW.verification_version=OLD.verification_version + (NOT ((NEW.landlord_id<=>OLD.landlord_id) AND (BINARY NEW.address<=>BINARY OLD.address)
    AND (NEW.province_code<=>OLD.province_code) AND (NEW.locality_code<=>OLD.locality_code) AND (NEW.latitude<=>OLD.latitude) AND (NEW.longitude<=>OLD.longitude)));
  SET NEW.updated_at=UTC_TIMESTAMP(6);
END$$

CREATE TRIGGER trg_house_after_update_rights AFTER UPDATE ON rental_houses FOR EACH ROW
BEGIN
  IF NEW.verification_version<>OLD.verification_version THEN
    UPDATE rental_house_verifications SET status='WITHDRAWN',withdrawn_at=UTC_TIMESTAMP(6),withdrawal_reason='House identity changed; submit a new verification',updated_at=UTC_TIMESTAMP(6)
      WHERE house_id=NEW.id AND status='PENDING';
  END IF;
END$$

CREATE TRIGGER trg_house_verification_before_update BEFORE UPDATE ON rental_house_verifications FOR EACH ROW
BEGIN
  IF NEW.house_id<>OLD.house_id OR NEW.applicant_landlord_id<>OLD.applicant_landlord_id OR NEW.house_version<>OLD.house_version
    OR NOT (NEW.house_snapshot<=>OLD.house_snapshot) OR NEW.right_type<>OLD.right_type OR NEW.scope_description<>OLD.scope_description
    OR NEW.valid_from<>OLD.valid_from OR NOT (NEW.valid_until<=>OLD.valid_until) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Submitted house proof snapshot is immutable';
  END IF;
  IF NEW.status<>OLD.status AND NOT ((OLD.status='PENDING' AND NEW.status IN ('APPROVED','REJECTED','WITHDRAWN'))
    OR (OLD.status='APPROVED' AND NEW.status IN ('SUPERSEDED','REVOKED','EXPIRED'))) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Invalid house verification status transition';
  END IF;
END$$

CREATE TRIGGER trg_house_documents_before_insert BEFORE INSERT ON house_verification_documents FOR EACH ROW
BEGIN
  IF NOT EXISTS (SELECT 1 FROM rental_house_verifications v JOIN files f ON f.id=NEW.file_id
    WHERE v.id=NEW.verification_id AND v.status='PENDING' AND f.owner_user_id=v.applicant_landlord_id AND f.purpose='LANDLORD_PROOF' AND f.visibility='PRIVATE' AND f.status='ACTIVE') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='House proof file must be private and owned by pending applicant';
  END IF;
END$$
CREATE TRIGGER trg_house_documents_before_update BEFORE UPDATE ON house_verification_documents FOR EACH ROW
BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='House proof documents are immutable; submit a new application'; END$$
CREATE TRIGGER trg_house_documents_before_delete BEFORE DELETE ON house_verification_documents FOR EACH ROW
BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Preserve house proof documents and decision history'; END$$

CREATE TRIGGER trg_house_files_before_update BEFORE UPDATE ON files FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM house_verification_documents WHERE file_id=OLD.id)
    AND (NEW.owner_user_id<>OLD.owner_user_id OR NEW.storage_key<>OLD.storage_key OR NEW.sha256<>OLD.sha256 OR NEW.mime_type<>OLD.mime_type
      OR NEW.size_bytes<>OLD.size_bytes OR NEW.purpose<>OLD.purpose OR NEW.visibility<>'PRIVATE' OR NEW.status NOT IN ('ACTIVE','ARCHIVED') OR NEW.deleted_at IS NOT NULL) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Referenced house evidence must remain private and immutable';
  END IF;
END$$

CREATE TRIGGER trg_posts_before_insert_rights BEFORE INSERT ON posts FOR EACH ROW
BEGIN IF NEW.status='APPROVED' THEN CALL _v5_require_house_rights(NEW.room_id); END IF; END$$
CREATE TRIGGER trg_posts_before_update_rights BEFORE UPDATE ON posts FOR EACH ROW
BEGIN IF NEW.status='APPROVED' AND (OLD.status<>'APPROVED' OR NEW.room_id<>OLD.room_id) THEN CALL _v5_require_house_rights(NEW.room_id); END IF; END$$
CREATE TRIGGER trg_contracts_before_insert_rights BEFORE INSERT ON contracts FOR EACH ROW
BEGIN
  -- PAPER_IMPORT retains signed historical leases; this route requires separate restricted backend authorization.
  IF NEW.source<>'PAPER_IMPORT' THEN CALL _v5_require_house_rights(NEW.room_id); END IF;
END$$
CREATE TRIGGER trg_contracts_before_update_rights BEFORE UPDATE ON contracts FOR EACH ROW
BEGIN
  IF NEW.end_date>OLD.end_date OR NEW.room_id<>OLD.room_id OR (NEW.source<>'PAPER_IMPORT' AND NEW.status<>OLD.status AND NEW.status IN ('PENDING_CONFIRMATION','CONFIRMED','ACTIVE')) THEN
    CALL _v5_require_house_rights(NEW.room_id);
  END IF;
END$$
DELIMITER ;
