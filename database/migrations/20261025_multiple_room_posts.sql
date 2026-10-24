-- Run once AFTER 20261025_contract_viewing_cleanup.sql. Stop writers and back up first.
-- One room may have multiple pending/approved posts. Preserve post IDs and all references.
USE room_rental_v5_20261023;
SET time_zone = '+00:00';
DELIMITER $$
DROP PROCEDURE IF EXISTS _v5_preflight_multiple_room_posts$$
CREATE PROCEDURE _v5_preflight_multiple_room_posts()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema=DATABASE() AND routine_name='sp_create_rental_contract' AND routine_comment='V5_CONTRACT_VIEWING_CLEANUP_20261025') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Apply contract viewing cleanup before multiple room posts';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='posts' AND index_name='uq_posts_live_room')
    OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='posts' AND column_name='live_room_id')
    OR EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='posts' AND index_name='ix_posts_room_status') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Multiple room posts migration already applied or incomplete';
  END IF;
END$$
CALL _v5_preflight_multiple_room_posts()$$
DROP PROCEDURE _v5_preflight_multiple_room_posts$$
DELIMITER ;
ALTER TABLE posts DROP INDEX uq_posts_live_room, DROP COLUMN live_room_id,
  ADD KEY ix_posts_room_status(room_id,status);
