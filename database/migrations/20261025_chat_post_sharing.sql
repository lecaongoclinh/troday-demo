-- Run once after the 20261024 V5 workflow upgrade, or on the previous 40-table schema.
-- Fresh schema.sql already includes this change. Stop writers and back up first.
-- No --force: stop at any error. No existing chat message is rewritten.
USE room_rental_v5_20261023;
SET time_zone = '+00:00';
DELIMITER $$
DROP PROCEDURE IF EXISTS _v5_preflight_chat_sharing$$
CREATE PROCEDURE _v5_preflight_chat_sharing()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='contract_representative_history') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Apply the V5 workflow migration before chat sharing';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='chat_messages' AND column_name='shared_post_id') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Chat sharing migration already applied or incomplete; do not rerun blindly';
  END IF;
END$$
CALL _v5_preflight_chat_sharing()$$
DROP PROCEDURE _v5_preflight_chat_sharing$$
DELIMITER ;

-- One atomic ALTER in MySQL 8; old TEXT/IMAGE/SYSTEM rows keep a NULL shared_post_id.
ALTER TABLE chat_messages
  ADD COLUMN shared_post_id BIGINT AFTER content,
  ADD KEY ix_messages_shared_post (shared_post_id),
  DROP CHECK ck_chat_messages_message_type,
  ADD CONSTRAINT ck_chat_messages_message_type CHECK (message_type IN ('TEXT','IMAGE','SYSTEM','POST_SHARE')),
  ADD CONSTRAINT ck_chat_messages_post_share CHECK ((message_type='POST_SHARE' AND shared_post_id IS NOT NULL) OR (message_type<>'POST_SHARE' AND shared_post_id IS NULL)),
  ADD CONSTRAINT fk_messages_shared_post FOREIGN KEY (shared_post_id) REFERENCES posts(id);
