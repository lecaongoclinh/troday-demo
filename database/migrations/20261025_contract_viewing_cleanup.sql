-- Run once AFTER 20261025_viewing_proposals.sql. Back up and stop writers first.
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

-- BEGIN V5 CONTRACT VIEWING CLEANUP 20261025
-- Internal helper: called only by the contract procedure while holding the room lock.
DELIMITER $$
DROP PROCEDURE IF EXISTS _v5_close_viewings_for_contract$$
CREATE PROCEDURE _v5_close_viewings_for_contract(IN p_contract BIGINT, IN p_room BIGINT, IN p_owner BIGINT)
BEGIN
  DECLARE v_now DATETIME(6) DEFAULT UTC_TIMESTAMP(6);
  DECLARE v_reason VARCHAR(1000) DEFAULT 'Phòng đã được giữ để lập hợp đồng; lịch xem bị hủy. Vui lòng trao đổi để chọn phòng khác.';
  DECLARE v_proposal_reason VARCHAR(1000) DEFAULT 'Phòng đã được giữ để lập hợp đồng; đề nghị xem phòng không được chấp nhận.';
  DECLARE v_cancelled INT DEFAULT 0;
  DECLARE v_rejected INT DEFAULT 0;
  IF NOT EXISTS (SELECT 1 FROM contracts WHERE id=p_contract AND room_id=p_room AND landlord_id=p_owner AND status='PENDING_CONFIRMATION') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Viewing cleanup requires the newly sent room contract';
  END IF;

  -- Only upcoming appointments are cancelled. Past/ongoing and completed history stays intact.
  SELECT COUNT(*) INTO v_cancelled FROM room_viewing_requests WHERE room_id=p_room AND status='SCHEDULED' AND starts_at>=v_now;
  INSERT INTO notifications(user_id,type,title,content,resource_type,resource_id,event_key)
    SELECT tenant_id,'VIEWING_CANCELLED','Lịch xem phòng đã hủy',v_reason,'ROOM_VIEWING',id,CONCAT('viewing:',id,':cancelled-room-reserved')
    FROM room_viewing_requests WHERE room_id=p_room AND status='SCHEDULED' AND starts_at>=v_now;
  UPDATE room_viewing_requests SET status='CANCELLED',cancelled_at=v_now,cancelled_by_id=p_owner,cancellation_reason=v_reason,updated_at=v_now
    WHERE room_id=p_room AND status='SCHEDULED' AND starts_at>=v_now;

  -- Expired proposals must expire rather than acquire a false owner rejection.
  UPDATE room_viewing_proposals SET status='EXPIRED',expired_at=v_now,updated_at=v_now
    WHERE room_id=p_room AND status='PENDING' AND starts_at<=v_now;
  SELECT COUNT(*) INTO v_rejected FROM room_viewing_proposals WHERE room_id=p_room AND status='PENDING' AND starts_at>v_now;
  INSERT INTO notifications(user_id,type,title,content,resource_type,resource_id,event_key)
    SELECT tenant_id,'VIEWING_REJECT','Đề nghị xem phòng đã đóng',v_proposal_reason,'ROOM_VIEWING_PROPOSAL',id,CONCAT('viewing-proposal:',id,':REJECT')
    FROM room_viewing_proposals WHERE room_id=p_room AND status='PENDING' AND starts_at>v_now;
  UPDATE room_viewing_proposals SET status='REJECTED',reviewed_by_id=p_owner,reviewed_at=v_now,rejection_reason=v_proposal_reason,updated_at=v_now
    WHERE room_id=p_room AND status='PENDING' AND starts_at>v_now;

  IF v_cancelled+v_rejected>0 THEN
    INSERT INTO notifications(user_id,type,title,content,resource_type,resource_id,event_key)
      VALUES(p_owner,'ROOM_VIEWINGS_CLOSED','Đã xử lý lịch xem khi giữ phòng',
        CONCAT('Đã hủy ',v_cancelled,' lịch sắp tới và đóng ',v_rejected,' đề nghị chờ; người liên quan đã được thông báo.'),
        'CONTRACT',p_contract,CONCAT('contract:',p_contract,':viewings-closed'));
  END IF;
END$$

-- Replaces the original routine without changing its public signature or historical migrations.
DROP PROCEDURE IF EXISTS sp_create_rental_contract$$
CREATE PROCEDURE sp_create_rental_contract(IN p_viewing BIGINT, IN p_actor BIGINT, IN p_number VARCHAR(100), IN p_start DATE, IN p_end DATE, IN p_rent DECIMAL(15,2), IN p_deposit DECIMAL(15,2), IN p_content LONGTEXT, IN p_template BIGINT, IN p_extra_members JSON, OUT p_contract BIGINT)
SQL SECURITY DEFINER
COMMENT 'V5_CONTRACT_VIEWING_CLEANUP_20261025'
BEGIN
  DECLARE v_started BOOLEAN DEFAULT FALSE;
  DECLARE v_room BIGINT;
  DECLARE v_house BIGINT;
  DECLARE v_owner BIGINT;
  DECLARE v_tenant BIGINT;
  DECLARE v_status VARCHAR(40);
  DECLARE v_decision VARCHAR(40);
  DECLARE v_capacity INT;
  DECLARE v_rep BIGINT;
  DECLARE v_revision BIGINT;
  DECLARE v_snapshot JSON;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN IF v_started THEN ROLLBACK; END IF; RESIGNAL; END;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  START TRANSACTION; SET v_started=TRUE;
  SELECT room_id INTO v_room FROM room_viewing_requests WHERE id=p_viewing;
  SELECT house_id,max_occupants INTO v_house,v_capacity FROM rooms WHERE id=v_room FOR UPDATE;
  SELECT created_by_id,tenant_id,status,rental_decision INTO v_owner,v_tenant,v_status,v_decision FROM room_viewing_requests WHERE id=p_viewing FOR UPDATE;
  IF v_owner IS NULL OR NOT (v_owner<=>p_actor) OR v_status<>'COMPLETED' OR v_decision<>'AGREED'
    OR NOT EXISTS (SELECT 1 FROM users WHERE id=p_actor AND status='ACTIVE')
    OR p_start IS NULL OR p_end IS NULL OR p_end<p_start OR p_rent IS NULL OR p_rent<0 OR p_deposit IS NULL OR p_deposit<0
    OR NULLIF(TRIM(p_number),'') IS NULL OR NULLIF(TRIM(p_content),'') IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Invalid completed viewing, owner or contract terms';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM rooms WHERE id=v_room AND status='AVAILABLE')
    OR EXISTS (SELECT 1 FROM contracts WHERE room_id=v_room AND status IN ('DRAFT','PENDING_CONFIRMATION','CONFIRMED','ACTIVE'))
    OR EXISTS (SELECT 1 FROM room_tenants WHERE room_id=v_room AND status='ACTIVE') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Room is already occupied or reserved';
  END IF;
  SET p_extra_members=COALESCE(p_extra_members,JSON_ARRAY());
  IF JSON_TYPE(p_extra_members)<>'ARRAY' OR JSON_LENGTH(p_extra_members)+1>v_capacity THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Initial members exceed room capacity'; END IF;
  IF EXISTS (SELECT 1 FROM JSON_TABLE(p_extra_members,'$[*]' COLUMNS(full_name VARCHAR(150) PATH '$.full_name' NULL ON EMPTY)) x WHERE NULLIF(TRIM(x.full_name),'') IS NULL) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Each initial member needs a name'; END IF;
  INSERT INTO contracts(contract_number,room_id,house_id,landlord_id,viewing_id,viewing_tenant_id,source,status,start_date,end_date,rent_amount,deposit_amount)
    VALUES(p_number,v_room,v_house,p_actor,p_viewing,v_tenant,'NEW_RENTAL','DRAFT',p_start,p_end,p_rent,p_deposit);
  SET p_contract=LAST_INSERT_ID();
  INSERT INTO room_tenants(contract_id,room_id,tenant_id,full_name,status,intake_source,planned_move_in_date)
    SELECT p_contract,v_room,u.id,u.full_name,'PLANNED','INITIAL_CONTRACT',p_start FROM users u WHERE u.id=v_tenant AND u.status='ACTIVE';
  IF ROW_COUNT()<>1 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Representative account is not active'; END IF;
  SET v_rep=LAST_INSERT_ID();
  INSERT INTO room_tenants(contract_id,room_id,tenant_id,full_name,identity_number,date_of_birth,status,intake_source,planned_move_in_date)
    SELECT p_contract,v_room,x.tenant_id,TRIM(x.full_name),x.identity_number,x.date_of_birth,'PLANNED','INITIAL_CONTRACT',p_start
    FROM JSON_TABLE(p_extra_members,'$[*]' COLUMNS(
      tenant_id BIGINT PATH '$.tenant_id' NULL ON EMPTY,
      full_name VARCHAR(150) PATH '$.full_name' ERROR ON EMPTY,
      identity_number VARCHAR(30) PATH '$.identity_number' NULL ON EMPTY,
      date_of_birth DATE PATH '$.date_of_birth' NULL ON EMPTY
    )) x;
  SELECT JSON_ARRAYAGG(JSON_OBJECT('room_tenant_id',id,'tenant_id',tenant_id,'full_name',full_name,'identity_number',identity_number)) INTO v_snapshot FROM room_tenants WHERE contract_id=p_contract;
  INSERT INTO contract_revisions(contract_id,revision_number,template_id,created_by_id,kind,status,start_date,end_date,effective_from,rent_amount,deposit_amount,content,members_snapshot,representative_room_tenant_id,landlord_confirmed_by_id,landlord_confirmed_at,sent_at)
    VALUES(p_contract,1,p_template,p_actor,'INITIAL','PENDING_CONFIRMATION',p_start,p_end,p_start,p_rent,p_deposit,p_content,v_snapshot,v_rep,p_actor,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6));
  SET v_revision=LAST_INSERT_ID();
  UPDATE contracts SET representative_room_tenant_id=v_rep,current_revision_id=v_revision,status='PENDING_CONFIRMATION',updated_at=UTC_TIMESTAMP(6) WHERE id=p_contract;
  INSERT INTO notifications(user_id,type,title,content,resource_type,resource_id,event_key)
    VALUES(v_tenant,'CONTRACT_SENT','Contract confirmation requested',p_number,'CONTRACT',p_contract,CONCAT('contract-sent:',v_revision));
  CALL _v5_sync_room(v_room);
  CALL _v5_close_viewings_for_contract(p_contract,v_room,p_actor);
  COMMIT;
END$$
DELIMITER ;
-- END V5 CONTRACT VIEWING CLEANUP 20261025
