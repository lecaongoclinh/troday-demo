-- BEGIN V5 VIEWING PROPOSALS 20261025
-- Shared source for fresh schema and the tenant-request migration. UTC sessions only.
CREATE TABLE `room_viewing_proposals` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `room_id` BIGINT NOT NULL,
  `house_id` BIGINT NOT NULL,
  `conversation_id` BIGINT NOT NULL,
  `tenant_id` BIGINT NOT NULL,
  `landlord_id` BIGINT NOT NULL,
  `client_request_key` CHAR(36) NOT NULL,
  `starts_at` DATETIME(6) NOT NULL,
  `ends_at` DATETIME(6) NOT NULL,
  `notes` VARCHAR(2000),
  `status` VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  `reviewed_by_id` BIGINT,
  `reviewed_at` DATETIME(6),
  `rejection_reason` VARCHAR(1000),
  `withdrawn_by_id` BIGINT,
  `withdrawn_at` DATETIME(6),
  `expired_at` DATETIME(6),
  `scheduled_viewing_id` BIGINT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `pending_tenant_id` BIGINT GENERATED ALWAYS AS (CASE WHEN status='PENDING' THEN tenant_id ELSE NULL END) STORED,
  UNIQUE KEY `uq_proposal_client_key` (`tenant_id`,`client_request_key`),
  UNIQUE KEY `uq_proposal_pending` (`room_id`,`pending_tenant_id`),
  UNIQUE KEY `uq_proposal_schedule` (`scheduled_viewing_id`),
  KEY `ix_proposal_owner_queue` (`landlord_id`,`status`,`starts_at`),
  KEY `ix_proposal_tenant_queue` (`tenant_id`,`status`,`created_at`),
  KEY `ix_proposal_room_time` (`room_id`,`status`,`starts_at`,`ends_at`),
  CONSTRAINT `fk_proposal_room` FOREIGN KEY (`room_id`,`house_id`) REFERENCES `rooms` (`id`,`house_id`),
  CONSTRAINT `fk_proposal_owner` FOREIGN KEY (`house_id`,`landlord_id`) REFERENCES `rental_houses` (`id`,`landlord_id`),
  CONSTRAINT `fk_proposal_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  CONSTRAINT `fk_proposal_conversation` FOREIGN KEY (`conversation_id`,`room_id`) REFERENCES `conversations` (`id`,`room_id`),
  CONSTRAINT `fk_proposal_tenant_member` FOREIGN KEY (`conversation_id`,`tenant_id`) REFERENCES `conversation_participants` (`conversation_id`,`user_id`),
  CONSTRAINT `fk_proposal_owner_member` FOREIGN KEY (`conversation_id`,`landlord_id`) REFERENCES `conversation_participants` (`conversation_id`,`user_id`),
  CONSTRAINT `fk_proposal_reviewer` FOREIGN KEY (`reviewed_by_id`) REFERENCES `landlords` (`id`),
  CONSTRAINT `fk_proposal_withdrawer` FOREIGN KEY (`withdrawn_by_id`) REFERENCES `tenants` (`id`),
  CONSTRAINT `fk_proposal_schedule` FOREIGN KEY (`scheduled_viewing_id`,`room_id`,`tenant_id`) REFERENCES `room_viewing_requests` (`id`,`room_id`,`tenant_id`),
  CONSTRAINT `ck_proposal_status` CHECK (status IN ('PENDING','ACCEPTED','REJECTED','WITHDRAWN','EXPIRED')),
  CONSTRAINT `ck_proposal_people` CHECK (tenant_id<>landlord_id),
  CONSTRAINT `ck_proposal_time` CHECK (TIMESTAMPDIFF(MICROSECOND,starts_at,ends_at) IN (1800000000,3600000000,5400000000,7200000000)),
  CONSTRAINT `ck_proposal_key` CHECK (CHAR_LENGTH(TRIM(client_request_key))=36),
  CONSTRAINT `ck_proposal_evidence` CHECK (
    (status='PENDING' AND reviewed_by_id IS NULL AND reviewed_at IS NULL AND rejection_reason IS NULL AND withdrawn_by_id IS NULL AND withdrawn_at IS NULL AND expired_at IS NULL AND scheduled_viewing_id IS NULL)
    OR (status='ACCEPTED' AND reviewed_by_id IS NOT NULL AND reviewed_by_id=landlord_id AND reviewed_at IS NOT NULL AND rejection_reason IS NULL AND withdrawn_by_id IS NULL AND withdrawn_at IS NULL AND expired_at IS NULL AND scheduled_viewing_id IS NOT NULL)
    OR (status='REJECTED' AND reviewed_by_id IS NOT NULL AND reviewed_by_id=landlord_id AND reviewed_at IS NOT NULL AND rejection_reason IS NOT NULL AND CHAR_LENGTH(TRIM(rejection_reason))>0 AND withdrawn_by_id IS NULL AND withdrawn_at IS NULL AND expired_at IS NULL AND scheduled_viewing_id IS NULL)
    OR (status='WITHDRAWN' AND reviewed_by_id IS NULL AND reviewed_at IS NULL AND rejection_reason IS NULL AND withdrawn_by_id IS NOT NULL AND withdrawn_by_id=tenant_id AND withdrawn_at IS NOT NULL AND expired_at IS NULL AND scheduled_viewing_id IS NULL)
    OR (status='EXPIRED' AND reviewed_by_id IS NULL AND reviewed_at IS NULL AND rejection_reason IS NULL AND withdrawn_by_id IS NULL AND withdrawn_at IS NULL AND expired_at IS NOT NULL AND scheduled_viewing_id IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DELIMITER $$
CREATE PROCEDURE _v5_check_viewing_context(IN p_conversation BIGINT, IN p_room BIGINT, IN p_tenant BIGINT, IN p_owner BIGINT, IN p_start DATETIME(6), IN p_end DATETIME(6))
BEGIN
  IF p_start IS NULL OR p_end IS NULL OR p_start<=UTC_TIMESTAMP(6) OR TIMESTAMPDIFF(MICROSECOND,p_start,p_end) NOT IN (1800000000,3600000000,5400000000,7200000000) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Invalid future UTC viewing interval';
  END IF;
  IF p_tenant IS NULL OR p_owner IS NULL OR p_tenant=p_owner OR NOT EXISTS (SELECT 1 FROM tenants t JOIN users u ON u.id=t.id WHERE t.id=p_tenant AND u.status='ACTIVE')
    OR NOT EXISTS (SELECT 1 FROM landlords l JOIN users u ON u.id=l.id WHERE l.id=p_owner AND u.status='ACTIVE') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Invalid active viewing participants';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM conversations c JOIN posts p ON p.id=c.post_id AND p.room_id=c.room_id
      JOIN rooms r ON r.id=c.room_id JOIN rental_houses h ON h.id=r.house_id
      WHERE c.id=p_conversation AND c.type='ROOM_INQUIRY' AND c.room_id=p_room AND h.landlord_id=p_owner AND p.status='APPROVED')
    OR (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id=p_conversation AND user_id IN (p_tenant,p_owner) AND left_at IS NULL AND deleted=FALSE)<>2 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Viewing requires the correct published room conversation and both participants';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM rooms WHERE id=p_room AND status='AVAILABLE')
    OR EXISTS (SELECT 1 FROM contracts WHERE room_id=p_room AND status IN ('DRAFT','PENDING_CONFIRMATION','CONFIRMED','ACTIVE'))
    OR EXISTS (SELECT 1 FROM room_tenants WHERE room_id=p_room AND status='ACTIVE') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Room is already occupied or reserved';
  END IF;
  IF EXISTS (SELECT 1 FROM room_viewing_requests WHERE room_id=p_room AND status='SCHEDULED' AND starts_at<p_end AND ends_at>p_start) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Viewing interval overlaps an existing appointment';
  END IF;
END$$

CREATE TRIGGER trg_proposal_before_insert BEFORE INSERT ON room_viewing_proposals FOR EACH ROW
BEGIN
  DECLARE v_room BIGINT;
  SELECT id INTO v_room FROM rooms WHERE id=NEW.room_id FOR UPDATE;
  IF NEW.status<>'PENDING' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='New viewing proposal must be pending'; END IF;
  CALL _v5_check_viewing_context(NEW.conversation_id,NEW.room_id,NEW.tenant_id,NEW.landlord_id,NEW.starts_at,NEW.ends_at);
END$$

CREATE TRIGGER trg_proposal_before_update BEFORE UPDATE ON room_viewing_proposals FOR EACH ROW
BEGIN
  IF NOT (NEW.room_id<=>OLD.room_id) OR NOT (NEW.house_id<=>OLD.house_id) OR NOT (NEW.conversation_id<=>OLD.conversation_id)
    OR NOT (NEW.tenant_id<=>OLD.tenant_id) OR NOT (NEW.landlord_id<=>OLD.landlord_id) OR NOT (NEW.client_request_key<=>OLD.client_request_key)
    OR NOT (NEW.starts_at<=>OLD.starts_at) OR NOT (NEW.ends_at<=>OLD.ends_at) OR NOT (NEW.notes<=>OLD.notes) OR NOT (NEW.created_at<=>OLD.created_at)
    OR OLD.status<>'PENDING' OR NEW.status NOT IN ('ACCEPTED','REJECTED','WITHDRAWN','EXPIRED') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Viewing proposal identity and terminal history are immutable';
  END IF;
  IF NEW.status='EXPIRED' AND NEW.starts_at>UTC_TIMESTAMP(6) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Proposal has not expired'; END IF;
  IF NEW.status IN ('ACCEPTED','REJECTED','WITHDRAWN') AND NEW.starts_at<=UTC_TIMESTAMP(6) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Proposal has expired'; END IF;
  IF NEW.status='ACCEPTED' AND NOT EXISTS (SELECT 1 FROM room_viewing_requests v WHERE v.id=NEW.scheduled_viewing_id
    AND v.room_id=NEW.room_id AND v.tenant_id=NEW.tenant_id AND v.created_by_id=NEW.landlord_id AND v.conversation_id=NEW.conversation_id
    AND v.starts_at=NEW.starts_at AND v.ends_at=NEW.ends_at AND v.status='SCHEDULED') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Acceptance requires its matching scheduled viewing';
  END IF;
END$$

CREATE TRIGGER trg_proposal_before_delete BEFORE DELETE ON room_viewing_proposals FOR EACH ROW
BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Viewing proposal history cannot be deleted'; END$$

CREATE PROCEDURE sp_request_viewing(IN p_conversation BIGINT, IN p_room BIGINT, IN p_actor BIGINT, IN p_start DATETIME(6), IN p_duration INT, IN p_notes VARCHAR(2000), IN p_key CHAR(36), OUT p_proposal BIGINT)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_started BOOLEAN DEFAULT FALSE;
  DECLARE v_house BIGINT; DECLARE v_owner BIGINT; DECLARE v_existing BIGINT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN IF v_started THEN ROLLBACK; END IF; RESIGNAL; END;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  START TRANSACTION; SET v_started=TRUE;
  SELECT r.house_id,h.landlord_id INTO v_house,v_owner FROM rooms r JOIN rental_houses h ON h.id=r.house_id WHERE r.id=p_room FOR UPDATE;
  IF p_actor IS NULL OR p_key IS NULL OR CHAR_LENGTH(TRIM(p_key))<>36 OR p_duration IS NULL OR p_duration NOT IN (30,60,90,120) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Invalid viewing proposal input'; END IF;
  SELECT id INTO v_existing FROM room_viewing_proposals WHERE tenant_id=p_actor AND client_request_key=p_key;
  IF v_existing IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM room_viewing_proposals WHERE id=v_existing AND room_id=p_room AND conversation_id=p_conversation AND starts_at=p_start AND ends_at=p_start+INTERVAL p_duration MINUTE AND notes<=>p_notes) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Request key was already used for different content';
    END IF;
    SET p_proposal=v_existing;
  ELSE
    UPDATE room_viewing_proposals SET status='EXPIRED',expired_at=UTC_TIMESTAMP(6),updated_at=UTC_TIMESTAMP(6) WHERE room_id=p_room AND tenant_id=p_actor AND status='PENDING' AND starts_at<=UTC_TIMESTAMP(6);
    INSERT INTO room_viewing_proposals(room_id,house_id,conversation_id,tenant_id,landlord_id,client_request_key,starts_at,ends_at,notes)
      VALUES(p_room,v_house,p_conversation,p_actor,v_owner,p_key,p_start,p_start+INTERVAL p_duration MINUTE,p_notes);
    SET p_proposal=LAST_INSERT_ID();
    INSERT INTO notifications(user_id,type,title,content,resource_type,resource_id,event_key)
      VALUES(v_owner,'VIEWING_PROPOSED','Có đề nghị xem phòng','Người thuê đề nghị lịch xem; cần chủ trọ xét duyệt.','ROOM_VIEWING_PROPOSAL',p_proposal,CONCAT('viewing-proposal:',p_proposal,':pending'));
  END IF;
  COMMIT;
END$$

CREATE PROCEDURE sp_review_viewing_proposal(IN p_proposal BIGINT, IN p_actor BIGINT, IN p_action VARCHAR(20), IN p_reason VARCHAR(1000), OUT p_viewing BIGINT)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_started BOOLEAN DEFAULT FALSE;
  DECLARE v_room BIGINT; DECLARE v_owner BIGINT; DECLARE v_status VARCHAR(40); DECLARE v_house BIGINT; DECLARE v_tenant BIGINT; DECLARE v_conversation BIGINT;
  DECLARE v_start DATETIME(6); DECLARE v_end DATETIME(6); DECLARE v_notes VARCHAR(2000);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN IF v_started THEN ROLLBACK; END IF; RESIGNAL; END;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  START TRANSACTION; SET v_started=TRUE; SET p_viewing=NULL;
  SELECT room_id INTO v_room FROM room_viewing_proposals WHERE id=p_proposal;
  SELECT h.landlord_id INTO v_owner FROM rooms r JOIN rental_houses h ON h.id=r.house_id WHERE r.id=v_room FOR UPDATE;
  IF v_owner IS NULL OR NOT (v_owner<=>p_actor) OR NOT EXISTS (SELECT 1 FROM users WHERE id=p_actor AND status='ACTIVE') OR p_action IS NULL OR p_action NOT IN ('ACCEPT','REJECT') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Only the active room owner may review this proposal';
  END IF;
  SELECT status,house_id,tenant_id,conversation_id,starts_at,ends_at,notes,scheduled_viewing_id INTO v_status,v_house,v_tenant,v_conversation,v_start,v_end,v_notes,p_viewing FROM room_viewing_proposals WHERE id=p_proposal FOR UPDATE;
  IF v_status='ACCEPTED' AND p_action='ACCEPT' THEN COMMIT;
  ELSE
    IF v_status<>'PENDING' OR v_start<=UTC_TIMESTAMP(6) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Viewing proposal is not pending or has expired'; END IF;
    IF p_action='ACCEPT' THEN
      CALL _v5_check_viewing_context(v_conversation,v_room,v_tenant,p_actor,v_start,v_end);
      INSERT INTO room_viewing_requests(room_id,house_id,conversation_id,tenant_id,created_by_id,starts_at,ends_at,notes)
        VALUES(v_room,v_house,v_conversation,v_tenant,p_actor,v_start,v_end,v_notes);
      SET p_viewing=LAST_INSERT_ID();
      UPDATE room_viewing_proposals SET status='ACCEPTED',reviewed_by_id=p_actor,reviewed_at=UTC_TIMESTAMP(6),scheduled_viewing_id=p_viewing,updated_at=UTC_TIMESTAMP(6) WHERE id=p_proposal;
    ELSE
      IF NULLIF(TRIM(p_reason),'') IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Rejection requires a reason'; END IF;
      UPDATE room_viewing_proposals SET status='REJECTED',reviewed_by_id=p_actor,reviewed_at=UTC_TIMESTAMP(6),rejection_reason=p_reason,updated_at=UTC_TIMESTAMP(6) WHERE id=p_proposal;
    END IF;
    INSERT INTO notifications(user_id,type,title,content,resource_type,resource_id,event_key)
      VALUES(v_tenant,CONCAT('VIEWING_',p_action),'Phản hồi đề nghị xem phòng',IF(p_action='ACCEPT','Chủ trọ đã chấp nhận và tạo lịch xem.',p_reason),'ROOM_VIEWING_PROPOSAL',p_proposal,CONCAT('viewing-proposal:',p_proposal,':',p_action));
    COMMIT;
  END IF;
END$$

CREATE PROCEDURE sp_withdraw_viewing_proposal(IN p_proposal BIGINT, IN p_actor BIGINT)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_started BOOLEAN DEFAULT FALSE; DECLARE v_room BIGINT; DECLARE v_locked BIGINT; DECLARE v_tenant BIGINT; DECLARE v_owner BIGINT; DECLARE v_status VARCHAR(40);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN IF v_started THEN ROLLBACK; END IF; RESIGNAL; END;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  START TRANSACTION; SET v_started=TRUE;
  SELECT room_id INTO v_room FROM room_viewing_proposals WHERE id=p_proposal;
  SELECT id INTO v_locked FROM rooms WHERE id=v_room FOR UPDATE;
  SELECT tenant_id,landlord_id,status INTO v_tenant,v_owner,v_status FROM room_viewing_proposals WHERE id=p_proposal FOR UPDATE;
  IF v_tenant IS NULL OR NOT (v_tenant<=>p_actor) OR NOT EXISTS (SELECT 1 FROM users WHERE id=p_actor AND status='ACTIVE') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Only the requesting tenant may withdraw'; END IF;
  IF v_status='PENDING' THEN
    UPDATE room_viewing_proposals SET status='WITHDRAWN',withdrawn_by_id=p_actor,withdrawn_at=UTC_TIMESTAMP(6),updated_at=UTC_TIMESTAMP(6) WHERE id=p_proposal;
    INSERT INTO notifications(user_id,type,title,content,resource_type,resource_id,event_key) VALUES(v_owner,'VIEWING_WITHDRAWN','Đã rút đề nghị xem phòng','Người thuê đã rút đề nghị.','ROOM_VIEWING_PROPOSAL',p_proposal,CONCAT('viewing-proposal:',p_proposal,':withdrawn'));
  ELSEIF v_status<>'WITHDRAWN' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Only a pending viewing proposal may be withdrawn'; END IF;
  COMMIT;
END$$

CREATE PROCEDURE sp_expire_viewing_proposals()
SQL SECURITY DEFINER
BEGIN
  DECLARE v_started BOOLEAN DEFAULT FALSE;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN IF v_started THEN ROLLBACK; END IF; RESIGNAL; END;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  START TRANSACTION; SET v_started=TRUE;
  UPDATE room_viewing_proposals SET status='EXPIRED',expired_at=UTC_TIMESTAMP(6),updated_at=UTC_TIMESTAMP(6) WHERE status='PENDING' AND starts_at<=UTC_TIMESTAMP(6);
  COMMIT;
END$$

-- Preserve owner-initiated scheduling; require a genuine tenant message in this room conversation.
DROP PROCEDURE IF EXISTS sp_schedule_viewing$$
CREATE PROCEDURE sp_schedule_viewing(IN p_conversation BIGINT, IN p_room BIGINT, IN p_tenant BIGINT, IN p_actor BIGINT, IN p_starts_at_utc DATETIME(6), IN p_duration_minutes INT, IN p_notes VARCHAR(2000), OUT p_viewing BIGINT)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_started BOOLEAN DEFAULT FALSE; DECLARE v_house BIGINT; DECLARE v_owner BIGINT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN IF v_started THEN ROLLBACK; END IF; RESIGNAL; END;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  START TRANSACTION; SET v_started=TRUE;
  SELECT r.house_id,h.landlord_id INTO v_house,v_owner FROM rooms r JOIN rental_houses h ON h.id=r.house_id WHERE r.id=p_room FOR UPDATE;
  IF v_owner IS NULL OR NOT (v_owner<=>p_actor) OR p_duration_minutes IS NULL OR p_duration_minutes NOT IN (30,60,90,120) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Invalid owner or viewing duration'; END IF;
  CALL _v5_check_viewing_context(p_conversation,p_room,p_tenant,p_actor,p_starts_at_utc,p_starts_at_utc+INTERVAL p_duration_minutes MINUTE);
  IF NOT EXISTS (SELECT 1 FROM chat_messages WHERE conversation_id=p_conversation AND sender_id=p_tenant AND message_type IN ('TEXT','IMAGE')) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Exchange messages with this tenant before creating a viewing'; END IF;
  INSERT INTO room_viewing_requests(room_id,house_id,conversation_id,tenant_id,created_by_id,starts_at,ends_at,notes) VALUES(p_room,v_house,p_conversation,p_tenant,p_actor,p_starts_at_utc,p_starts_at_utc+INTERVAL p_duration_minutes MINUTE,p_notes);
  SET p_viewing=LAST_INSERT_ID();
  INSERT INTO notifications(user_id,type,title,content,resource_type,resource_id,event_key) VALUES(p_tenant,'VIEWING_SCHEDULED','Chủ trọ đã tạo lịch xem','Lịch đã được chốt sau khi trao đổi qua tin nhắn.','ROOM_VIEWING',p_viewing,CONCAT('viewing:',p_viewing,':scheduled'));
  COMMIT;
END$$
DELIMITER ;
-- END V5 VIEWING PROPOSALS 20261025
