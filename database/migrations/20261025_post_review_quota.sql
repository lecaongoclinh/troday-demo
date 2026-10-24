-- Run once AFTER 20261025_multiple_room_posts.sql. Back up and stop writers first.
-- Preflight never rejects or deletes existing posts automatically.
USE room_rental_v5_20261023;
SET time_zone = '+00:00';
DELIMITER $$
DROP PROCEDURE IF EXISTS _v5_preflight_post_review_quota$$
CREATE PROCEDURE _v5_preflight_post_review_quota()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='posts' AND index_name='ix_posts_room_status')
    OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='posts' AND column_name='live_room_id') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Apply multiple room posts migration before post review quota';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='posts' AND column_name='pending_review_slot') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Post review quota migration already applied or incomplete';
  END IF;
  IF EXISTS (SELECT room_id FROM posts WHERE status='PENDING_REVIEW' GROUP BY room_id HAVING COUNT(*)>3) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Preflight: review rooms with more than 3 pending posts before migration';
  END IF;
END$$
CALL _v5_preflight_post_review_quota()$$
DROP PROCEDURE _v5_preflight_post_review_quota$$
DELIMITER ;
ALTER TABLE posts ADD COLUMN pending_review_slot TINYINT AFTER status;
CREATE TEMPORARY TABLE _v5_existing_pending_slots(id BIGINT PRIMARY KEY, slot TINYINT NOT NULL);
INSERT INTO _v5_existing_pending_slots SELECT id,ROW_NUMBER() OVER (PARTITION BY room_id ORDER BY created_at,id) FROM posts WHERE status='PENDING_REVIEW';
UPDATE posts p JOIN _v5_existing_pending_slots s ON s.id=p.id SET p.pending_review_slot=s.slot;
DROP TEMPORARY TABLE _v5_existing_pending_slots;
ALTER TABLE posts ADD UNIQUE KEY uq_posts_pending_slot(room_id,pending_review_slot),
  ADD CONSTRAINT ck_posts_pending_slot CHECK ((status='PENDING_REVIEW' AND pending_review_slot IS NOT NULL AND pending_review_slot BETWEEN 1 AND 3) OR (status<>'PENDING_REVIEW' AND pending_review_slot IS NULL));

-- BEGIN V5 POST REVIEW QUOTA 20261025
-- Three internal slots enforce the pending-review limit, including concurrent writes.
-- No limit applies to the total number of posts or to approved posts.
DELIMITER $$
CREATE PROCEDURE _v5_pending_post_slot(IN p_room BIGINT, IN p_exclude BIGINT, OUT p_slot TINYINT)
BEGIN
  DECLARE v_room BIGINT;
  SELECT id INTO v_room FROM rooms WHERE id=p_room FOR UPDATE;
  SELECT MIN(slots.slot) INTO p_slot FROM (SELECT 1 AS slot UNION ALL SELECT 2 UNION ALL SELECT 3) slots
    WHERE NOT EXISTS (SELECT 1 FROM posts p WHERE p.room_id=p_room AND p.pending_review_slot=slots.slot AND (p_exclude IS NULL OR p.id<>p_exclude));
  IF p_slot IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='A room may have at most 3 pending-review posts'; END IF;
END$$

CREATE TRIGGER trg_posts_pending_insert BEFORE INSERT ON posts FOR EACH ROW
BEGIN
  DECLARE v_slot TINYINT;
  IF NEW.status='PENDING_REVIEW' THEN
    CALL _v5_pending_post_slot(NEW.room_id,NULL,v_slot);
    SET NEW.pending_review_slot=v_slot;
  ELSE SET NEW.pending_review_slot=NULL; END IF;
END$$

CREATE TRIGGER trg_posts_pending_update BEFORE UPDATE ON posts FOR EACH ROW
BEGIN
  DECLARE v_room BIGINT; DECLARE v_slot TINYINT;
  IF OLD.status='PENDING_REVIEW' OR NEW.status='PENDING_REVIEW' THEN
    SELECT id INTO v_room FROM rooms WHERE id=LEAST(OLD.room_id,NEW.room_id) FOR UPDATE;
    IF OLD.room_id<>NEW.room_id THEN SELECT id INTO v_room FROM rooms WHERE id=GREATEST(OLD.room_id,NEW.room_id) FOR UPDATE; END IF;
  END IF;
  IF NEW.status='PENDING_REVIEW' THEN
    IF OLD.status='PENDING_REVIEW' AND OLD.room_id=NEW.room_id THEN SET NEW.pending_review_slot=OLD.pending_review_slot;
    ELSE CALL _v5_pending_post_slot(NEW.room_id,OLD.id,v_slot); SET NEW.pending_review_slot=v_slot; END IF;
  ELSE SET NEW.pending_review_slot=NULL; END IF;
END$$

-- API submits/resubmits through this routine for current reads after acquiring the room lock.
-- The UNIQUE/CHECK pair remains a hard upper bound even for direct writes or stale snapshots.
CREATE PROCEDURE sp_submit_post(IN p_post BIGINT, IN p_room BIGINT, IN p_actor BIGINT, IN p_title VARCHAR(200), IN p_content LONGTEXT, IN p_expected_version BIGINT, OUT p_result BIGINT)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_started BOOLEAN DEFAULT FALSE;
  DECLARE v_house BIGINT; DECLARE v_owner BIGINT; DECLARE v_post_room BIGINT; DECLARE v_version BIGINT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN IF v_started THEN ROLLBACK; END IF; RESIGNAL; END;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  START TRANSACTION; SET v_started=TRUE;
  SELECT r.house_id,h.landlord_id INTO v_house,v_owner FROM rooms r JOIN rental_houses h ON h.id=r.house_id WHERE r.id=p_room FOR UPDATE;
  IF v_owner IS NULL OR NOT (v_owner<=>p_actor) OR NOT EXISTS (SELECT 1 FROM users WHERE id=p_actor AND status='ACTIVE')
    OR NULLIF(TRIM(p_title),'') IS NULL OR NULLIF(TRIM(p_content),'') IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Invalid post owner, room or content'; END IF;
  IF p_post IS NULL THEN
    INSERT INTO posts(landlord_id,house_id,room_id,title,content,status) VALUES(p_actor,v_house,p_room,p_title,p_content,'PENDING_REVIEW');
    SET p_result=LAST_INSERT_ID();
  ELSE
    SELECT room_id,content_version INTO v_post_room,v_version FROM posts WHERE id=p_post AND landlord_id=p_actor FOR UPDATE;
    IF v_post_room IS NULL OR v_post_room<>p_room OR NOT (v_version<=>p_expected_version) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Post identity or content version has changed'; END IF;
    UPDATE posts SET title=p_title,content=p_content,status='PENDING_REVIEW',content_version=content_version+1,
      reviewed_by_id=NULL,reviewed_at=NULL,rejection_reason=NULL,updated_at=UTC_TIMESTAMP(6) WHERE id=p_post;
    SET p_result=p_post;
  END IF;
  COMMIT;
END$$
DELIMITER ;
-- END V5 POST REVIEW QUOTA 20261025
