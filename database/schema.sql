-- Current V5 schema (2026-10-25); 41 business/support tables, no AI storage.
-- CREATE A NEW DATABASE ONLY. This is not a Flyway migration or an upgrade script.
-- MySQL 8.0.16+ / InnoDB; recommended MySQL 8.4. Do not use --force when importing.
-- Never change the USE target to the old database; keep the existing migrations intact.
CREATE DATABASE `room_rental_v5_20261023` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE `room_rental_v5_20261023`;
SET time_zone = '+00:00';

-- Tài khoản chung; role là vai trò hiển thị, quyền thực tế lấy từ các bảng vai trò.
CREATE TABLE `users` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(150),
  `phone_number` VARCHAR(20),
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `role` VARCHAR(40) NOT NULL DEFAULT 'TENANT',
  `status` VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  `phone_verified_at` DATETIME(6),
  `locked_at` DATETIME(6),
  `in_app_enabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `email_enabled` BOOLEAN NOT NULL DEFAULT FALSE,
  `push_enabled` BOOLEAN NOT NULL DEFAULT FALSE,
  `lock_reason` VARCHAR(1000),
  `locked_by_id` BIGINT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uq_users_email` (`email`),
  UNIQUE KEY `uq_users_phone` (`phone_number`),
  KEY `ix_users_status` (`status`),
  CONSTRAINT `ck_users_role` CHECK (role IN ('TENANT', 'LANDLORD', 'ADMIN')),
  CONSTRAINT `ck_users_status` CHECK (status IN ('ACTIVE', 'LOCKED', 'DISABLED')),
  CONSTRAINT `ck_users_bool_in_app_enabled` CHECK (in_app_enabled IN (0,1)),
  CONSTRAINT `ck_users_bool_email_enabled` CHECK (email_enabled IN (0,1)),
  CONSTRAINT `ck_users_bool_push_enabled` CHECK (push_enabled IN (0,1)),
  CONSTRAINT `ck_users_contact` CHECK (email IS NOT NULL OR phone_number IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Một user có thể có nhiều dòng vai trò; không dùng kế thừa loại trừ nhau.
CREATE TABLE `tenants` (
  `id` BIGINT NOT NULL PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Một user có thể có nhiều dòng vai trò; không dùng kế thừa loại trừ nhau.
CREATE TABLE `landlords` (
  `id` BIGINT NOT NULL PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Một user có thể có nhiều dòng vai trò; không dùng kế thừa loại trừ nhau.
CREATE TABLE `admins` (
  `id` BIGINT NOT NULL PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Hồ sơ cá nhân; thông tin riêng tư không mặc định công khai.
CREATE TABLE `personal_profiles` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `avatar_file_id` BIGINT,
  `address` VARCHAR(500),
  `gender` VARCHAR(30),
  `occupation` VARCHAR(150),
  `university` VARCHAR(200),
  `bio` TEXT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uq_profiles_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Metadata file; kho file riêng tư. Ba FK ngữ cảnh hỗ trợ nhiều bằng chứng/ảnh/tài liệu chứng minh.
CREATE TABLE `files` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `owner_user_id` BIGINT NOT NULL,
  `storage_key` VARCHAR(500) NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(150) NOT NULL,
  `size_bytes` BIGINT NOT NULL,
  `sha256` CHAR(64) NOT NULL,
  `purpose` VARCHAR(40) NOT NULL,
  `visibility` VARCHAR(40) NOT NULL DEFAULT 'PRIVATE',
  `status` VARCHAR(40) NOT NULL DEFAULT 'STAGED',
  `report_id` BIGINT,
  `chat_message_id` BIGINT,
  `landlord_verification_id` BIGINT,
  `expires_at` DATETIME(6),
  `deleted_at` DATETIME(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uq_files_storage` (`storage_key`),
  KEY `ix_files_owner` (`owner_user_id`, `purpose`),
  CONSTRAINT `ck_files_purpose` CHECK (purpose IN ('AVATAR', 'POST_IMAGE', 'IDENTITY', 'LANDLORD_PROOF', 'CONTRACT', 'REPORT_EVIDENCE', 'CHAT_IMAGE')),
  CONSTRAINT `ck_files_visibility` CHECK (visibility IN ('PUBLIC', 'PRIVATE')),
  CONSTRAINT `ck_files_status` CHECK (status IN ('STAGED', 'ACTIVE', 'ARCHIVED', 'DELETED')),
  CONSTRAINT `ck_files_size` CHECK (size_bytes >= 0),
  CONSTRAINT `ck_files_parent_count` CHECK ((report_id IS NOT NULL) + (chat_message_id IS NOT NULL) + (landlord_verification_id IS NOT NULL) <= 1),
  CONSTRAINT `ck_files_private_documents` CHECK (purpose IN ('AVATAR','POST_IMAGE') OR visibility = 'PRIVATE')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Người nộp tham chiếu users vì chưa có quyền landlord; tài liệu quyền cho thuê liên kết qua files.
CREATE TABLE `landlord_verifications` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `applicant_user_id` BIGINT NOT NULL,
  `identity_number` VARCHAR(30) NOT NULL,
  `identity_file_id` BIGINT NOT NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  `rejection_reason` VARCHAR(1000),
  `reviewed_by_id` BIGINT,
  `reviewed_at` DATETIME(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `pending_applicant_id` BIGINT GENERATED ALWAYS AS (CASE WHEN status = 'PENDING' THEN applicant_user_id ELSE NULL END) STORED,
  UNIQUE KEY `uq_landlord_pending` (`pending_applicant_id`),
  KEY `ix_landlord_applicant` (`applicant_user_id`, `created_at`),
  CONSTRAINT `ck_landlord_verifications_status` CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN')),
  CONSTRAINT `ck_landlord_verifications_review` CHECK (status NOT IN ('APPROVED','REJECTED') OR (reviewed_by_id IS NOT NULL AND reviewed_at IS NOT NULL)),
  CONSTRAINT `ck_landlord_verifications_rejected` CHECK (status <> 'REJECTED' OR rejection_reason IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Xét căn cước tùy chọn; không tự cấp quyền chủ trọ hoặc xác thực nhà nước.
CREATE TABLE `tenant_identity_verifications` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` BIGINT NOT NULL,
  `identity_number` VARCHAR(30) NOT NULL,
  `identity_file_id` BIGINT NOT NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  `reviewed_by_id` BIGINT,
  `rejection_reason` VARCHAR(1000),
  `reviewed_at` DATETIME(6),
  `retention_until` DATETIME(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `pending_tenant_id` BIGINT GENERATED ALWAYS AS (CASE WHEN status = 'PENDING' THEN tenant_id ELSE NULL END) STORED,
  UNIQUE KEY `uq_tenant_identity_pending` (`pending_tenant_id`),
  KEY `ix_tenant_identity_tenant` (`tenant_id`, `created_at`),
  CONSTRAINT `ck_tenant_identity_verifications_status` CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN')),
  CONSTRAINT `ck_tenant_identity_verifications_review` CHECK (status NOT IN ('APPROVED','REJECTED') OR (reviewed_by_id IS NOT NULL AND reviewed_at IS NOT NULL)),
  CONSTRAINT `ck_tenant_identity_verifications_rejected` CHECK (status <> 'REJECTED' OR rejection_reason IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Phiên có thể thu hồi; JWT phải chứa session_key và máy chủ kiểm tra phiên mỗi request.
CREATE TABLE `auth_sessions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `session_key` CHAR(36) NOT NULL,
  `refresh_token_hash` CHAR(64),
  `expires_at` DATETIME(6) NOT NULL,
  `last_seen_at` DATETIME(6),
  `revoked_at` DATETIME(6),
  `revocation_reason` VARCHAR(500),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uq_sessions_key` (`session_key`),
  UNIQUE KEY `uq_sessions_refresh` (`refresh_token_hash`),
  KEY `ix_sessions_user` (`user_id`, `revoked_at`),
  CONSTRAINT `ck_auth_sessions_expiry` CHECK (expires_at > created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Mã dùng một lần: lưu HMAC/hash có bí mật máy chủ, không lưu OTP/token nguyên văn.
CREATE TABLE `verification_tokens` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `selector` CHAR(36) NOT NULL,
  `token_hash` CHAR(64) NOT NULL,
  `purpose` VARCHAR(40) NOT NULL,
  `target_value` VARCHAR(255),
  `target_room_tenant_id` BIGINT,
  `attempt_count` INT NOT NULL DEFAULT 0,
  `max_attempts` INT NOT NULL DEFAULT 5,
  `expires_at` DATETIME(6) NOT NULL,
  `consumed_at` DATETIME(6),
  `revoked_at` DATETIME(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uq_tokens_selector` (`selector`),
  KEY `ix_tokens_lookup` (`user_id`, `purpose`, `created_at`),
  KEY `ix_tokens_expiry` (`expires_at`),
  CONSTRAINT `ck_verification_tokens_purpose` CHECK (purpose IN ('PHONE_VERIFICATION', 'PASSWORD_RESET_OTP', 'PASSWORD_RESET_GRANT', 'OCCUPANT_LINK')),
  CONSTRAINT `ck_verification_tokens_attempts` CHECK (attempt_count >= 0 AND max_attempts > 0 AND attempt_count <= max_attempts),
  CONSTRAINT `ck_verification_tokens_expiry` CHECK (expires_at > created_at),
  CONSTRAINT `ck_verification_tokens_link_target` CHECK ((purpose = 'OCCUPANT_LINK' AND target_room_tenant_id IS NOT NULL) OR (purpose <> 'OCCUPANT_LINK' AND target_room_tenant_id IS NULL)),
  CONSTRAINT `ck_verification_tokens_phone_target` CHECK (purpose <> 'PHONE_VERIFICATION' OR target_value IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Tọa độ nhà dùng chung cho các phòng; giữ nguyên chuỗi địa chỉ để hiển thị.
CREATE TABLE `rental_houses` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `landlord_id` BIGINT NOT NULL,
  `address` VARCHAR(500) NOT NULL,
  `province_code` VARCHAR(30) NOT NULL,
  `locality_code` VARCHAR(30),
  `area_label` VARCHAR(150),
  `latitude` DECIMAL(10,7),
  `longitude` DECIMAL(10,7),
  `notes` VARCHAR(2000),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uq_houses_id_landlord` (`id`, `landlord_id`),
  KEY `ix_houses_landlord` (`landlord_id`),
  KEY `ix_houses_location` (`province_code`, `locality_code`),
  CONSTRAINT `ck_rental_houses_coordinates` CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Phòng và bảng giá tham khảo hiện tại; không dùng status để thay danh sách người ở.
CREATE TABLE `rooms` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `house_id` BIGINT NOT NULL,
  `room_number` VARCHAR(100) NOT NULL,
  `area` DECIMAL(10,2) NOT NULL,
  `rent_price` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `deposit_amount` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `max_occupants` INT NOT NULL,
  `allow_additional_occupants` BOOLEAN NOT NULL DEFAULT FALSE,
  `status` VARCHAR(40) NOT NULL DEFAULT 'AVAILABLE',
  `notes` VARCHAR(2000),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uq_rooms_number` (`house_id`, `room_number`),
  UNIQUE KEY `uq_rooms_id_house` (`id`, `house_id`),
  KEY `ix_rooms_status` (`status`),
  CONSTRAINT `ck_rooms_rent_price` CHECK (rent_price >= 0),
  CONSTRAINT `ck_rooms_deposit_amount` CHECK (deposit_amount >= 0),
  CONSTRAINT `ck_rooms_bool_allow_additional_occupants` CHECK (allow_additional_occupants IN (0,1)),
  CONSTRAINT `ck_rooms_status` CHECK (status IN ('AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE')),
  CONSTRAINT `ck_rooms_area` CHECK (area > 0),
  CONSTRAINT `ck_rooms_capacity` CHECK (max_occupants > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Danh mục dịch vụ mẫu toàn hệ thống; mỗi nhà có thể chọn mẫu hoặc tạo dịch vụ riêng.
CREATE TABLE `rental_services` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `unit` VARCHAR(30) NOT NULL,
  `default_calculation_method` VARCHAR(40) NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uq_services_name` (`name`),
  CONSTRAINT `ck_rental_services_default_calculation_method` CHECK (default_calculation_method IN ('METERED', 'PER_PERSON', 'PER_ROOM'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dịch vụ thuộc một nhà; tên, đơn vị và giá mặc định có thể khác giữa các nhà.
-- Không xóa vật lý dịch vụ đã từng được dùng; is_active chỉ dừng áp dụng về sau.
CREATE TABLE `house_services` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `house_id` BIGINT NOT NULL,
  `catalog_service_id` BIGINT,
  `name` VARCHAR(100) NOT NULL,
  `unit` VARCHAR(30) NOT NULL,
  `default_unit_price` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `default_calculation_method` VARCHAR(40) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uq_house_services_name` (`house_id`, `name`),
  UNIQUE KEY `uq_house_services_catalog` (`house_id`, `catalog_service_id`),
  UNIQUE KEY `uq_house_services_id_house` (`id`, `house_id`),
  CONSTRAINT `ck_house_services_default_unit_price` CHECK (default_unit_price >= 0),
  CONSTRAINT `ck_house_services_default_method` CHECK (default_calculation_method IN ('METERED', 'PER_PERSON', 'PER_ROOM')),
  CONSTRAINT `ck_house_services_bool_active` CHECK (is_active IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dịch vụ áp dụng cho từng phòng; NULL nghĩa là kế thừa cấu hình hiện tại của nhà.
-- Khi ngừng dùng tại phòng, đặt is_active = FALSE để giữ nguồn của hóa đơn lịch sử.
CREATE TABLE `room_services` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `room_id` BIGINT NOT NULL,
  `house_id` BIGINT NOT NULL,
  `house_service_id` BIGINT NOT NULL,
  `unit_price_override` DECIMAL(15,2),
  `calculation_method_override` VARCHAR(40),
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uq_room_services` (`room_id`, `house_service_id`),
  UNIQUE KEY `uq_room_services_id_room` (`id`, `room_id`),
  KEY `ix_room_services_room_house` (`room_id`, `house_id`),
  KEY `ix_room_services_house_service` (`house_service_id`, `house_id`),
  CONSTRAINT `ck_room_services_unit_price_override` CHECK (unit_price_override IS NULL OR unit_price_override >= 0),
  CONSTRAINT `ck_room_services_method_override` CHECK (calculation_method_override IS NULL OR calculation_method_override IN ('METERED', 'PER_PERSON', 'PER_ROOM')),
  CONSTRAINT `ck_room_services_bool_active` CHECK (is_active IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Chỉ tin cho thuê phòng; tình trạng còn phòng tách khỏi kiểm duyệt. Không có SHARED_SLOT.
CREATE TABLE `posts` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `landlord_id` BIGINT NOT NULL,
  `house_id` BIGINT NOT NULL,
  `room_id` BIGINT NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `content` TEXT,
  `status` VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  `availability_status` VARCHAR(40) NOT NULL DEFAULT 'STALE',
  `availability_confirmed_at` DATETIME(6),
  `availability_expires_at` DATETIME(6),
  `published_at` DATETIME(6),
  `reviewed_at` DATETIME(6),
  `hidden_at` DATETIME(6),
  `reviewed_by_id` BIGINT,
  `rejection_reason` VARCHAR(1000),
  `hidden_by_id` BIGINT,
  `hidden_reason` VARCHAR(1000),
  `content_version` BIGINT NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `live_room_id` BIGINT GENERATED ALWAYS AS (CASE WHEN status IN ('PENDING_REVIEW','APPROVED') THEN room_id ELSE NULL END) STORED,
  UNIQUE KEY `uq_posts_live_room` (`live_room_id`),
  UNIQUE KEY `uq_posts_id_room` (`id`, `room_id`),
  KEY `ix_posts_room_house` (`room_id`, `house_id`),
  KEY `ix_posts_house_landlord` (`house_id`, `landlord_id`),
  KEY `ix_posts_search` (`status`, `availability_status`, `availability_expires_at`),
  KEY `ix_posts_landlord` (`landlord_id`),
  CONSTRAINT `ck_posts_status` CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'HIDDEN')),
  CONSTRAINT `ck_posts_availability_status` CHECK (availability_status IN ('OPEN', 'FULL', 'STALE')),
  CONSTRAINT `ck_posts_version` CHECK (content_version > 0),
  CONSTRAINT `ck_posts_availability` CHECK (availability_status <> 'OPEN' OR (availability_confirmed_at IS NOT NULL AND availability_expires_at IS NOT NULL AND availability_expires_at > availability_confirmed_at))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Ảnh qua file do hệ thống quản lý hoặc URL HTTPS bên ngoài; đúng một nguồn.
CREATE TABLE `post_images` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `post_id` BIGINT NOT NULL,
  `file_id` BIGINT,
  `external_url` VARCHAR(500),
  `position` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uq_post_images_position` (`post_id`, `position`),
  UNIQUE KEY `uq_post_images_file` (`post_id`, `file_id`),
  UNIQUE KEY `uq_post_images_url` (`post_id`, `external_url`),
  CONSTRAINT `ck_post_images_source` CHECK ((file_id IS NOT NULL AND external_url IS NULL) OR (file_id IS NULL AND external_url IS NOT NULL)),
  CONSTRAINT `ck_post_images_position` CHECK (position >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Tiện ích của tin, dùng để hiển thị và lọc tìm kiếm.
CREATE TABLE `post_amenities` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `post_id` BIGINT NOT NULL,
  `amenity` VARCHAR(100) NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uq_post_amenities` (`post_id`, `amenity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Tin được người dùng chủ động lưu; không phải lịch sử hành vi để cá nhân hóa.
CREATE TABLE `favorite_posts` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `post_id` BIGINT NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uq_favorite_posts` (`user_id`, `post_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Khi đặt/đổi lịch: trong cùng giao dịch khóa rooms.id, kiểm tra khoảng giờ SCHEDULED giao nhau rồi mới ghi.
CREATE TABLE `room_viewing_requests` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `room_id` BIGINT NOT NULL,
  `house_id` BIGINT NOT NULL,
  `conversation_id` BIGINT NOT NULL,
  `tenant_id` BIGINT NOT NULL,
  `created_by_id` BIGINT NOT NULL,
  `starts_at` DATETIME(6) NOT NULL,
  `ends_at` DATETIME(6) NOT NULL,
  `notes` VARCHAR(2000),
  `status` VARCHAR(40) NOT NULL DEFAULT 'SCHEDULED',
  `attendance_confirmed_by_id` BIGINT,
  `attendance_confirmed_at` DATETIME(6),
  `cancelled_at` DATETIME(6),
  `cancelled_by_id` BIGINT,
  `cancellation_reason` VARCHAR(1000),
  `rental_decision` VARCHAR(40) NOT NULL DEFAULT 'WAITING',
  `rental_decided_by_id` BIGINT,
  `rental_decided_at` DATETIME(6),
  `rental_withdrawn_at` DATETIME(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uq_viewings_id_room` (`id`, `room_id`),
  UNIQUE KEY `uq_viewings_id_room_tenant` (`id`, `room_id`, `tenant_id`),
  KEY `ix_viewings_calendar` (`room_id`, `status`, `starts_at`, `ends_at`),
  KEY `ix_viewings_tenant` (`tenant_id`, `starts_at`),
  KEY `ix_viewings_room_house` (`room_id`, `house_id`),
  KEY `ix_viewings_house_creator` (`house_id`, `created_by_id`),
  KEY `ix_viewings_conversation_room` (`conversation_id`, `room_id`),
  KEY `ix_viewings_conversation_tenant` (`conversation_id`, `tenant_id`),
  KEY `ix_viewings_conversation_creator` (`conversation_id`, `created_by_id`),
  CONSTRAINT `ck_room_viewing_requests_status` CHECK (status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
  CONSTRAINT `ck_room_viewing_requests_rental_decision` CHECK (rental_decision IN ('WAITING', 'AGREED', 'DECLINED', 'WITHDRAWN')),
  CONSTRAINT `ck_room_viewing_requests_time_range` CHECK (ends_at > starts_at),
  CONSTRAINT `ck_room_viewing_requests_completed` CHECK (status <> 'COMPLETED' OR (attendance_confirmed_by_id IS NOT NULL AND attendance_confirmed_by_id = created_by_id AND attendance_confirmed_at IS NOT NULL)),
  CONSTRAINT `ck_room_viewing_requests_decision` CHECK ((rental_decision = 'WAITING' AND rental_decided_by_id IS NULL AND rental_decided_at IS NULL AND rental_withdrawn_at IS NULL) OR (rental_decision IN ('AGREED','DECLINED') AND status = 'COMPLETED' AND rental_decided_by_id IS NOT NULL AND rental_decided_by_id = tenant_id AND rental_decided_at IS NOT NULL AND rental_withdrawn_at IS NULL) OR (rental_decision = 'WITHDRAWN' AND status = 'COMPLETED' AND rental_decided_by_id IS NOT NULL AND rental_decided_by_id = tenant_id AND rental_decided_at IS NOT NULL AND rental_withdrawn_at IS NOT NULL AND rental_withdrawn_at >= rental_decided_at)),
  CONSTRAINT `ck_room_viewing_requests_cancelled` CHECK (status <> 'CANCELLED' OR (cancelled_at IS NOT NULL AND cancelled_by_id IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Mỗi dòng là một phiên bản mẫu; nội dung mẫu đã dùng không sửa đè.
-- Representative tenures are independent of signed contract revisions.
CREATE TABLE `contract_representative_history` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `contract_id` BIGINT NOT NULL,
  `room_tenant_id` BIGINT NOT NULL,
  `tenant_id` BIGINT,
  `name_snapshot` VARCHAR(150) NOT NULL,
  `event_type` VARCHAR(40) NOT NULL,
  `previous_history_id` BIGINT,
  `previous_room_tenant_id` BIGINT,
  `basis_revision_id` BIGINT,
  `started_at` DATETIME(6),
  `ended_at` DATETIME(6),
  `is_current` BOOLEAN NOT NULL DEFAULT TRUE,
  `recorded_by_id` BIGINT,
  `recorded_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `reason` VARCHAR(1000) NOT NULL,
  `consent_method` VARCHAR(40) NOT NULL,
  `consented_by_id` BIGINT,
  `consent_recorded_by_id` BIGINT,
  `consent_recorded_at` DATETIME(6),
  `consent_file_id` BIGINT,
  `ended_by_id` BIGINT,
  `end_reason` VARCHAR(1000),
  `current_contract_id` BIGINT GENERATED ALWAYS AS (CASE WHEN is_current = TRUE THEN contract_id ELSE NULL END) STORED,
  UNIQUE KEY `uq_rep_history_current` (`current_contract_id`),
  UNIQUE KEY `uq_rep_history_contract_id` (`contract_id`, `id`),
  KEY `ix_rep_history_timeline` (`contract_id`, `started_at`, `id`),
  KEY `ix_rep_history_member` (`contract_id`, `room_tenant_id`, `tenant_id`),
  CONSTRAINT `ck_rep_history_event` CHECK (event_type IN ('INITIAL','HANDOVER','LEGACY_BASELINE')),
  CONSTRAINT `ck_rep_history_bool` CHECK (is_current IN (0,1)),
  CONSTRAINT `ck_rep_history_dates` CHECK ((started_at IS NOT NULL OR event_type = 'LEGACY_BASELINE') AND (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at)),
  CONSTRAINT `ck_rep_history_period` CHECK ((is_current = TRUE AND ended_at IS NULL) OR (is_current = FALSE AND (ended_at IS NOT NULL OR event_type = 'LEGACY_BASELINE'))),
  CONSTRAINT `ck_rep_history_previous` CHECK (event_type <> 'HANDOVER' OR (previous_history_id IS NOT NULL AND previous_room_tenant_id IS NOT NULL AND previous_room_tenant_id <> room_tenant_id AND recorded_by_id IS NOT NULL)),
  CONSTRAINT `ck_rep_history_consent` CHECK (
    (event_type = 'LEGACY_BASELINE' AND consent_method = 'LEGACY_UNKNOWN' AND consented_by_id IS NULL AND consent_recorded_by_id IS NULL AND consent_recorded_at IS NULL)
    OR (event_type = 'INITIAL' AND consent_method = 'NOT_REQUIRED' AND consented_by_id IS NULL AND consent_recorded_by_id IS NULL AND consent_recorded_at IS NULL)
    OR (event_type = 'HANDOVER' AND tenant_id IS NOT NULL AND consent_recorded_at IS NOT NULL AND (
      (consent_method = 'LANDLORD_RECORDED' AND consented_by_id IS NULL AND consent_recorded_by_id IS NOT NULL)
      OR (consent_method = 'TENANT_ACCOUNT' AND consented_by_id IS NOT NULL AND consented_by_id = tenant_id)
    ))
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `contract_templates` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `created_by_id` BIGINT NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `version` INT NOT NULL,
  `content` LONGTEXT NOT NULL,
  `active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uq_contract_template_version` (`name`, `version`),
  CONSTRAINT `ck_contract_templates_bool_active` CHECK (active IN (0,1)),
  CONSTRAINT `ck_contract_templates_version` CHECK (version > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Đầu mối hợp đồng; đại diện là một room_tenants thuộc chính hợp đồng. DRAFT cho phép chưa gắn đại diện/phiên bản.
CREATE TABLE `contracts` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `contract_number` VARCHAR(100) NOT NULL,
  `room_id` BIGINT NOT NULL,
  `house_id` BIGINT NOT NULL,
  `landlord_id` BIGINT NOT NULL,
  `representative_room_tenant_id` BIGINT,
  `initial_representative_room_tenant_id` BIGINT,
  `current_revision_id` BIGINT,
  `viewing_id` BIGINT,
  `viewing_tenant_id` BIGINT,
  `previous_contract_id` BIGINT,
  `paper_document_file_id` BIGINT,
  `source` VARCHAR(40) NOT NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `rent_amount` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `deposit_amount` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `activated_at` DATETIME(6),
  `closed_at` DATETIME(6),
  `closure_reason` VARCHAR(1000),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `live_room_id` BIGINT GENERATED ALWAYS AS (CASE WHEN status IN ('DRAFT','PENDING_CONFIRMATION','CONFIRMED','ACTIVE') THEN room_id ELSE NULL END) STORED,
  `live_viewing_id` BIGINT GENERATED ALWAYS AS (CASE WHEN status IN ('DRAFT','PENDING_CONFIRMATION','CONFIRMED','ACTIVE') THEN viewing_id ELSE NULL END) STORED,
  UNIQUE KEY `uq_contract_number` (`contract_number`),
  UNIQUE KEY `uq_contract_id_room` (`id`, `room_id`),
  UNIQUE KEY `uq_contract_id_landlord` (`id`, `landlord_id`),
  UNIQUE KEY `uq_contract_id_room_previous` (`id`, `room_id`, `previous_contract_id`),
  UNIQUE KEY `uq_contract_live_room` (`live_room_id`),
  UNIQUE KEY `uq_contract_live_viewing` (`live_viewing_id`),
  KEY `ix_contract_landlord` (`landlord_id`, `status`),
  KEY `ix_contract_room_house` (`room_id`, `house_id`),
  KEY `ix_contract_house_landlord` (`house_id`, `landlord_id`),
  KEY `ix_contract_viewing_tenant` (`viewing_id`, `room_id`, `viewing_tenant_id`),
  KEY `ix_contract_initial_representative` (`id`, `initial_representative_room_tenant_id`, `viewing_tenant_id`),
  KEY `ix_contract_current_representative` (`id`, `representative_room_tenant_id`),
  CONSTRAINT `ck_contracts_source` CHECK (source IN ('NEW_RENTAL', 'PAPER_IMPORT', 'TRANSFER', 'REPLACEMENT')),
  CONSTRAINT `ck_contracts_status` CHECK (status IN ('DRAFT', 'PENDING_CONFIRMATION', 'CONFIRMED', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'CANCELLED')),
  CONSTRAINT `ck_contracts_rent_amount` CHECK (rent_amount >= 0),
  CONSTRAINT `ck_contracts_deposit_amount` CHECK (deposit_amount >= 0),
  CONSTRAINT `ck_contracts_dates` CHECK (end_date >= start_date),
  CONSTRAINT `ck_contracts_source_evidence` CHECK ((source = 'NEW_RENTAL' AND viewing_id IS NOT NULL AND viewing_tenant_id IS NOT NULL AND previous_contract_id IS NULL) OR (source = 'PAPER_IMPORT' AND viewing_id IS NULL AND viewing_tenant_id IS NULL AND previous_contract_id IS NULL AND paper_document_file_id IS NOT NULL) OR (source IN ('TRANSFER','REPLACEMENT') AND viewing_id IS NULL AND viewing_tenant_id IS NULL AND previous_contract_id IS NOT NULL)),
  CONSTRAINT `ck_contracts_representative` CHECK (status IN ('DRAFT','CANCELLED') OR (representative_room_tenant_id IS NOT NULL AND current_revision_id IS NOT NULL)),
  CONSTRAINT `ck_contracts_activated` CHECK (status <> 'ACTIVE' OR activated_at IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Một lượt thành viên gắn hợp đồng/phòng; tenant_id trống chỉ khi người nhập giấy chưa liên kết tài khoản. Vai trò đại diện suy từ contracts.
CREATE TABLE `room_tenants` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `contract_id` BIGINT NOT NULL,
  `room_id` BIGINT NOT NULL,
  `tenant_id` BIGINT,
  `full_name` VARCHAR(150) NOT NULL,
  `phone_number` VARCHAR(20),
  `identity_number` VARCHAR(30),
  `date_of_birth` DATE,
  `gender` VARCHAR(30),
  `permanent_address` VARCHAR(500),
  `status` VARCHAR(40) NOT NULL DEFAULT 'PLANNED',
  `intake_source` VARCHAR(40) NOT NULL,
  `join_request_id` BIGINT,
  `planned_move_in_date` DATE,
  `move_in_date` DATE,
  `move_out_date` DATE,
  `move_in_confirmed_by_id` BIGINT,
  `move_out_confirmed_by_id` BIGINT,
  `move_in_confirmed_at` DATETIME(6),
  `move_out_confirmed_at` DATETIME(6),
  `account_linked_at` DATETIME(6),
  `account_linked_by_id` BIGINT,
  `cancellation_reason` VARCHAR(1000),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `active_tenant_id` BIGINT GENERATED ALWAYS AS (CASE WHEN status = 'ACTIVE' THEN tenant_id ELSE NULL END) STORED,
  `open_tenant_id` BIGINT GENERATED ALWAYS AS (CASE WHEN status IN ('PLANNED','ACTIVE') THEN tenant_id ELSE NULL END) STORED,
  UNIQUE KEY `uq_occupants_contract_id` (`contract_id`, `id`),
  UNIQUE KEY `uq_occupants_contract_id_tenant` (`contract_id`, `id`, `tenant_id`),
  UNIQUE KEY `uq_occupants_review_evidence` (`id`, `contract_id`, `room_id`, `tenant_id`),
  UNIQUE KEY `uq_occupants_id_tenant` (`id`, `tenant_id`),
  UNIQUE KEY `uq_occupants_join_completion` (`join_request_id`, `contract_id`, `tenant_id`, `id`),
  UNIQUE KEY `uq_occupants_active_account` (`active_tenant_id`),
  UNIQUE KEY `uq_occupants_open_member` (`contract_id`, `open_tenant_id`),
  UNIQUE KEY `uq_occupants_join_request` (`join_request_id`),
  KEY `ix_occupants_export` (`room_id`, `status`, `move_in_date`, `move_out_date`),
  KEY `ix_occupants_move_in_owner` (`contract_id`, `move_in_confirmed_by_id`),
  KEY `ix_occupants_move_out_owner` (`contract_id`, `move_out_confirmed_by_id`),
  CONSTRAINT `ck_room_tenants_status` CHECK (status IN ('PLANNED', 'ACTIVE', 'LEFT', 'CANCELLED')),
  CONSTRAINT `ck_room_tenants_intake_source` CHECK (intake_source IN ('INITIAL_CONTRACT', 'APPROVED_JOIN', 'PAPER_IMPORT', 'TRANSFER')),
  CONSTRAINT `ck_room_tenants_stay_dates` CHECK ((status = 'PLANNED' AND planned_move_in_date IS NOT NULL AND move_in_date IS NULL AND move_out_date IS NULL) OR (status = 'ACTIVE' AND move_in_date IS NOT NULL AND move_out_date IS NULL) OR (status = 'LEFT' AND move_in_date IS NOT NULL AND move_out_date IS NOT NULL AND move_out_date >= move_in_date) OR (status = 'CANCELLED' AND move_in_date IS NULL AND move_out_date IS NULL)),
  CONSTRAINT `ck_room_tenants_join_source` CHECK ((intake_source = 'APPROVED_JOIN' AND join_request_id IS NOT NULL AND tenant_id IS NOT NULL) OR (intake_source <> 'APPROVED_JOIN' AND join_request_id IS NULL)),
  CONSTRAINT `ck_room_tenants_confirmed_stay` CHECK (status NOT IN ('ACTIVE','LEFT') OR (move_in_confirmed_by_id IS NOT NULL AND move_in_confirmed_at IS NOT NULL)),
  CONSTRAINT `ck_room_tenants_confirmed_left` CHECK (status <> 'LEFT' OR (move_out_confirmed_by_id IS NOT NULL AND move_out_confirmed_at IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Phiên bản nội dung và xác nhận riêng; snapshot thành viên/giá không sửa sau khi gửi. PAPER_IMPORT không giả xác nhận tài khoản.
CREATE TABLE `contract_revisions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `contract_id` BIGINT NOT NULL,
  `revision_number` INT NOT NULL,
  `template_id` BIGINT,
  `created_by_id` BIGINT NOT NULL,
  `kind` VARCHAR(40) NOT NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `effective_from` DATE NOT NULL,
  `rent_amount` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `deposit_amount` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `content` LONGTEXT NOT NULL,
  `members_snapshot` JSON NOT NULL,
  `service_terms_snapshot` JSON,
  `document_file_id` BIGINT,
  `representative_room_tenant_id` BIGINT NOT NULL,
  `landlord_confirmed_by_id` BIGINT,
  `tenant_confirmed_by_id` BIGINT,
  `landlord_confirmed_at` DATETIME(6),
  `tenant_confirmed_at` DATETIME(6),
  `sent_at` DATETIME(6),
  `applied_at` DATETIME(6),
  `tenant_feedback` VARCHAR(2000),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uq_revisions_number` (`contract_id`, `revision_number`),
  UNIQUE KEY `uq_revisions_contract_id` (`contract_id`, `id`),
  KEY `ix_revisions_landlord_confirmation` (`contract_id`, `landlord_confirmed_by_id`),
  KEY `ix_revisions_tenant_confirmation` (`representative_room_tenant_id`, `tenant_confirmed_by_id`),
  CONSTRAINT `ck_contract_revisions_kind` CHECK (kind IN ('INITIAL', 'RENEWAL', 'TERMINATION', 'TRANSFER', 'REPLACEMENT', 'PAPER_IMPORT')),
  CONSTRAINT `ck_contract_revisions_status` CHECK (status IN ('DRAFT', 'PENDING_CONFIRMATION', 'CONFIRMED', 'IMPORTED', 'SUPERSEDED', 'CANCELLED')),
  CONSTRAINT `ck_contract_revisions_rent_amount` CHECK (rent_amount >= 0),
  CONSTRAINT `ck_contract_revisions_deposit_amount` CHECK (deposit_amount >= 0),
  CONSTRAINT `ck_contract_revisions_number` CHECK (revision_number > 0),
  CONSTRAINT `ck_contract_revisions_dates` CHECK (end_date >= start_date),
  CONSTRAINT `ck_contract_revisions_confirmed` CHECK (status <> 'CONFIRMED' OR (landlord_confirmed_by_id IS NOT NULL AND landlord_confirmed_at IS NOT NULL AND tenant_confirmed_by_id IS NOT NULL AND tenant_confirmed_at IS NOT NULL)),
  CONSTRAINT `ck_contract_revisions_imported` CHECK (status <> 'IMPORTED' OR (kind = 'PAPER_IMPORT' AND document_file_id IS NOT NULL AND tenant_confirmed_by_id IS NULL AND tenant_confirmed_at IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Yêu cầu điều chỉnh, xác nhận và áp dụng; đổi phòng trả result_contract_id thay vì đổi room_id của hợp đồng cũ.
CREATE TABLE `contract_change_requests` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `contract_id` BIGINT NOT NULL,
  `requested_by_id` BIGINT NOT NULL,
  `representative_room_tenant_id` BIGINT NOT NULL,
  `base_revision_id` BIGINT NOT NULL,
  `proposed_revision_id` BIGINT,
  `target_room_id` BIGINT,
  `result_contract_id` BIGINT,
  `type` VARCHAR(40) NOT NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  `requested_effective_date` DATE NOT NULL,
  `proposal_snapshot` JSON NOT NULL,
  `message` VARCHAR(2000),
  `reviewed_by_id` BIGINT,
  `rejection_reason` VARCHAR(1000),
  `tenant_confirmed_by_id` BIGINT,
  `applied_by_id` BIGINT,
  `reviewed_at` DATETIME(6),
  `tenant_confirmed_at` DATETIME(6),
  `applied_at` DATETIME(6),
  `expires_at` DATETIME(6),
  `cancelled_at` DATETIME(6),
  `cancelled_by_id` BIGINT,
  `cancellation_reason` VARCHAR(1000),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `open_contract_id` BIGINT GENERATED ALWAYS AS (CASE WHEN status IN ('PENDING','APPROVED_WAITING_CONFIRMATION','READY_TO_APPLY') THEN contract_id ELSE NULL END) STORED,
  UNIQUE KEY `uq_change_open_contract` (`open_contract_id`),
  KEY `ix_changes_contract` (`contract_id`, `created_at`),
  KEY `ix_changes_requester_rep` (`representative_room_tenant_id`, `requested_by_id`),
  KEY `ix_changes_tenant_confirmation` (`representative_room_tenant_id`, `tenant_confirmed_by_id`),
  KEY `ix_changes_transfer_result` (`result_contract_id`, `target_room_id`, `contract_id`),
  KEY `ix_changes_owner_review` (`contract_id`, `reviewed_by_id`),
  KEY `ix_changes_owner_apply` (`contract_id`, `applied_by_id`),
  CONSTRAINT `ck_contract_change_requests_type` CHECK (type IN ('RENEWAL', 'TERMINATION', 'TRANSFER')),
  CONSTRAINT `ck_contract_change_requests_status` CHECK (status IN ('PENDING', 'APPROVED_WAITING_CONFIRMATION', 'READY_TO_APPLY', 'COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED')),
  CONSTRAINT `ck_contract_change_requests_target` CHECK ((type = 'TRANSFER' AND target_room_id IS NOT NULL) OR (type <> 'TRANSFER' AND target_room_id IS NULL)),
  CONSTRAINT `ck_contract_change_requests_result_type` CHECK (type = 'TRANSFER' OR result_contract_id IS NULL),
  CONSTRAINT `ck_contract_change_requests_rejected` CHECK (status <> 'REJECTED' OR (rejection_reason IS NOT NULL AND reviewed_by_id IS NOT NULL AND reviewed_at IS NOT NULL)),
  CONSTRAINT `ck_contract_change_requests_ready` CHECK (status NOT IN ('READY_TO_APPLY','COMPLETED') OR (reviewed_by_id IS NOT NULL AND reviewed_at IS NOT NULL AND tenant_confirmed_by_id IS NOT NULL AND tenant_confirmed_at IS NOT NULL)),
  CONSTRAINT `ck_contract_change_requests_completed` CHECK (status <> 'COMPLETED' OR (applied_by_id IS NOT NULL AND applied_at IS NOT NULL AND (type <> 'TRANSFER' OR result_contract_id IS NOT NULL)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Đủ đồng thuận rồi chủ trọ xét; APPROVED chỉ giữ chỗ có hạn, COMPLETED mới liên kết lượt vào ở.
CREATE TABLE `occupant_join_requests` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `contract_id` BIGINT NOT NULL,
  `source_roommate_request_id` BIGINT,
  `applicant_id` BIGINT NOT NULL,
  `requested_by_id` BIGINT NOT NULL,
  `representative_room_tenant_id` BIGINT NOT NULL,
  `planned_move_in_date` DATE NOT NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'PENDING_CONSENT',
  `representative_consented_by_id` BIGINT,
  `representative_consented_at` DATETIME(6),
  `applicant_consented_by_id` BIGINT,
  `applicant_consented_at` DATETIME(6),
  `reviewed_at` DATETIME(6),
  `hold_expires_at` DATETIME(6),
  `completed_at` DATETIME(6),
  `cancelled_at` DATETIME(6),
  `cancelled_by_id` BIGINT,
  `cancellation_reason` VARCHAR(1000),
  `reviewed_by_id` BIGINT,
  `rejection_reason` VARCHAR(1000),
  `completed_room_tenant_id` BIGINT,
  `message` VARCHAR(2000),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `open_applicant_id` BIGINT GENERATED ALWAYS AS (CASE WHEN status IN ('PENDING_CONSENT','PENDING_LANDLORD','APPROVED') THEN applicant_id ELSE NULL END) STORED,
  UNIQUE KEY `uq_join_applicant_open` (`contract_id`, `open_applicant_id`),
  UNIQUE KEY `uq_join_evidence` (`id`, `contract_id`, `applicant_id`),
  UNIQUE KEY `uq_join_completed_occupant` (`completed_room_tenant_id`),
  KEY `ix_join_hold` (`status`, `hold_expires_at`),
  KEY `ix_join_source_roommate` (`source_roommate_request_id`, `contract_id`),
  KEY `ix_join_representative_consent` (`representative_room_tenant_id`, `representative_consented_by_id`),
  KEY `ix_join_owner_review` (`contract_id`, `reviewed_by_id`),
  CONSTRAINT `ck_occupant_join_requests_status` CHECK (status IN ('PENDING_CONSENT', 'PENDING_LANDLORD', 'APPROVED', 'COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED')),
  CONSTRAINT `ck_occupant_join_requests_different_people` CHECK (applicant_id <> requested_by_id),
  CONSTRAINT `ck_occupant_join_requests_representative_consent` CHECK ((representative_consented_by_id IS NULL AND representative_consented_at IS NULL) OR (representative_consented_by_id IS NOT NULL AND representative_consented_at IS NOT NULL)),
  CONSTRAINT `ck_occupant_join_requests_applicant_consent` CHECK ((applicant_consented_by_id IS NULL AND applicant_consented_at IS NULL) OR (applicant_consented_by_id IS NOT NULL AND applicant_consented_by_id = applicant_id AND applicant_consented_at IS NOT NULL)),
  CONSTRAINT `ck_occupant_join_requests_consents` CHECK (status NOT IN ('PENDING_LANDLORD','APPROVED','COMPLETED') OR (representative_consented_by_id IS NOT NULL AND applicant_consented_by_id IS NOT NULL)),
  CONSTRAINT `ck_occupant_join_requests_approved` CHECK (status NOT IN ('APPROVED','COMPLETED') OR (reviewed_by_id IS NOT NULL AND reviewed_at IS NOT NULL AND hold_expires_at IS NOT NULL AND hold_expires_at > reviewed_at)),
  CONSTRAINT `ck_occupant_join_requests_rejected` CHECK (status <> 'REJECTED' OR (reviewed_by_id IS NOT NULL AND reviewed_at IS NOT NULL AND rejection_reason IS NOT NULL)),
  CONSTRAINT `ck_occupant_join_requests_completed` CHECK ((status = 'COMPLETED' AND completed_room_tenant_id IS NOT NULL AND completed_at IS NOT NULL) OR (status <> 'COMPLETED' AND completed_room_tenant_id IS NULL AND completed_at IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Ba tình trạng nhà ở; trọ ngoài chỉ là ngữ cảnh tự khai tối thiểu, không có hồ sơ quản lý trọ ngoài.
CREATE TABLE `roommate_profiles` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` BIGINT NOT NULL,
  `housing_status` VARCHAR(40) NOT NULL,
  `current_room_tenant_id` BIGINT,
  `external_context` VARCHAR(1000),
  `available_from` DATE NOT NULL,
  `budget_min` DECIMAL(15,2),
  `budget_max` DECIMAL(15,2),
  `preferred_location` VARCHAR(500),
  `preferred_gender` VARCHAR(30),
  `requirements_snapshot` JSON,
  `profile_version` BIGINT NOT NULL DEFAULT 1,
  `active` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uq_roommate_profile_tenant` (`tenant_id`),
  KEY `ix_roommate_profiles_active` (`active`, `housing_status`),
  CONSTRAINT `ck_roommate_profiles_housing_status` CHECK (housing_status IN ('NO_ACCOMMODATION', 'IN_SYSTEM', 'EXTERNAL')),
  CONSTRAINT `ck_roommate_profiles_budget_min` CHECK (budget_min >= 0),
  CONSTRAINT `ck_roommate_profiles_budget_max` CHECK (budget_max >= 0),
  CONSTRAINT `ck_roommate_profiles_bool_active` CHECK (active IN (0,1)),
  CONSTRAINT `ck_roommate_profiles_housing` CHECK ((housing_status = 'IN_SYSTEM' AND current_room_tenant_id IS NOT NULL AND external_context IS NULL) OR (housing_status <> 'IN_SYSTEM' AND current_room_tenant_id IS NULL)),
  CONSTRAINT `ck_roommate_profiles_budget` CHECK (budget_min IS NULL OR budget_max IS NULL OR budget_max >= budget_min),
  CONSTRAINT `ck_roommate_profiles_version` CHECK (profile_version > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Danh mục tiêu chí và thói quen do người thuê khai báo để tìm bạn ở ghép.
CREATE TABLE `lifestyle_criteria` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(80) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `value_type` VARCHAR(40) NOT NULL,
  `allowed_values` JSON,
  `active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uq_lifestyle_code` (`code`),
  CONSTRAINT `ck_lifestyle_criteria_value_type` CHECK (value_type IN ('BOOLEAN', 'NUMBER', 'CATEGORY', 'TIME', 'RANGE')),
  CONSTRAINT `ck_lifestyle_criteria_bool_active` CHECK (active IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Giá trị của bản thân, mong muốn và mức độ quan trọng của từng tiêu chí.
CREATE TABLE `profile_lifestyles` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `profile_id` BIGINT NOT NULL,
  `criterion_id` BIGINT NOT NULL,
  `self_value` JSON,
  `preferred_value` JSON,
  `is_mandatory` BOOLEAN NOT NULL DEFAULT FALSE,
  `importance` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uq_profile_lifestyle` (`profile_id`, `criterion_id`),
  CONSTRAINT `ck_profile_lifestyles_bool_is_mandatory` CHECK (is_mandatory IN (0,1)),
  CONSTRAINT `ck_profile_lifestyles_values` CHECK (self_value IS NOT NULL OR preferred_value IS NOT NULL),
  CONSTRAINT `ck_profile_lifestyles_mandatory` CHECK (is_mandatory = FALSE OR preferred_value IS NOT NULL),
  CONSTRAINT `ck_profile_lifestyles_importance` CHECK (importance BETWEEN 0 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Lời mời kết nối giữa hai người; không phải yêu cầu chủ trọ tiếp nhận.
CREATE TABLE `roommate_requests` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `sender_id` BIGINT NOT NULL,
  `receiver_id` BIGINT NOT NULL,
  `scenario` VARCHAR(40) NOT NULL,
  `target_contract_id` BIGINT,
  `status` VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  `message` VARCHAR(2000),
  `responded_at` DATETIME(6),
  `ended_at` DATETIME(6),
  `end_reason` VARCHAR(1000),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `pair_low_id` BIGINT GENERATED ALWAYS AS (LEAST(sender_id, receiver_id)) STORED,
  `pair_high_id` BIGINT GENERATED ALWAYS AS (GREATEST(sender_id, receiver_id)) STORED,
  `open_pair_key` INT GENERATED ALWAYS AS (CASE WHEN status = 'PENDING' OR (status = 'ACCEPTED' AND ended_at IS NULL) THEN 1 ELSE NULL END) STORED,
  UNIQUE KEY `uq_roommate_open_pair` (`pair_low_id`, `pair_high_id`, `open_pair_key`),
  UNIQUE KEY `uq_roommate_request_contract` (`id`, `target_contract_id`),
  KEY `ix_roommate_requests_receiver` (`receiver_id`, `status`, `created_at`),
  CONSTRAINT `ck_roommate_requests_scenario` CHECK (scenario IN ('SEARCH_TOGETHER', 'JOIN_SYSTEM_ROOM', 'JOIN_EXTERNAL_HOME')),
  CONSTRAINT `ck_roommate_requests_status` CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')),
  CONSTRAINT `ck_roommate_requests_different_people` CHECK (sender_id <> receiver_id),
  CONSTRAINT `ck_roommate_requests_scenario_context` CHECK ((scenario = 'JOIN_SYSTEM_ROOM' AND target_contract_id IS NOT NULL) OR (scenario <> 'JOIN_SYSTEM_ROOM' AND target_contract_id IS NULL)),
  CONSTRAINT `ck_roommate_requests_ended` CHECK (ended_at IS NULL OR status = 'ACCEPTED')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Người trả được chốt tại kỳ; từng khoản tiền nằm trong invoice_items.
-- DRAFT cho phép thêm dòng trước khi phát hành. Một bản chưa hủy cho mỗi hợp đồng/tháng.
CREATE TABLE `invoices` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `contract_id` BIGINT NOT NULL,
  `room_id` BIGINT NOT NULL,
  `contract_revision_id` BIGINT NOT NULL,
  `payer_room_tenant_id` BIGINT NOT NULL,
  `payer_snapshot` JSON NOT NULL,
  `billing_period` DATE NOT NULL,
  `due_date` DATE NOT NULL,
  `occupant_count_at_billing` INT NOT NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  `created_by_id` BIGINT NOT NULL,
  `paid_by_id` BIGINT,
  `cancelled_by_id` BIGINT,
  `cancellation_reason` VARCHAR(1000),
  `replacement_of_id` BIGINT,
  `paid_at` DATETIME(6),
  `cancelled_at` DATETIME(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `open_period_key` INT GENERATED ALWAYS AS (CASE WHEN status <> 'CANCELLED' THEN 1 ELSE NULL END) STORED,
  UNIQUE KEY `uq_invoice_open_period` (`contract_id`, `billing_period`, `open_period_key`),
  UNIQUE KEY `uq_invoice_replacement_context` (`id`, `contract_id`, `billing_period`),
  UNIQUE KEY `uq_invoice_id_room` (`id`, `room_id`),
  KEY `ix_invoice_status` (`status`, `due_date`),
  CONSTRAINT `ck_invoices_status` CHECK (status IN ('DRAFT', 'UNPAID', 'PAID', 'OVERDUE', 'CANCELLED')),
  CONSTRAINT `ck_invoices_period` CHECK (DAY(billing_period) = 1),
  CONSTRAINT `ck_invoices_occupant_count` CHECK (occupant_count_at_billing >= 0),
  CONSTRAINT `ck_invoices_paid` CHECK ((status = 'PAID' AND paid_by_id IS NOT NULL AND paid_at IS NOT NULL) OR (status <> 'PAID' AND paid_by_id IS NULL AND paid_at IS NULL)),
  CONSTRAINT `ck_invoices_cancelled` CHECK (status <> 'CANCELLED' OR (cancelled_by_id IS NOT NULL AND cancelled_at IS NOT NULL AND cancellation_reason IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Snapshot bất biến sau phát hành: tiền thuê, điện/nước/dịch vụ, khoản khác và giảm trừ.
-- Chỉ dòng SERVICE mới tham chiếu cấu hình phòng; các giá trị snapshot giữ nguyên khi giá dịch vụ đổi.
CREATE TABLE `invoice_items` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `invoice_id` BIGINT NOT NULL,
  `room_id` BIGINT NOT NULL,
  `room_service_id` BIGINT,
  `position` INT NOT NULL,
  `item_type` VARCHAR(40) NOT NULL,
  `name_snapshot` VARCHAR(200) NOT NULL,
  `unit_snapshot` VARCHAR(30) NOT NULL,
  `calculation_method_snapshot` VARCHAR(40),
  `quantity` DECIMAL(12,3) NOT NULL,
  `unit_price_snapshot` DECIMAL(15,2) NOT NULL,
  `previous_reading` DECIMAL(12,3),
  `current_reading` DECIMAL(12,3),
  `amount` DECIMAL(15,2) NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uq_invoice_items_position` (`invoice_id`, `position`),
  UNIQUE KEY `uq_invoice_items_service` (`invoice_id`, `room_service_id`),
  KEY `ix_invoice_items_invoice_room` (`invoice_id`, `room_id`),
  KEY `ix_invoice_items_room_service` (`room_service_id`, `room_id`),
  CONSTRAINT `ck_invoice_items_position` CHECK (position >= 0),
  CONSTRAINT `ck_invoice_items_type` CHECK (item_type IN ('RENT', 'SERVICE', 'OTHER', 'DISCOUNT')),
  CONSTRAINT `ck_invoice_items_source` CHECK ((item_type = 'SERVICE' AND room_service_id IS NOT NULL AND calculation_method_snapshot IS NOT NULL AND calculation_method_snapshot IN ('METERED', 'PER_PERSON', 'PER_ROOM')) OR (item_type <> 'SERVICE' AND room_service_id IS NULL AND calculation_method_snapshot IS NULL)),
  CONSTRAINT `ck_invoice_items_price` CHECK (quantity >= 0 AND unit_price_snapshot >= 0 AND amount = ROUND(quantity * unit_price_snapshot, 2)),
  CONSTRAINT `ck_invoice_items_meter` CHECK ((item_type = 'SERVICE' AND calculation_method_snapshot = 'METERED' AND previous_reading IS NOT NULL AND current_reading IS NOT NULL AND previous_reading >= 0 AND current_reading >= previous_reading AND quantity = current_reading - previous_reading) OR ((item_type <> 'SERVICE' OR calculation_method_snapshot <> 'METERED') AND previous_reading IS NULL AND current_reading IS NULL)),
  CONSTRAINT `ck_invoice_items_quantity` CHECK ((item_type <> 'SERVICE' OR calculation_method_snapshot <> 'PER_ROOM' OR quantity = 1) AND (item_type <> 'SERVICE' OR calculation_method_snapshot <> 'PER_PERSON' OR quantity = FLOOR(quantity)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Chỉ người có lượt thực tế ở được đánh giá. Chủ trọ không duyệt/xác nhận đánh giá sau xem.
CREATE TABLE `reviews` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `reviewer_id` BIGINT NOT NULL,
  `room_id` BIGINT NOT NULL,
  `contract_id` BIGINT NOT NULL,
  `room_tenant_id` BIGINT NOT NULL,
  `rating` TINYINT NOT NULL,
  `content` TEXT,
  `status` VARCHAR(40) NOT NULL DEFAULT 'PUBLISHED',
  `hidden_by_id` BIGINT,
  `hidden_reason` VARCHAR(1000),
  `hidden_at` DATETIME(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uq_review_tenancy` (`reviewer_id`, `room_id`, `contract_id`),
  KEY `ix_reviews_room` (`room_id`, `status`),
  CONSTRAINT `ck_reviews_status` CHECK (status IN ('PUBLISHED', 'HIDDEN', 'DELETED')),
  CONSTRAINT `ck_reviews_rating` CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Hội thoại hỏi thuê hoặc gắn kết nối ở ghép; đọc/gửi theo thành viên.
CREATE TABLE `conversations` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `type` VARCHAR(40) NOT NULL,
  `room_id` BIGINT,
  `post_id` BIGINT,
  `roommate_request_id` BIGINT,
  `last_message_id` BIGINT,
  `last_message_at` DATETIME(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uq_conversation_roommate` (`roommate_request_id`),
  UNIQUE KEY `uq_conversation_id_room` (`id`, `room_id`),
  KEY `ix_conversation_post_room` (`post_id`, `room_id`),
  CONSTRAINT `ck_conversations_type` CHECK (type IN ('ROOM_INQUIRY', 'ROOMMATE')),
  CONSTRAINT `ck_conversations_context` CHECK ((type = 'ROOM_INQUIRY' AND room_id IS NOT NULL AND post_id IS NOT NULL AND roommate_request_id IS NULL) OR (type = 'ROOMMATE' AND roommate_request_id IS NOT NULL AND room_id IS NULL AND post_id IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Trạng thái đọc/ẩn/tắt thông báo theo từng người; không xóa tin của người còn lại.
CREATE TABLE `conversation_participants` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `conversation_id` BIGINT NOT NULL,
  `user_id` BIGINT NOT NULL,
  `joined_at` DATETIME(6) NOT NULL,
  `last_read_at` DATETIME(6),
  `left_at` DATETIME(6),
  `muted` BOOLEAN NOT NULL DEFAULT FALSE,
  `archived` BOOLEAN NOT NULL DEFAULT FALSE,
  `deleted` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uq_conversation_member` (`conversation_id`, `user_id`),
  CONSTRAINT `ck_conversation_participants_bool_muted` CHECK (muted IN (0,1)),
  CONSTRAINT `ck_conversation_participants_bool_archived` CHECK (archived IN (0,1)),
  CONSTRAINT `ck_conversation_participants_bool_deleted` CHECK (deleted IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Tin đã lưu; client_message_key chống gửi lặp. Ảnh đính kèm qua files.chat_message_id.
CREATE TABLE `chat_messages` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `conversation_id` BIGINT NOT NULL,
  `sender_id` BIGINT NOT NULL,
  `client_message_key` CHAR(36) NOT NULL,
  `message_type` VARCHAR(40) NOT NULL DEFAULT 'TEXT',
  `content` TEXT,
  `shared_post_id` BIGINT,
  `sent_at` DATETIME(6) NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uq_message_client_key` (`sender_id`, `client_message_key`),
  UNIQUE KEY `uq_messages_conversation_id` (`conversation_id`, `id`),
  KEY `ix_messages_time` (`conversation_id`, `sent_at`, `id`),
  KEY `ix_messages_shared_post` (`shared_post_id`),
  CONSTRAINT `ck_chat_messages_message_type` CHECK (message_type IN ('TEXT', 'IMAGE', 'SYSTEM', 'POST_SHARE')),
  CONSTRAINT `ck_chat_messages_post_share` CHECK ((message_type = 'POST_SHARE' AND shared_post_id IS NOT NULL) OR (message_type <> 'POST_SHARE' AND shared_post_id IS NULL)),
  CONSTRAINT `ck_chat_messages_text` CHECK (message_type <> 'TEXT' OR content IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Feed thông báo trong ứng dụng; đọc không thay xác nhận nghiệp vụ.
CREATE TABLE `notifications` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `type` VARCHAR(60) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `content` TEXT NOT NULL,
  `resource_type` VARCHAR(60),
  `resource_id` BIGINT,
  `event_key` VARCHAR(150) NOT NULL,
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
  `read_at` DATETIME(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uq_notification_event` (`user_id`, `event_key`),
  KEY `ix_notifications_feed` (`user_id`, `is_read`, `created_at`),
  CONSTRAINT `ck_notifications_bool_is_read` CHECK (is_read IN (0,1)),
  CONSTRAINT `ck_notifications_resource` CHECK ((resource_type IS NULL AND resource_id IS NULL) OR (resource_type IS NOT NULL AND resource_id IS NOT NULL)),
  CONSTRAINT `ck_notifications_read` CHECK ((is_read = FALSE AND read_at IS NULL) OR (is_read = TRUE AND read_at IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Một đối tượng chính mỗi báo cáo; bằng chứng qua files.report_id. Tranh chấp không tự đóng hợp đồng.
CREATE TABLE `reports` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `reporter_id` BIGINT NOT NULL,
  `type` VARCHAR(40) NOT NULL,
  `reported_user_id` BIGINT,
  `reported_post_id` BIGINT,
  `contract_id` BIGINT,
  `roommate_request_id` BIGINT,
  `reason` TEXT NOT NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  `resolution` TEXT,
  `handled_by_id` BIGINT,
  `handled_at` DATETIME(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  KEY `ix_reports_queue` (`status`, `created_at`),
  KEY `ix_reports_reporter` (`reporter_id`, `created_at`),
  CONSTRAINT `ck_reports_type` CHECK (type IN ('VIOLATION', 'DISPUTE')),
  CONSTRAINT `ck_reports_status` CHECK (status IN ('PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED')),
  CONSTRAINT `ck_reports_subject` CHECK ((reported_user_id IS NOT NULL) + (reported_post_id IS NOT NULL) + (contract_id IS NOT NULL) + (roommate_request_id IS NOT NULL) = 1),
  CONSTRAINT `ck_reports_closed` CHECK (status NOT IN ('RESOLVED','DISMISSED') OR (resolution IS NOT NULL AND handled_by_id IS NOT NULL AND handled_at IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Nhật ký nối tiếp các lần khóa/mở tài khoản, ẩn/mở tin và xử lý hồ sơ/báo cáo; không sửa đè lần trước.
CREATE TABLE `moderation_actions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `actor_user_id` BIGINT NOT NULL,
  `target_user_id` BIGINT,
  `target_post_id` BIGINT,
  `target_report_id` BIGINT,
  `target_landlord_verification_id` BIGINT,
  `target_tenant_verification_id` BIGINT,
  `related_report_id` BIGINT,
  `action` VARCHAR(80) NOT NULL,
  `reason` TEXT NOT NULL,
  `before_snapshot` JSON,
  `after_snapshot` JSON,
  `occurred_at` DATETIME(6) NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  KEY `ix_moderation_user` (`target_user_id`, `occurred_at`),
  KEY `ix_moderation_post` (`target_post_id`, `occurred_at`),
  KEY `ix_moderation_report` (`target_report_id`, `occurred_at`),
  CONSTRAINT `ck_moderation_actions_target` CHECK ((target_user_id IS NOT NULL) + (target_post_id IS NOT NULL) + (target_report_id IS NOT NULL) + (target_landlord_verification_id IS NOT NULL) + (target_tenant_verification_id IS NOT NULL) = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Add FK constraints after every table exists, including circular draft relationships.
-- No cascading delete/update; default RESTRICT/NO ACTION preserves history.
ALTER TABLE `users` ADD CONSTRAINT `fk_users_locked_by` FOREIGN KEY (`locked_by_id`) REFERENCES `users` (`id`);
ALTER TABLE `tenants` ADD CONSTRAINT `fk_tenants_user` FOREIGN KEY (`id`) REFERENCES `users` (`id`);
ALTER TABLE `landlords` ADD CONSTRAINT `fk_landlords_user` FOREIGN KEY (`id`) REFERENCES `users` (`id`);
ALTER TABLE `admins` ADD CONSTRAINT `fk_admins_user` FOREIGN KEY (`id`) REFERENCES `users` (`id`);
ALTER TABLE `personal_profiles` ADD CONSTRAINT `fk_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
ALTER TABLE `personal_profiles` ADD CONSTRAINT `fk_profiles_avatar` FOREIGN KEY (`avatar_file_id`) REFERENCES `files` (`id`);
ALTER TABLE `files` ADD CONSTRAINT `fk_files_owner_user_id` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`);
ALTER TABLE `files` ADD CONSTRAINT `fk_files_report_id` FOREIGN KEY (`report_id`) REFERENCES `reports` (`id`);
ALTER TABLE `files` ADD CONSTRAINT `fk_files_chat_message_id` FOREIGN KEY (`chat_message_id`) REFERENCES `chat_messages` (`id`);
ALTER TABLE `files` ADD CONSTRAINT `fk_files_landlord_verification_id` FOREIGN KEY (`landlord_verification_id`) REFERENCES `landlord_verifications` (`id`);
ALTER TABLE `landlord_verifications` ADD CONSTRAINT `fk_landlord_applicant` FOREIGN KEY (`applicant_user_id`) REFERENCES `users` (`id`);
ALTER TABLE `landlord_verifications` ADD CONSTRAINT `fk_landlord_identity` FOREIGN KEY (`identity_file_id`) REFERENCES `files` (`id`);
ALTER TABLE `landlord_verifications` ADD CONSTRAINT `fk_landlord_reviewer` FOREIGN KEY (`reviewed_by_id`) REFERENCES `admins` (`id`);
ALTER TABLE `tenant_identity_verifications` ADD CONSTRAINT `fk_identity_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);
ALTER TABLE `tenant_identity_verifications` ADD CONSTRAINT `fk_identity_file` FOREIGN KEY (`identity_file_id`) REFERENCES `files` (`id`);
ALTER TABLE `tenant_identity_verifications` ADD CONSTRAINT `fk_identity_reviewer` FOREIGN KEY (`reviewed_by_id`) REFERENCES `admins` (`id`);
ALTER TABLE `auth_sessions` ADD CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
ALTER TABLE `verification_tokens` ADD CONSTRAINT `fk_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
ALTER TABLE `verification_tokens` ADD CONSTRAINT `fk_tokens_occupant` FOREIGN KEY (`target_room_tenant_id`) REFERENCES `room_tenants` (`id`);
ALTER TABLE `rental_houses` ADD CONSTRAINT `fk_houses_landlord` FOREIGN KEY (`landlord_id`) REFERENCES `landlords` (`id`);
ALTER TABLE `rooms` ADD CONSTRAINT `fk_rooms_house` FOREIGN KEY (`house_id`) REFERENCES `rental_houses` (`id`);
ALTER TABLE `house_services` ADD CONSTRAINT `fk_house_services_house` FOREIGN KEY (`house_id`) REFERENCES `rental_houses` (`id`);
ALTER TABLE `house_services` ADD CONSTRAINT `fk_house_services_catalog` FOREIGN KEY (`catalog_service_id`) REFERENCES `rental_services` (`id`);
ALTER TABLE `room_services` ADD CONSTRAINT `fk_room_services_room_house` FOREIGN KEY (`room_id`, `house_id`) REFERENCES `rooms` (`id`, `house_id`);
ALTER TABLE `room_services` ADD CONSTRAINT `fk_room_services_house_service` FOREIGN KEY (`house_service_id`, `house_id`) REFERENCES `house_services` (`id`, `house_id`);
ALTER TABLE `posts` ADD CONSTRAINT `fk_posts_house_owner` FOREIGN KEY (`house_id`, `landlord_id`) REFERENCES `rental_houses` (`id`, `landlord_id`);
ALTER TABLE `posts` ADD CONSTRAINT `fk_posts_room_house` FOREIGN KEY (`room_id`, `house_id`) REFERENCES `rooms` (`id`, `house_id`);
ALTER TABLE `posts` ADD CONSTRAINT `fk_posts_reviewer` FOREIGN KEY (`reviewed_by_id`) REFERENCES `admins` (`id`);
ALTER TABLE `posts` ADD CONSTRAINT `fk_posts_hidden_by` FOREIGN KEY (`hidden_by_id`) REFERENCES `users` (`id`);
ALTER TABLE `post_images` ADD CONSTRAINT `fk_post_images_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`);
ALTER TABLE `post_images` ADD CONSTRAINT `fk_post_images_file` FOREIGN KEY (`file_id`) REFERENCES `files` (`id`);
ALTER TABLE `post_amenities` ADD CONSTRAINT `fk_post_amenities_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`);
ALTER TABLE `favorite_posts` ADD CONSTRAINT `fk_favorites_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
ALTER TABLE `favorite_posts` ADD CONSTRAINT `fk_favorites_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`);
ALTER TABLE `room_viewing_requests` ADD CONSTRAINT `fk_viewings_room_house` FOREIGN KEY (`room_id`, `house_id`) REFERENCES `rooms` (`id`, `house_id`);
ALTER TABLE `room_viewing_requests` ADD CONSTRAINT `fk_viewings_house_owner` FOREIGN KEY (`house_id`, `created_by_id`) REFERENCES `rental_houses` (`id`, `landlord_id`);
ALTER TABLE `room_viewing_requests` ADD CONSTRAINT `fk_viewings_conversation_room` FOREIGN KEY (`conversation_id`, `room_id`) REFERENCES `conversations` (`id`, `room_id`);
ALTER TABLE `room_viewing_requests` ADD CONSTRAINT `fk_viewings_conversation_tenant` FOREIGN KEY (`conversation_id`, `tenant_id`) REFERENCES `conversation_participants` (`conversation_id`, `user_id`);
ALTER TABLE `room_viewing_requests` ADD CONSTRAINT `fk_viewings_conversation_creator` FOREIGN KEY (`conversation_id`, `created_by_id`) REFERENCES `conversation_participants` (`conversation_id`, `user_id`);
ALTER TABLE `room_viewing_requests` ADD CONSTRAINT `fk_viewings_attendance` FOREIGN KEY (`attendance_confirmed_by_id`) REFERENCES `landlords` (`id`);
ALTER TABLE `room_viewing_requests` ADD CONSTRAINT `fk_viewings_rental_decider` FOREIGN KEY (`rental_decided_by_id`) REFERENCES `tenants` (`id`);
ALTER TABLE `room_viewing_requests` ADD CONSTRAINT `fk_viewings_cancelled_by` FOREIGN KEY (`cancelled_by_id`) REFERENCES `users` (`id`);
ALTER TABLE `contract_templates` ADD CONSTRAINT `fk_templates_creator` FOREIGN KEY (`created_by_id`) REFERENCES `admins` (`id`);
ALTER TABLE `contracts` ADD CONSTRAINT `fk_contract_room_house` FOREIGN KEY (`room_id`, `house_id`) REFERENCES `rooms` (`id`, `house_id`);
ALTER TABLE `contracts` ADD CONSTRAINT `fk_contract_house_owner` FOREIGN KEY (`house_id`, `landlord_id`) REFERENCES `rental_houses` (`id`, `landlord_id`);
ALTER TABLE `contracts` ADD CONSTRAINT `fk_contract_viewing_tenant` FOREIGN KEY (`viewing_id`, `room_id`, `viewing_tenant_id`) REFERENCES `room_viewing_requests` (`id`, `room_id`, `tenant_id`);
ALTER TABLE `contracts` ADD CONSTRAINT `fk_contract_previous` FOREIGN KEY (`previous_contract_id`) REFERENCES `contracts` (`id`);
ALTER TABLE `contracts` ADD CONSTRAINT `fk_contract_paper` FOREIGN KEY (`paper_document_file_id`) REFERENCES `files` (`id`);
ALTER TABLE `contracts` ADD CONSTRAINT `fk_contract_representative` FOREIGN KEY (`id`, `representative_room_tenant_id`) REFERENCES `room_tenants` (`contract_id`, `id`);
ALTER TABLE `contracts` ADD CONSTRAINT `fk_contract_initial_representative` FOREIGN KEY (`id`, `initial_representative_room_tenant_id`) REFERENCES `room_tenants` (`contract_id`, `id`);
ALTER TABLE `contracts` ADD CONSTRAINT `fk_contract_viewing_initial_rep` FOREIGN KEY (`id`, `initial_representative_room_tenant_id`, `viewing_tenant_id`) REFERENCES `room_tenants` (`contract_id`, `id`, `tenant_id`);
ALTER TABLE `contracts` ADD CONSTRAINT `fk_contract_current_revision` FOREIGN KEY (`id`, `current_revision_id`) REFERENCES `contract_revisions` (`contract_id`, `id`);
ALTER TABLE `room_tenants` ADD CONSTRAINT `fk_occupants_contract_room` FOREIGN KEY (`contract_id`, `room_id`) REFERENCES `contracts` (`id`, `room_id`);
ALTER TABLE `room_tenants` ADD CONSTRAINT `fk_occupants_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);
ALTER TABLE `room_tenants` ADD CONSTRAINT `fk_occupants_approved_join` FOREIGN KEY (`join_request_id`, `contract_id`, `tenant_id`) REFERENCES `occupant_join_requests` (`id`, `contract_id`, `applicant_id`);
ALTER TABLE `room_tenants` ADD CONSTRAINT `fk_occupants_move_in_owner` FOREIGN KEY (`contract_id`, `move_in_confirmed_by_id`) REFERENCES `contracts` (`id`, `landlord_id`);
ALTER TABLE `room_tenants` ADD CONSTRAINT `fk_occupants_move_out_owner` FOREIGN KEY (`contract_id`, `move_out_confirmed_by_id`) REFERENCES `contracts` (`id`, `landlord_id`);
ALTER TABLE `room_tenants` ADD CONSTRAINT `fk_occupants_linked_by` FOREIGN KEY (`account_linked_by_id`) REFERENCES `users` (`id`);
ALTER TABLE `contract_revisions` ADD CONSTRAINT `fk_revisions_contract` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`);
ALTER TABLE `contract_revisions` ADD CONSTRAINT `fk_revisions_template` FOREIGN KEY (`template_id`) REFERENCES `contract_templates` (`id`);
ALTER TABLE `contract_revisions` ADD CONSTRAINT `fk_revisions_creator` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`);
ALTER TABLE `contract_revisions` ADD CONSTRAINT `fk_revisions_representative` FOREIGN KEY (`contract_id`, `representative_room_tenant_id`) REFERENCES `room_tenants` (`contract_id`, `id`);
ALTER TABLE `contract_revisions` ADD CONSTRAINT `fk_revisions_landlord_confirmation` FOREIGN KEY (`contract_id`, `landlord_confirmed_by_id`) REFERENCES `contracts` (`id`, `landlord_id`);
ALTER TABLE `contract_revisions` ADD CONSTRAINT `fk_revisions_tenant_confirmation` FOREIGN KEY (`representative_room_tenant_id`, `tenant_confirmed_by_id`) REFERENCES `room_tenants` (`id`, `tenant_id`);
ALTER TABLE `contract_revisions` ADD CONSTRAINT `fk_revisions_document` FOREIGN KEY (`document_file_id`) REFERENCES `files` (`id`);
ALTER TABLE `contract_change_requests` ADD CONSTRAINT `fk_changes_contract` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`);
ALTER TABLE `contract_change_requests` ADD CONSTRAINT `fk_changes_requester` FOREIGN KEY (`representative_room_tenant_id`, `requested_by_id`) REFERENCES `room_tenants` (`id`, `tenant_id`);
ALTER TABLE `contract_change_requests` ADD CONSTRAINT `fk_changes_representative` FOREIGN KEY (`contract_id`, `representative_room_tenant_id`) REFERENCES `room_tenants` (`contract_id`, `id`);
ALTER TABLE `contract_change_requests` ADD CONSTRAINT `fk_changes_base_revision_id` FOREIGN KEY (`contract_id`, `base_revision_id`) REFERENCES `contract_revisions` (`contract_id`, `id`);
ALTER TABLE `contract_change_requests` ADD CONSTRAINT `fk_changes_proposed_revision_id` FOREIGN KEY (`contract_id`, `proposed_revision_id`) REFERENCES `contract_revisions` (`contract_id`, `id`);
ALTER TABLE `contract_change_requests` ADD CONSTRAINT `fk_changes_target` FOREIGN KEY (`target_room_id`) REFERENCES `rooms` (`id`);
ALTER TABLE `contract_change_requests` ADD CONSTRAINT `fk_changes_result` FOREIGN KEY (`result_contract_id`, `target_room_id`, `contract_id`) REFERENCES `contracts` (`id`, `room_id`, `previous_contract_id`);
ALTER TABLE `contract_change_requests` ADD CONSTRAINT `fk_changes_reviewer` FOREIGN KEY (`contract_id`, `reviewed_by_id`) REFERENCES `contracts` (`id`, `landlord_id`);
ALTER TABLE `contract_change_requests` ADD CONSTRAINT `fk_changes_tenant_confirmation` FOREIGN KEY (`representative_room_tenant_id`, `tenant_confirmed_by_id`) REFERENCES `room_tenants` (`id`, `tenant_id`);
ALTER TABLE `contract_change_requests` ADD CONSTRAINT `fk_changes_applier` FOREIGN KEY (`contract_id`, `applied_by_id`) REFERENCES `contracts` (`id`, `landlord_id`);
ALTER TABLE `occupant_join_requests` ADD CONSTRAINT `fk_join_contract` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`);
ALTER TABLE `occupant_join_requests` ADD CONSTRAINT `fk_join_source_roommate` FOREIGN KEY (`source_roommate_request_id`, `contract_id`) REFERENCES `roommate_requests` (`id`, `target_contract_id`);
ALTER TABLE `occupant_join_requests` ADD CONSTRAINT `fk_join_applicant` FOREIGN KEY (`applicant_id`) REFERENCES `tenants` (`id`);
ALTER TABLE `occupant_join_requests` ADD CONSTRAINT `fk_join_requester` FOREIGN KEY (`requested_by_id`) REFERENCES `tenants` (`id`);
ALTER TABLE `occupant_join_requests` ADD CONSTRAINT `fk_join_representative` FOREIGN KEY (`contract_id`, `representative_room_tenant_id`) REFERENCES `room_tenants` (`contract_id`, `id`);
ALTER TABLE `occupant_join_requests` ADD CONSTRAINT `fk_join_representative_consent` FOREIGN KEY (`representative_room_tenant_id`, `representative_consented_by_id`) REFERENCES `room_tenants` (`id`, `tenant_id`);
ALTER TABLE `occupant_join_requests` ADD CONSTRAINT `fk_join_applicant_consent` FOREIGN KEY (`applicant_consented_by_id`) REFERENCES `tenants` (`id`);
ALTER TABLE `occupant_join_requests` ADD CONSTRAINT `fk_join_reviewer` FOREIGN KEY (`contract_id`, `reviewed_by_id`) REFERENCES `contracts` (`id`, `landlord_id`);
ALTER TABLE `occupant_join_requests` ADD CONSTRAINT `fk_join_completed` FOREIGN KEY (`id`, `contract_id`, `applicant_id`, `completed_room_tenant_id`) REFERENCES `room_tenants` (`join_request_id`, `contract_id`, `tenant_id`, `id`);
ALTER TABLE `roommate_profiles` ADD CONSTRAINT `fk_roommate_profile_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);
ALTER TABLE `roommate_profiles` ADD CONSTRAINT `fk_roommate_profile_stay` FOREIGN KEY (`current_room_tenant_id`, `tenant_id`) REFERENCES `room_tenants` (`id`, `tenant_id`);
ALTER TABLE `profile_lifestyles` ADD CONSTRAINT `fk_profile_lifestyle_profile` FOREIGN KEY (`profile_id`) REFERENCES `roommate_profiles` (`id`);
ALTER TABLE `profile_lifestyles` ADD CONSTRAINT `fk_profile_lifestyle_criterion` FOREIGN KEY (`criterion_id`) REFERENCES `lifestyle_criteria` (`id`);
ALTER TABLE `roommate_requests` ADD CONSTRAINT `fk_roommate_request_sender` FOREIGN KEY (`sender_id`) REFERENCES `tenants` (`id`);
ALTER TABLE `roommate_requests` ADD CONSTRAINT `fk_roommate_request_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `tenants` (`id`);
ALTER TABLE `roommate_requests` ADD CONSTRAINT `fk_roommate_request_contract` FOREIGN KEY (`target_contract_id`) REFERENCES `contracts` (`id`);
ALTER TABLE `invoices` ADD CONSTRAINT `fk_invoice_contract_room` FOREIGN KEY (`contract_id`, `room_id`) REFERENCES `contracts` (`id`, `room_id`);
ALTER TABLE `invoices` ADD CONSTRAINT `fk_invoice_revision` FOREIGN KEY (`contract_id`, `contract_revision_id`) REFERENCES `contract_revisions` (`contract_id`, `id`);
ALTER TABLE `invoices` ADD CONSTRAINT `fk_invoice_payer` FOREIGN KEY (`contract_id`, `payer_room_tenant_id`) REFERENCES `room_tenants` (`contract_id`, `id`);
ALTER TABLE `invoices` ADD CONSTRAINT `fk_invoice_replacement` FOREIGN KEY (`replacement_of_id`, `contract_id`, `billing_period`) REFERENCES `invoices` (`id`, `contract_id`, `billing_period`);
ALTER TABLE `invoices` ADD CONSTRAINT `fk_invoice_created_by_id` FOREIGN KEY (`created_by_id`) REFERENCES `landlords` (`id`);
ALTER TABLE `invoices` ADD CONSTRAINT `fk_invoice_paid_by_id` FOREIGN KEY (`paid_by_id`) REFERENCES `landlords` (`id`);
ALTER TABLE `invoices` ADD CONSTRAINT `fk_invoice_cancelled_by_id` FOREIGN KEY (`cancelled_by_id`) REFERENCES `landlords` (`id`);
ALTER TABLE `invoice_items` ADD CONSTRAINT `fk_invoice_items_invoice_room` FOREIGN KEY (`invoice_id`, `room_id`) REFERENCES `invoices` (`id`, `room_id`);
ALTER TABLE `invoice_items` ADD CONSTRAINT `fk_invoice_items_room_service` FOREIGN KEY (`room_service_id`, `room_id`) REFERENCES `room_services` (`id`, `room_id`);
ALTER TABLE `reviews` ADD CONSTRAINT `fk_review_stay` FOREIGN KEY (`room_tenant_id`, `contract_id`, `room_id`, `reviewer_id`) REFERENCES `room_tenants` (`id`, `contract_id`, `room_id`, `tenant_id`);
ALTER TABLE `reviews` ADD CONSTRAINT `fk_review_hidden_by` FOREIGN KEY (`hidden_by_id`) REFERENCES `admins` (`id`);
ALTER TABLE `conversations` ADD CONSTRAINT `fk_conversation_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`);
ALTER TABLE `conversations` ADD CONSTRAINT `fk_conversation_post_room` FOREIGN KEY (`post_id`, `room_id`) REFERENCES `posts` (`id`, `room_id`);
ALTER TABLE `conversations` ADD CONSTRAINT `fk_conversation_roommate` FOREIGN KEY (`roommate_request_id`) REFERENCES `roommate_requests` (`id`);
ALTER TABLE `conversations` ADD CONSTRAINT `fk_conversation_last_message` FOREIGN KEY (`id`, `last_message_id`) REFERENCES `chat_messages` (`conversation_id`, `id`);
ALTER TABLE `conversation_participants` ADD CONSTRAINT `fk_participants_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`);
ALTER TABLE `conversation_participants` ADD CONSTRAINT `fk_participants_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
ALTER TABLE `chat_messages` ADD CONSTRAINT `fk_messages_participant` FOREIGN KEY (`conversation_id`, `sender_id`) REFERENCES `conversation_participants` (`conversation_id`, `user_id`);
ALTER TABLE `chat_messages` ADD CONSTRAINT `fk_messages_shared_post` FOREIGN KEY (`shared_post_id`) REFERENCES `posts` (`id`);
ALTER TABLE `notifications` ADD CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
ALTER TABLE `reports` ADD CONSTRAINT `fk_reports_reporter_id` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`);
ALTER TABLE `reports` ADD CONSTRAINT `fk_reports_reported_user_id` FOREIGN KEY (`reported_user_id`) REFERENCES `users` (`id`);
ALTER TABLE `reports` ADD CONSTRAINT `fk_reports_reported_post_id` FOREIGN KEY (`reported_post_id`) REFERENCES `posts` (`id`);
ALTER TABLE `reports` ADD CONSTRAINT `fk_reports_contract_id` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`);
ALTER TABLE `reports` ADD CONSTRAINT `fk_reports_roommate_request_id` FOREIGN KEY (`roommate_request_id`) REFERENCES `roommate_requests` (`id`);
ALTER TABLE `reports` ADD CONSTRAINT `fk_reports_handled_by_id` FOREIGN KEY (`handled_by_id`) REFERENCES `admins` (`id`);
ALTER TABLE `moderation_actions` ADD CONSTRAINT `fk_moderation_actor_user_id` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`);
ALTER TABLE `moderation_actions` ADD CONSTRAINT `fk_moderation_target_user_id` FOREIGN KEY (`target_user_id`) REFERENCES `users` (`id`);
ALTER TABLE `moderation_actions` ADD CONSTRAINT `fk_moderation_target_post_id` FOREIGN KEY (`target_post_id`) REFERENCES `posts` (`id`);
ALTER TABLE `moderation_actions` ADD CONSTRAINT `fk_moderation_target_report_id` FOREIGN KEY (`target_report_id`) REFERENCES `reports` (`id`);
ALTER TABLE `moderation_actions` ADD CONSTRAINT `fk_moderation_related_report_id` FOREIGN KEY (`related_report_id`) REFERENCES `reports` (`id`);
ALTER TABLE `moderation_actions` ADD CONSTRAINT `fk_moderation_target_landlord_verification_id` FOREIGN KEY (`target_landlord_verification_id`) REFERENCES `landlord_verifications` (`id`);
ALTER TABLE `moderation_actions` ADD CONSTRAINT `fk_moderation_target_tenant_verification_id` FOREIGN KEY (`target_tenant_verification_id`) REFERENCES `tenant_identity_verifications` (`id`);

-- Cấu hình hiệu lực: chỉ dịch vụ còn bật ở cả nhà và phòng mới được tính cho kỳ mới.
ALTER TABLE `contract_change_requests` ADD CONSTRAINT `fk_changes_cancelled_by` FOREIGN KEY (`cancelled_by_id`) REFERENCES `users` (`id`);
ALTER TABLE `occupant_join_requests` ADD CONSTRAINT `fk_join_cancelled_by` FOREIGN KEY (`cancelled_by_id`) REFERENCES `users` (`id`);
ALTER TABLE `contract_representative_history` ADD CONSTRAINT `fk_rep_history_member` FOREIGN KEY (`contract_id`, `room_tenant_id`) REFERENCES `room_tenants` (`contract_id`, `id`);
ALTER TABLE `contract_representative_history` ADD CONSTRAINT `fk_rep_history_account` FOREIGN KEY (`contract_id`, `room_tenant_id`, `tenant_id`) REFERENCES `room_tenants` (`contract_id`, `id`, `tenant_id`);
ALTER TABLE `contract_representative_history` ADD CONSTRAINT `fk_rep_history_previous` FOREIGN KEY (`contract_id`, `previous_history_id`) REFERENCES `contract_representative_history` (`contract_id`, `id`);
ALTER TABLE `contract_representative_history` ADD CONSTRAINT `fk_rep_history_previous_member` FOREIGN KEY (`contract_id`, `previous_room_tenant_id`) REFERENCES `room_tenants` (`contract_id`, `id`);
ALTER TABLE `contract_representative_history` ADD CONSTRAINT `fk_rep_history_revision` FOREIGN KEY (`contract_id`, `basis_revision_id`) REFERENCES `contract_revisions` (`contract_id`, `id`);
ALTER TABLE `contract_representative_history` ADD CONSTRAINT `fk_rep_history_recorder` FOREIGN KEY (`contract_id`, `recorded_by_id`) REFERENCES `contracts` (`id`, `landlord_id`);
ALTER TABLE `contract_representative_history` ADD CONSTRAINT `fk_rep_history_consent_recorder` FOREIGN KEY (`contract_id`, `consent_recorded_by_id`) REFERENCES `contracts` (`id`, `landlord_id`);
ALTER TABLE `contract_representative_history` ADD CONSTRAINT `fk_rep_history_consent_tenant` FOREIGN KEY (`room_tenant_id`, `consented_by_id`) REFERENCES `room_tenants` (`id`, `tenant_id`);
ALTER TABLE `contract_representative_history` ADD CONSTRAINT `fk_rep_history_ended_by` FOREIGN KEY (`contract_id`, `ended_by_id`) REFERENCES `contracts` (`id`, `landlord_id`);
ALTER TABLE `contract_representative_history` ADD CONSTRAINT `fk_rep_history_consent_file` FOREIGN KEY (`consent_file_id`) REFERENCES `files` (`id`);

CREATE VIEW `active_room_services` AS
SELECT
  rs.id AS room_service_id,
  rs.room_id,
  rs.house_id,
  hs.id AS house_service_id,
  hs.name,
  hs.unit,
  COALESCE(rs.unit_price_override, hs.default_unit_price) AS unit_price,
  COALESCE(rs.calculation_method_override, hs.default_calculation_method) AS calculation_method
FROM `room_services` AS rs
JOIN `house_services` AS hs ON hs.id = rs.house_service_id AND hs.house_id = rs.house_id
WHERE rs.is_active = TRUE AND hs.is_active = TRUE;

-- Tổng tiền đọc trực tiếp từ các dòng đã chốt; DISCOUNT là số dương được trừ khỏi tổng.
CREATE VIEW `invoice_totals` AS
SELECT
  i.id AS invoice_id,
  COALESCE(SUM(CASE WHEN item.item_type = 'RENT' THEN item.amount ELSE 0 END), 0) AS rent_amount,
  COALESCE(SUM(CASE WHEN item.item_type = 'SERVICE' THEN item.amount ELSE 0 END), 0) AS service_amount,
  COALESCE(SUM(CASE WHEN item.item_type = 'OTHER' THEN item.amount ELSE 0 END), 0) AS other_amount,
  COALESCE(SUM(CASE WHEN item.item_type = 'DISCOUNT' THEN item.amount ELSE 0 END), 0) AS discount_amount,
  COALESCE(SUM(CASE WHEN item.item_type = 'DISCOUNT' THEN -item.amount ELSE item.amount END), 0) AS total_amount
FROM `invoices` AS i
LEFT JOIN `invoice_items` AS item ON item.invoice_id = i.id
GROUP BY i.id;

-- Tạo DRAFT, thêm/sửa các dòng, sau đó chuyển sang UNPAID trong cùng giao dịch.
-- Các trạng thái đã phát hành chỉ đổi trạng thái xử lý; nội dung và dòng tiền là bất biến.
DELIMITER $$

CREATE TRIGGER `trg_invoices_before_insert`
BEFORE INSERT ON `invoices` FOR EACH ROW
BEGIN
  IF NEW.status <> 'DRAFT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'New invoices must start as DRAFT';
  END IF;
END$$

CREATE TRIGGER `trg_invoices_before_update`
BEFORE UPDATE ON `invoices` FOR EACH ROW
BEGIN
  DECLARE item_count BIGINT DEFAULT 0;
  DECLARE invoice_total DECIMAL(20,2) DEFAULT 0;

  IF OLD.status IN ('PAID', 'CANCELLED') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Final invoices cannot be changed';
  END IF;

  IF (OLD.status = 'DRAFT' AND NEW.status NOT IN ('DRAFT', 'UNPAID', 'CANCELLED'))
    OR (OLD.status = 'UNPAID' AND NEW.status NOT IN ('UNPAID', 'OVERDUE', 'PAID', 'CANCELLED'))
    OR (OLD.status = 'OVERDUE' AND NEW.status NOT IN ('OVERDUE', 'PAID', 'CANCELLED')) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid invoice status transition';
  END IF;

  IF OLD.status <> 'DRAFT' AND (
    OLD.contract_id <> NEW.contract_id OR OLD.room_id <> NEW.room_id
    OR OLD.contract_revision_id <> NEW.contract_revision_id
    OR OLD.payer_room_tenant_id <> NEW.payer_room_tenant_id
    OR OLD.payer_snapshot <> NEW.payer_snapshot
    OR OLD.billing_period <> NEW.billing_period OR OLD.due_date <> NEW.due_date
    OR OLD.occupant_count_at_billing <> NEW.occupant_count_at_billing
    OR OLD.created_by_id <> NEW.created_by_id
    OR NOT (OLD.replacement_of_id <=> NEW.replacement_of_id)
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Issued invoice content cannot be changed';
  END IF;

  IF OLD.status = 'DRAFT' AND NEW.status = 'UNPAID' THEN
    SELECT COUNT(*), COALESCE(SUM(CASE WHEN item_type = 'DISCOUNT' THEN -amount ELSE amount END), 0)
      INTO item_count, invoice_total
    FROM `invoice_items` WHERE invoice_id = NEW.id;
    IF item_count = 0 OR invoice_total < 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invoice needs items and nonnegative total';
    END IF;
  END IF;
END$$

CREATE TRIGGER `trg_invoice_items_before_insert`
BEFORE INSERT ON `invoice_items` FOR EACH ROW
BEGIN
  DECLARE invoice_status VARCHAR(40);
  SELECT status INTO invoice_status FROM `invoices` WHERE id = NEW.invoice_id;
  IF invoice_status IS NULL OR invoice_status <> 'DRAFT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invoice items can only be added to DRAFT';
  END IF;
END$$

CREATE TRIGGER `trg_invoice_items_before_update`
BEFORE UPDATE ON `invoice_items` FOR EACH ROW
BEGIN
  DECLARE invoice_status VARCHAR(40);
  IF NEW.invoice_id <> OLD.invoice_id OR NEW.room_id <> OLD.room_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invoice items cannot move between invoices or rooms';
  END IF;
  SELECT status INTO invoice_status FROM `invoices` WHERE id = OLD.invoice_id;
  IF invoice_status IS NULL OR invoice_status <> 'DRAFT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Issued invoice items cannot be changed';
  END IF;
END$$

CREATE TRIGGER `trg_invoice_items_before_delete`
BEFORE DELETE ON `invoice_items` FOR EACH ROW
BEGIN
  DECLARE invoice_status VARCHAR(40);
  SELECT status INTO invoice_status FROM `invoices` WHERE id = OLD.invoice_id;
  IF invoice_status IS NULL OR invoice_status <> 'DRAFT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Issued invoice items cannot be deleted';
  END IF;
END$$

DELIMITER ;

-- BEGIN V5 WORKFLOW OBJECTS 20261024
-- Shared source; scripts/build-database.cjs embeds this in schema.sql and the migration.
-- Public sp_* routines own their transaction. SET TRANSACTION rejects an active caller
-- transaction before START TRANSACTION can implicitly commit it. Use a fresh UTC session.
-- Application accounts should receive EXECUTE on public routines, not direct table writes
-- or EXECUTE on _v5_* helpers. The backend authenticates the supplied actor IDs.

CREATE OR REPLACE VIEW v5_room_capacity_usage AS
SELECT r.id AS room_id, r.max_occupants,
  (SELECT COUNT(*) FROM room_tenants rt WHERE rt.room_id = r.id AND rt.status = 'ACTIVE') AS active_count,
  (SELECT COUNT(*) FROM room_tenants rt JOIN contracts c ON c.id = rt.contract_id
   WHERE rt.room_id = r.id AND rt.status = 'PLANNED'
     AND c.status IN ('DRAFT','PENDING_CONFIRMATION','CONFIRMED','ACTIVE')) AS planned_count,
  (SELECT COUNT(*) FROM occupant_join_requests j JOIN contracts c ON c.id = j.contract_id
   WHERE c.room_id = r.id AND c.status = 'ACTIVE' AND j.status = 'APPROVED'
     AND j.hold_expires_at > UTC_TIMESTAMP(6)
     AND NOT EXISTS (SELECT 1 FROM room_tenants rt WHERE rt.join_request_id = j.id AND rt.status IN ('PLANNED','ACTIVE'))) AS held_count
FROM rooms r;

CREATE OR REPLACE VIEW v5_current_residents AS
SELECT rt.*, c.contract_number, c.landlord_id, c.status AS contract_status,
  (rt.id = c.representative_room_tenant_id) AS is_representative,
  (c.status <> 'ACTIVE') AS needs_reconciliation
FROM room_tenants rt JOIN contracts c ON c.id = rt.contract_id WHERE rt.status = 'ACTIVE';

CREATE OR REPLACE VIEW v5_representative_timeline AS
SELECT h.*, c.contract_number, c.room_id, c.landlord_id
FROM contract_representative_history h JOIN contracts c ON c.id = h.contract_id;

DELIMITER $$

DROP PROCEDURE IF EXISTS _v5_room_load$$
CREATE PROCEDURE _v5_room_load(IN p_room BIGINT, IN p_exclude_join BIGINT, OUT p_load BIGINT)
SQL SECURITY DEFINER
BEGIN
  SELECT active_count + planned_count + held_count INTO p_load FROM v5_room_capacity_usage WHERE room_id = p_room;
  IF p_exclude_join IS NOT NULL AND EXISTS (
    SELECT 1 FROM occupant_join_requests j JOIN contracts c ON c.id = j.contract_id
    WHERE j.id = p_exclude_join AND c.room_id = p_room AND c.status = 'ACTIVE'
      AND j.status = 'APPROVED' AND j.hold_expires_at > UTC_TIMESTAMP(6)
      AND NOT EXISTS (SELECT 1 FROM room_tenants rt WHERE rt.join_request_id = j.id AND rt.status IN ('PLANNED','ACTIVE'))
  ) THEN SET p_load = p_load - 1; END IF;
END$$

DROP PROCEDURE IF EXISTS _v5_sync_room$$
CREATE PROCEDURE _v5_sync_room(IN p_room BIGINT)
SQL SECURITY DEFINER
BEGIN
  UPDATE rooms SET status = CASE
    WHEN EXISTS (SELECT 1 FROM room_tenants rt WHERE rt.room_id = p_room AND rt.status = 'ACTIVE') THEN 'OCCUPIED'
    WHEN EXISTS (SELECT 1 FROM contracts c WHERE c.room_id = p_room AND c.status IN ('DRAFT','PENDING_CONFIRMATION','CONFIRMED','ACTIVE')) THEN 'RESERVED'
    WHEN status = 'MAINTENANCE' THEN 'MAINTENANCE' ELSE 'AVAILABLE' END,
    updated_at = UTC_TIMESTAMP(6) WHERE id = p_room;
END$$

DROP PROCEDURE IF EXISTS _v5_cancel_requests$$
CREATE PROCEDURE _v5_cancel_requests(IN p_contract BIGINT, IN p_actor BIGINT, IN p_reason VARCHAR(1000), IN p_keep_change BIGINT)
SQL SECURITY DEFINER
BEGIN
  UPDATE occupant_join_requests SET status = 'CANCELLED', cancelled_at = UTC_TIMESTAMP(6),
    cancelled_by_id = p_actor, cancellation_reason = p_reason, updated_at = UTC_TIMESTAMP(6)
  WHERE contract_id = p_contract AND status IN ('PENDING_CONSENT','PENDING_LANDLORD','APPROVED');
  UPDATE contract_change_requests SET status = 'CANCELLED', cancelled_at = UTC_TIMESTAMP(6),
    cancelled_by_id = p_actor, cancellation_reason = p_reason, updated_at = UTC_TIMESTAMP(6)
  WHERE contract_id = p_contract AND status IN ('PENDING','APPROVED_WAITING_CONFIRMATION','READY_TO_APPLY') AND (p_keep_change IS NULL OR id <> p_keep_change);
END$$

DROP TRIGGER IF EXISTS trg_contracts_before_insert$$
CREATE TRIGGER trg_contracts_before_insert BEFORE INSERT ON contracts FOR EACH ROW
BEGIN
  DECLARE v_room_status VARCHAR(40);
  SELECT status INTO v_room_status FROM rooms WHERE id = NEW.room_id FOR UPDATE;
  IF NEW.status <> 'DRAFT' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Create a DRAFT contract before adding members and a revision'; END IF;
  IF v_room_status <> 'AVAILABLE' OR EXISTS (SELECT 1 FROM room_tenants WHERE room_id = NEW.room_id AND status = 'ACTIVE') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Room is not available for a new contract';
  END IF;
  IF EXISTS (SELECT 1 FROM contracts WHERE room_id = NEW.room_id AND status IN ('DRAFT','PENDING_CONFIRMATION','CONFIRMED','ACTIVE')) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Room already has an open contract';
  END IF;
  IF NEW.source = 'NEW_RENTAL' AND NOT EXISTS (
    SELECT 1 FROM room_viewing_requests WHERE id = NEW.viewing_id AND room_id = NEW.room_id
      AND tenant_id = NEW.viewing_tenant_id AND status = 'COMPLETED' AND rental_decision = 'AGREED'
  ) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'New rental requires a completed and agreed viewing'; END IF;
END$$

DROP TRIGGER IF EXISTS trg_contracts_before_update$$
CREATE TRIGGER trg_contracts_before_update BEFORE UPDATE ON contracts FOR EACH ROW
BEGIN
  DECLARE v_revision VARCHAR(40);
  DECLARE v_rep_at DATETIME(6);
  DECLARE v_rep_status VARCHAR(40);
  DECLARE v_rep_date DATE;
  IF NOT (NEW.room_id <=> OLD.room_id) OR NOT (NEW.house_id <=> OLD.house_id)
    OR NOT (NEW.landlord_id <=> OLD.landlord_id) OR NOT (NEW.source <=> OLD.source)
    OR NOT (NEW.viewing_id <=> OLD.viewing_id) OR NOT (NEW.viewing_tenant_id <=> OLD.viewing_tenant_id)
    OR NOT (NEW.previous_contract_id <=> OLD.previous_contract_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Contract origin and room are immutable; create a transfer contract';
  END IF;
  IF OLD.status IN ('TERMINATED','EXPIRED','CANCELLED') AND NEW.status <> OLD.status THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Closed contracts cannot reopen';
  END IF;
  IF NEW.initial_representative_room_tenant_id IS NULL THEN SET NEW.initial_representative_room_tenant_id = NEW.representative_room_tenant_id; END IF;
  IF OLD.initial_representative_room_tenant_id IS NOT NULL AND NOT (NEW.initial_representative_room_tenant_id <=> OLD.initial_representative_room_tenant_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Initial representative is immutable';
  END IF;
  IF NEW.source = 'NEW_RENTAL' AND NEW.status IN ('DRAFT','PENDING_CONFIRMATION','CONFIRMED','ACTIVE') AND NOT EXISTS (
    SELECT 1 FROM room_viewing_requests WHERE id = NEW.viewing_id AND status = 'COMPLETED' AND rental_decision = 'AGREED'
  ) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Live rental requires an agreed viewing'; END IF;
  IF NEW.status IN ('CONFIRMED','ACTIVE') THEN
    SELECT status INTO v_revision FROM contract_revisions WHERE id = NEW.current_revision_id AND contract_id = NEW.id;
    IF v_revision IS NULL OR (v_revision <> 'CONFIRMED' AND NOT (NEW.source = 'PAPER_IMPORT' AND v_revision = 'IMPORTED')) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Contract requires its confirmed or imported current revision';
    END IF;
  END IF;
  IF NEW.status = 'ACTIVE' THEN
    SELECT status, move_in_date, move_in_confirmed_at INTO v_rep_status, v_rep_date, v_rep_at
    FROM room_tenants WHERE id = NEW.representative_room_tenant_id AND contract_id = NEW.id;
    IF v_rep_status IS NULL OR v_rep_status <> 'ACTIVE' OR v_rep_date NOT BETWEEN NEW.start_date AND NEW.end_date
      OR v_rep_at IS NULL OR v_rep_at > UTC_TIMESTAMP(6) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Active contract requires an active confirmed representative';
    END IF;
    IF OLD.status <> 'ACTIVE' AND (NEW.activated_at IS NULL OR v_rep_at > NEW.activated_at) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Activation requires representative move-in first';
    END IF;
    IF OLD.status = 'ACTIVE' AND NOT (NEW.activated_at <=> OLD.activated_at) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Do not change original activation time during handover';
    END IF;
  END IF;
  IF OLD.representative_room_tenant_id IS NOT NULL AND NOT (NEW.representative_room_tenant_id <=> OLD.representative_room_tenant_id) THEN
    IF OLD.status <> 'ACTIVE' OR NEW.status <> 'ACTIVE' OR NOT EXISTS (
      SELECT 1 FROM contract_representative_history h WHERE h.contract_id = NEW.id
        AND h.room_tenant_id = NEW.representative_room_tenant_id AND h.is_current = TRUE
        AND h.event_type = 'HANDOVER' AND h.previous_room_tenant_id = OLD.representative_room_tenant_id
    ) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Representative change requires a recorded handover'; END IF;
  END IF;
  IF NEW.status IN ('TERMINATED','EXPIRED','CANCELLED') AND OLD.status NOT IN ('TERMINATED','EXPIRED','CANCELLED') THEN
    IF EXISTS (SELECT 1 FROM room_tenants WHERE contract_id = NEW.id AND status IN ('ACTIVE','PLANNED')) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Close or cancel every open stay before closing the contract';
    END IF;
    IF NEW.closed_at IS NULL OR NULLIF(TRIM(NEW.closure_reason), '') IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Closing requires a timestamp and reason';
    END IF;
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_contracts_after_update_workflow$$
CREATE TRIGGER trg_contracts_after_update_workflow AFTER UPDATE ON contracts FOR EACH ROW
BEGIN
  IF OLD.representative_room_tenant_id IS NULL AND NEW.representative_room_tenant_id IS NOT NULL THEN
    INSERT INTO contract_representative_history
      (contract_id, room_tenant_id, tenant_id, name_snapshot, event_type, basis_revision_id, started_at, recorded_by_id, reason, consent_method)
    SELECT NEW.id, rt.id, rt.tenant_id, rt.full_name, 'INITIAL', NEW.current_revision_id, UTC_TIMESTAMP(6), NEW.landlord_id,
      'Initial contract representative', 'NOT_REQUIRED' FROM room_tenants rt WHERE rt.id = NEW.representative_room_tenant_id;
  END IF;
  IF NEW.status IN ('TERMINATED','EXPIRED','CANCELLED') AND OLD.status NOT IN ('TERMINATED','EXPIRED','CANCELLED') THEN
    UPDATE contract_representative_history SET is_current = FALSE, ended_at = NEW.closed_at,
      ended_by_id = NEW.landlord_id, end_reason = NEW.closure_reason WHERE contract_id = NEW.id AND is_current = TRUE;
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_rep_history_before_insert$$
CREATE TRIGGER trg_rep_history_before_insert BEFORE INSERT ON contract_representative_history FOR EACH ROW
BEGIN
  IF NEW.event_type = 'HANDOVER' THEN
    IF NOT EXISTS (SELECT 1 FROM contracts c JOIN room_tenants rt ON rt.contract_id = c.id
      JOIN users u ON u.id = rt.tenant_id
      WHERE c.id = NEW.contract_id AND c.status = 'ACTIVE' AND c.representative_room_tenant_id = NEW.previous_room_tenant_id
        AND rt.id = NEW.room_tenant_id AND rt.status = 'ACTIVE' AND u.status = 'ACTIVE') THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Successor must be an active linked resident with an active account';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM contract_representative_history h WHERE h.id = NEW.previous_history_id
      AND h.contract_id = NEW.contract_id AND h.room_tenant_id = NEW.previous_room_tenant_id
      AND h.is_current = FALSE AND h.ended_at = NEW.started_at) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Handover must continue the immediately closed representative tenure';
    END IF;
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_rep_history_before_update$$
CREATE TRIGGER trg_rep_history_before_update BEFORE UPDATE ON contract_representative_history FOR EACH ROW
BEGIN
  IF OLD.is_current = FALSE OR NEW.is_current <> FALSE OR NEW.ended_at IS NULL
    OR NOT (OLD.contract_id <=> NEW.contract_id) OR NOT (OLD.room_tenant_id <=> NEW.room_tenant_id)
    OR NOT (OLD.tenant_id <=> NEW.tenant_id) OR NOT (OLD.name_snapshot <=> NEW.name_snapshot)
    OR NOT (OLD.event_type <=> NEW.event_type) OR NOT (OLD.previous_history_id <=> NEW.previous_history_id)
    OR NOT (OLD.previous_room_tenant_id <=> NEW.previous_room_tenant_id) OR NOT (OLD.basis_revision_id <=> NEW.basis_revision_id)
    OR NOT (OLD.started_at <=> NEW.started_at) OR NOT (OLD.recorded_at <=> NEW.recorded_at)
    OR NOT (OLD.recorded_by_id <=> NEW.recorded_by_id) OR NOT (OLD.reason <=> NEW.reason)
    OR NOT (OLD.consent_method <=> NEW.consent_method) OR NOT (OLD.consented_by_id <=> NEW.consented_by_id)
    OR NOT (OLD.consent_recorded_by_id <=> NEW.consent_recorded_by_id) OR NOT (OLD.consent_recorded_at <=> NEW.consent_recorded_at)
    OR NOT (OLD.consent_file_id <=> NEW.consent_file_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Representative history is immutable except for closing the current tenure';
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_rep_history_before_delete$$
CREATE TRIGGER trg_rep_history_before_delete BEFORE DELETE ON contract_representative_history FOR EACH ROW
BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Representative history cannot be deleted'; END$$

DROP TRIGGER IF EXISTS trg_occupants_before_insert_workflow$$
CREATE TRIGGER trg_occupants_before_insert_workflow BEFORE INSERT ON room_tenants FOR EACH ROW
BEGIN
  DECLARE v_status VARCHAR(40);
  DECLARE v_start DATE;
  DECLARE v_end DATE;
  DECLARE v_capacity INT;
  DECLARE v_load BIGINT;
  SELECT max_occupants INTO v_capacity FROM rooms WHERE id = NEW.room_id FOR UPDATE;
  SELECT status, start_date, end_date INTO v_status, v_start, v_end FROM contracts WHERE id = NEW.contract_id;
  IF NEW.status IN ('PLANNED','ACTIVE') AND v_status NOT IN ('DRAFT','PENDING_CONFIRMATION','CONFIRMED','ACTIVE') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot add an open stay to a closed contract';
  END IF;
  IF NEW.status = 'ACTIVE' AND (v_status NOT IN ('CONFIRMED','ACTIVE') OR NEW.move_in_date NOT BETWEEN v_start AND v_end
    OR NEW.move_in_date > DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) OR NEW.move_in_confirmed_at > UTC_TIMESTAMP(6)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Move-in requires a live confirmed contract and a valid actual date';
  END IF;
  IF NEW.intake_source = 'APPROVED_JOIN' AND NOT EXISTS (SELECT 1 FROM occupant_join_requests j WHERE j.id = NEW.join_request_id
    AND j.contract_id = NEW.contract_id AND j.applicant_id = NEW.tenant_id AND j.status = 'APPROVED' AND j.hold_expires_at > UTC_TIMESTAMP(6)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Join stay requires an unexpired approved request';
  END IF;
  IF NEW.status IN ('PLANNED','ACTIVE') THEN
    CALL _v5_room_load(NEW.room_id, NEW.join_request_id, v_load);
    IF v_load + 1 > v_capacity THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Room capacity includes planned members and held places'; END IF;
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_occupants_before_update_workflow$$
CREATE TRIGGER trg_occupants_before_update_workflow BEFORE UPDATE ON room_tenants FOR EACH ROW
BEGIN
  DECLARE v_status VARCHAR(40);
  DECLARE v_rep BIGINT;
  DECLARE v_start DATE;
  DECLARE v_end DATE;
  IF NEW.contract_id <> OLD.contract_id OR NEW.room_id <> OLD.room_id OR NOT (NEW.join_request_id <=> OLD.join_request_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Create a new stay for a different contract or room';
  END IF;
  IF NEW.status <> OLD.status AND NOT ((OLD.status = 'PLANNED' AND NEW.status IN ('ACTIVE','CANCELLED')) OR (OLD.status = 'ACTIVE' AND NEW.status = 'LEFT')) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid stay status transition';
  END IF;
  SELECT status, representative_room_tenant_id, start_date, end_date INTO v_status, v_rep, v_start, v_end FROM contracts WHERE id = NEW.contract_id;
  IF OLD.status = 'PLANNED' AND NEW.status = 'ACTIVE' AND (v_status NOT IN ('CONFIRMED','ACTIVE')
    OR NEW.move_in_date NOT BETWEEN v_start AND v_end OR NEW.move_in_date > DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR)
    OR NEW.move_in_confirmed_at > UTC_TIMESTAMP(6)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot move into a closed or unconfirmed contract';
  END IF;
  IF OLD.status = 'ACTIVE' AND NEW.status = 'LEFT' AND OLD.id = v_rep AND v_status = 'ACTIVE'
    AND EXISTS (SELECT 1 FROM room_tenants WHERE contract_id = OLD.contract_id AND id <> OLD.id AND status IN ('PLANNED','ACTIVE')) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Handover the representative before their departure';
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_rooms_before_update_workflow$$
CREATE TRIGGER trg_rooms_before_update_workflow BEFORE UPDATE ON rooms FOR EACH ROW
BEGIN
  DECLARE v_load BIGINT;
  IF NEW.max_occupants <> OLD.max_occupants THEN
    CALL _v5_room_load(OLD.id, NULL, v_load);
    IF NEW.max_occupants < v_load THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Room capacity cannot be reduced below committed places'; END IF;
  END IF;
  IF NEW.status = 'AVAILABLE' AND (EXISTS (SELECT 1 FROM room_tenants WHERE room_id=OLD.id AND status='ACTIVE')
    OR EXISTS (SELECT 1 FROM contracts WHERE room_id=OLD.id AND status IN ('DRAFT','PENDING_CONFIRMATION','CONFIRMED','ACTIVE'))) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Occupied or reserved room cannot be marked available';
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_join_before_insert_workflow$$
CREATE TRIGGER trg_join_before_insert_workflow BEFORE INSERT ON occupant_join_requests FOR EACH ROW
BEGIN
  IF NEW.status NOT IN ('PENDING_CONSENT','PENDING_LANDLORD') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A join request must start pending'; END IF;
  IF NOT EXISTS (SELECT 1 FROM contracts c JOIN room_tenants rt ON rt.id=c.representative_room_tenant_id
    WHERE c.id=NEW.contract_id AND c.status='ACTIVE' AND rt.status='ACTIVE'
      AND c.representative_room_tenant_id=NEW.representative_room_tenant_id
      AND NEW.planned_move_in_date BETWEEN c.start_date AND c.end_date) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Join request requires a live contract and its current representative';
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_join_before_update_workflow$$
CREATE TRIGGER trg_join_before_update_workflow BEFORE UPDATE ON occupant_join_requests FOR EACH ROW
BEGIN
  DECLARE v_room BIGINT;
  DECLARE v_rep BIGINT;
  DECLARE v_status VARCHAR(40);
  DECLARE v_start DATE;
  DECLARE v_end DATE;
  DECLARE v_capacity INT;
  DECLARE v_load BIGINT;
  IF NEW.contract_id <> OLD.contract_id OR NEW.applicant_id <> OLD.applicant_id
    OR NEW.representative_room_tenant_id <> OLD.representative_room_tenant_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Join request identity and consent representative are immutable';
  END IF;
  IF NEW.status <> OLD.status AND NOT (
    (OLD.status = 'PENDING_CONSENT' AND NEW.status IN ('PENDING_LANDLORD','CANCELLED','EXPIRED'))
    OR (OLD.status = 'PENDING_LANDLORD' AND NEW.status IN ('APPROVED','REJECTED','CANCELLED','EXPIRED'))
    OR (OLD.status = 'APPROVED' AND NEW.status IN ('COMPLETED','CANCELLED','EXPIRED'))
  ) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid join request status transition'; END IF;
  IF NEW.status IN ('APPROVED','COMPLETED') THEN
    SELECT room_id, representative_room_tenant_id, status, start_date, end_date INTO v_room, v_rep, v_status, v_start, v_end FROM contracts WHERE id = NEW.contract_id;
    SELECT max_occupants INTO v_capacity FROM rooms WHERE id = v_room FOR UPDATE;
    IF v_status <> 'ACTIVE' OR v_rep <> NEW.representative_room_tenant_id
      OR DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) NOT BETWEEN v_start AND v_end
      OR NEW.planned_move_in_date NOT BETWEEN v_start AND v_end OR NEW.hold_expires_at <= UTC_TIMESTAMP(6) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Join requires current representative, active contract and unexpired hold';
    END IF;
    IF NEW.status = 'APPROVED' AND OLD.status <> 'APPROVED' THEN
      CALL _v5_room_load(v_room, NEW.id, v_load);
      IF v_load + 1 > v_capacity THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No unreserved room capacity remains'; END IF;
    END IF;
    IF NEW.status = 'COMPLETED' AND (NEW.planned_move_in_date > DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) OR NOT EXISTS (
      SELECT 1 FROM room_tenants WHERE id = NEW.completed_room_tenant_id AND join_request_id = NEW.id AND status = 'ACTIVE'
    )) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Join completion requires an actual linked active stay'; END IF;
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_viewings_before_insert_workflow$$
CREATE TRIGGER trg_viewings_before_insert_workflow BEFORE INSERT ON room_viewing_requests FOR EACH ROW
BEGIN
  DECLARE v_status VARCHAR(40);
  SELECT status INTO v_status FROM rooms WHERE id = NEW.room_id FOR UPDATE;
  IF NEW.status = 'SCHEDULED' THEN
    IF v_status <> 'AVAILABLE' OR NEW.starts_at <= UTC_TIMESTAMP(6) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Viewing must be in the future for an available room'; END IF;
    IF EXISTS (SELECT 1 FROM room_viewing_requests WHERE room_id = NEW.room_id AND status = 'SCHEDULED' AND starts_at < NEW.ends_at AND ends_at > NEW.starts_at) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Viewing interval overlaps an existing appointment';
    END IF;
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_viewings_before_update$$
CREATE TRIGGER trg_viewings_before_update BEFORE UPDATE ON room_viewing_requests FOR EACH ROW
BEGIN
  DECLARE v_room BIGINT;
  SELECT id INTO v_room FROM rooms WHERE id = NEW.room_id FOR UPDATE;
  IF NEW.room_id <> OLD.room_id OR NEW.tenant_id <> OLD.tenant_id OR NEW.created_by_id <> OLD.created_by_id OR NEW.conversation_id <> OLD.conversation_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Viewing participants and room are immutable';
  END IF;
  IF NEW.status <> OLD.status AND NOT (OLD.status = 'SCHEDULED' AND NEW.status IN ('COMPLETED','CANCELLED','NO_SHOW')) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid viewing status transition';
  END IF;
  IF NEW.status = 'COMPLETED' AND NEW.starts_at > UTC_TIMESTAMP(6) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Attendance cannot precede the appointment'; END IF;
  IF NEW.status = 'NO_SHOW' AND NEW.ends_at > UTC_TIMESTAMP(6) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No-show can only be recorded after the appointment ends'; END IF;
  IF NEW.status = 'SCHEDULED' THEN
    IF NEW.starts_at <= UTC_TIMESTAMP(6) AND (NEW.starts_at <> OLD.starts_at OR NEW.ends_at <> OLD.ends_at) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Rescheduled viewing must start in the future'; END IF;
    IF EXISTS (SELECT 1 FROM room_viewing_requests WHERE id <> NEW.id AND room_id = NEW.room_id AND status = 'SCHEDULED' AND starts_at < NEW.ends_at AND ends_at > NEW.starts_at) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Viewing interval overlaps an existing appointment';
    END IF;
  END IF;
  IF OLD.rental_decision <> NEW.rental_decision AND NOT ((OLD.rental_decision = 'WAITING' AND NEW.rental_decision IN ('AGREED','DECLINED')) OR (OLD.rental_decision = 'AGREED' AND NEW.rental_decision = 'WITHDRAWN')) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid rental decision transition';
  END IF;
  IF OLD.rental_decision = 'AGREED' AND NEW.rental_decision <> 'AGREED' AND EXISTS (
    SELECT 1 FROM contracts WHERE viewing_id = OLD.id AND status IN ('DRAFT','PENDING_CONFIRMATION','CONFIRMED','ACTIVE')
  ) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cancel or close the linked contract before withdrawal'; END IF;
END$$

DROP PROCEDURE IF EXISTS sp_handover_representative$$
CREATE PROCEDURE sp_handover_representative(
  IN p_contract BIGINT, IN p_departing BIGINT, IN p_successor BIGINT,
  IN p_actor BIGINT, IN p_reason VARCHAR(1000), IN p_consent_recorded BOOLEAN
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_started BOOLEAN DEFAULT FALSE;
  DECLARE v_room BIGINT;
  DECLARE v_owner BIGINT;
  DECLARE v_rep BIGINT;
  DECLARE v_revision BIGINT;
  DECLARE v_old_history BIGINT;
  DECLARE v_old_tenant BIGINT;
  DECLARE v_tenant BIGINT;
  DECLARE v_name VARCHAR(150);
  DECLARE v_status VARCHAR(40);
  DECLARE v_at DATETIME(6);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN IF v_started THEN ROLLBACK; END IF; RESIGNAL; END;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  START TRANSACTION; SET v_started = TRUE;
  SELECT room_id INTO v_room FROM contracts WHERE id = p_contract;
  SELECT id INTO v_room FROM rooms WHERE id = v_room FOR UPDATE;
  SELECT landlord_id, representative_room_tenant_id, status, current_revision_id
    INTO v_owner, v_rep, v_status, v_revision FROM contracts WHERE id = p_contract FOR UPDATE;
  IF v_owner IS NULL OR NOT (v_owner <=> p_actor) OR v_status <> 'ACTIVE' OR v_rep <> p_departing
    OR p_successor = p_departing OR COALESCE(p_consent_recorded, FALSE) <> TRUE OR NULLIF(TRIM(p_reason), '') IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid actor, current representative, reason or recorded consent';
  END IF;
  SELECT tenant_id INTO v_old_tenant FROM room_tenants WHERE id = p_departing AND contract_id = p_contract AND status = 'ACTIVE' FOR UPDATE;
  SELECT rt.tenant_id, rt.full_name INTO v_tenant, v_name FROM room_tenants rt JOIN users u ON u.id = rt.tenant_id
    WHERE rt.id = p_successor AND rt.contract_id = p_contract AND rt.status = 'ACTIVE' AND u.status = 'ACTIVE' FOR UPDATE;
  IF v_tenant IS NULL OR NOT EXISTS (SELECT 1 FROM room_tenants WHERE id = p_departing AND contract_id = p_contract AND status = 'ACTIVE') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Successor must be another active resident with an active linked account';
  END IF;
  SELECT id INTO v_old_history FROM contract_representative_history WHERE contract_id = p_contract AND room_tenant_id = p_departing AND is_current = TRUE FOR UPDATE;
  IF v_old_history IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Representative history needs reconciliation before handover'; END IF;
  SET v_at = UTC_TIMESTAMP(6);
  UPDATE contract_representative_history SET is_current = FALSE, ended_at = v_at, ended_by_id = p_actor, end_reason = p_reason WHERE id = v_old_history;
  INSERT INTO contract_representative_history
    (contract_id, room_tenant_id, tenant_id, name_snapshot, event_type, previous_history_id, previous_room_tenant_id,
     basis_revision_id, started_at, recorded_by_id, recorded_at, reason, consent_method, consent_recorded_by_id, consent_recorded_at)
  VALUES (p_contract, p_successor, v_tenant, v_name, 'HANDOVER', v_old_history, p_departing,
    v_revision, v_at, p_actor, v_at, p_reason, 'LANDLORD_RECORDED', p_actor, v_at);
  UPDATE contracts SET representative_room_tenant_id = p_successor, updated_at = v_at WHERE id = p_contract;
  UPDATE room_tenants SET status = 'LEFT', move_out_date = DATE(v_at + INTERVAL 7 HOUR),
    move_out_confirmed_by_id = p_actor, move_out_confirmed_at = v_at, updated_at = v_at WHERE id = p_departing;
  CALL _v5_cancel_requests(p_contract, p_actor, 'Representative changed; request new consent from the current representative', NULL);
  INSERT INTO notifications (user_id, type, title, content, resource_type, resource_id, event_key)
  SELECT u.id, 'REPRESENTATIVE_CHANGED', 'Contract representative changed', CONCAT(v_name, ' is now the representative. ', p_reason),
    'CONTRACT', p_contract, CONCAT('representative-history:', h.id)
  FROM contract_representative_history h JOIN users u ON u.id IN (v_old_tenant, v_tenant)
  WHERE h.contract_id = p_contract AND h.is_current = TRUE;
  CALL _v5_sync_room(v_room);
  COMMIT;
END$$

DROP PROCEDURE IF EXISTS sp_approve_occupant_join$$
CREATE PROCEDURE sp_approve_occupant_join(IN p_request BIGINT, IN p_actor BIGINT)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_started BOOLEAN DEFAULT FALSE;
  DECLARE v_contract BIGINT;
  DECLARE v_room BIGINT;
  DECLARE v_owner BIGINT;
  DECLARE v_status VARCHAR(40);
  DECLARE v_applicant BIGINT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN IF v_started THEN ROLLBACK; END IF; RESIGNAL; END;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  START TRANSACTION; SET v_started = TRUE;
  SELECT j.contract_id, c.room_id INTO v_contract, v_room FROM occupant_join_requests j JOIN contracts c ON c.id = j.contract_id WHERE j.id = p_request;
  SELECT id INTO v_room FROM rooms WHERE id = v_room FOR UPDATE;
  SELECT landlord_id INTO v_owner FROM contracts WHERE id = v_contract FOR UPDATE;
  SELECT status, applicant_id INTO v_status, v_applicant FROM occupant_join_requests WHERE id = p_request FOR UPDATE;
  IF v_owner IS NULL OR NOT (v_owner <=> p_actor) OR v_status <> 'PENDING_LANDLORD' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only the owner may approve a pending join request'; END IF;
  IF EXISTS (SELECT 1 FROM room_tenants WHERE tenant_id = v_applicant AND (status = 'ACTIVE' OR (contract_id = v_contract AND status = 'PLANNED'))) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Applicant already has an open stay';
  END IF;
  UPDATE occupant_join_requests SET status = 'EXPIRED', updated_at = UTC_TIMESTAMP(6)
    WHERE contract_id = v_contract AND status = 'APPROVED' AND hold_expires_at <= UTC_TIMESTAMP(6);
  UPDATE occupant_join_requests SET status = 'APPROVED', reviewed_by_id = p_actor, reviewed_at = UTC_TIMESTAMP(6),
    hold_expires_at = UTC_TIMESTAMP(6) + INTERVAL 48 HOUR, updated_at = UTC_TIMESTAMP(6) WHERE id = p_request;
  COMMIT;
END$$

DROP PROCEDURE IF EXISTS sp_complete_occupant_join$$
CREATE PROCEDURE sp_complete_occupant_join(IN p_request BIGINT, IN p_actor BIGINT)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_started BOOLEAN DEFAULT FALSE;
  DECLARE v_contract BIGINT;
  DECLARE v_room BIGINT;
  DECLARE v_owner BIGINT;
  DECLARE v_applicant BIGINT;
  DECLARE v_status VARCHAR(40);
  DECLARE v_contract_status VARCHAR(40);
  DECLARE v_hold DATETIME(6);
  DECLARE v_date DATE;
  DECLARE v_member BIGINT;
  DECLARE v_today DATE;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN IF v_started THEN ROLLBACK; END IF; RESIGNAL; END;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  START TRANSACTION; SET v_started = TRUE;
  SET v_today = DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR);
  SELECT j.contract_id, c.room_id INTO v_contract, v_room FROM occupant_join_requests j JOIN contracts c ON c.id = j.contract_id WHERE j.id = p_request;
  SELECT id INTO v_room FROM rooms WHERE id = v_room FOR UPDATE;
  SELECT landlord_id, status INTO v_owner, v_contract_status FROM contracts WHERE id = v_contract FOR UPDATE;
  SELECT status, applicant_id, hold_expires_at, planned_move_in_date INTO v_status, v_applicant, v_hold, v_date FROM occupant_join_requests WHERE id = p_request FOR UPDATE;
  IF v_owner IS NULL OR NOT (v_owner <=> p_actor) OR v_contract_status <> 'ACTIVE' OR v_status <> 'APPROVED'
    OR v_hold <= UTC_TIMESTAMP(6) OR v_date > v_today THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Join is not currently eligible for actual move-in'; END IF;
  IF EXISTS (SELECT 1 FROM room_tenants WHERE tenant_id = v_applicant AND status = 'ACTIVE') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Applicant is already residing elsewhere'; END IF;
  INSERT INTO room_tenants (contract_id, room_id, tenant_id, full_name, status, intake_source, join_request_id,
    planned_move_in_date, move_in_date, move_in_confirmed_by_id, move_in_confirmed_at)
  SELECT v_contract, v_room, u.id, u.full_name, 'ACTIVE', 'APPROVED_JOIN', p_request,
    v_date, v_today, p_actor, UTC_TIMESTAMP(6) FROM users u WHERE u.id = v_applicant AND u.status = 'ACTIVE';
  IF ROW_COUNT() <> 1 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Applicant account is not active'; END IF;
  SET v_member = LAST_INSERT_ID();
  UPDATE occupant_join_requests SET status = 'COMPLETED', completed_room_tenant_id = v_member,
    completed_at = UTC_TIMESTAMP(6), updated_at = UTC_TIMESTAMP(6) WHERE id = p_request;
  CALL _v5_sync_room(v_room);
  COMMIT;
END$$

DROP PROCEDURE IF EXISTS sp_confirm_move_in$$
CREATE PROCEDURE sp_confirm_move_in(IN p_contract BIGINT, IN p_members JSON, IN p_date DATE, IN p_actor BIGINT)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_started BOOLEAN DEFAULT FALSE;
  DECLARE v_room BIGINT;
  DECLARE v_owner BIGINT;
  DECLARE v_rep BIGINT;
  DECLARE v_status VARCHAR(40);
  DECLARE v_start DATE;
  DECLARE v_end DATE;
  DECLARE v_count INT;
  DECLARE v_distinct INT;
  DECLARE v_valid INT;
  DECLARE v_capacity INT;
  DECLARE v_load BIGINT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN IF v_started THEN ROLLBACK; END IF; RESIGNAL; END;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  START TRANSACTION; SET v_started = TRUE;
  SELECT room_id INTO v_room FROM contracts WHERE id = p_contract;
  SELECT max_occupants INTO v_capacity FROM rooms WHERE id = v_room FOR UPDATE;
  SELECT landlord_id, representative_room_tenant_id, status, start_date, end_date INTO v_owner, v_rep, v_status, v_start, v_end FROM contracts WHERE id = p_contract FOR UPDATE;
  IF v_owner IS NULL OR NOT (v_owner <=> p_actor) OR v_status NOT IN ('CONFIRMED','ACTIVE') OR p_date IS NULL
    OR p_date NOT BETWEEN v_start AND v_end OR p_date > DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR)
    OR p_members IS NULL OR JSON_TYPE(p_members) <> 'ARRAY' OR JSON_LENGTH(p_members) = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Move-in requires selected planned members and a valid actual date';
  END IF;
  SELECT COUNT(*), COUNT(DISTINCT ids.id), COUNT(rt.id) INTO v_count, v_distinct, v_valid
    FROM JSON_TABLE(p_members, '$[*]' COLUMNS(id BIGINT PATH '$' ERROR ON ERROR)) ids
    LEFT JOIN room_tenants rt ON rt.id = ids.id AND rt.contract_id = p_contract AND rt.status = 'PLANNED';
  IF v_count <> v_distinct OR v_count <> v_valid THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Every selected member must be a distinct planned stay in this contract'; END IF;
  IF v_status = 'CONFIRMED' AND NOT JSON_CONTAINS(p_members, CAST(v_rep AS JSON)) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Select the representative when activating the contract'; END IF;
  CALL _v5_room_load(v_room, NULL, v_load);
  IF v_load > v_capacity THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Committed room capacity is exceeded'; END IF;
  UPDATE room_tenants rt JOIN JSON_TABLE(p_members, '$[*]' COLUMNS(id BIGINT PATH '$')) ids ON ids.id = rt.id
    SET rt.status = 'ACTIVE', rt.move_in_date = p_date, rt.move_in_confirmed_by_id = p_actor,
      rt.move_in_confirmed_at = UTC_TIMESTAMP(6), rt.updated_at = UTC_TIMESTAMP(6) WHERE rt.contract_id = p_contract;
  UPDATE contracts SET status = 'ACTIVE', activated_at = COALESCE(activated_at, UTC_TIMESTAMP(6)), updated_at = UTC_TIMESTAMP(6) WHERE id = p_contract;
  CALL _v5_sync_room(v_room);
  COMMIT;
END$$

DROP PROCEDURE IF EXISTS _v5_close_stays$$
CREATE PROCEDURE _v5_close_stays(IN p_contract BIGINT, IN p_date DATE, IN p_actor BIGINT, IN p_reason VARCHAR(1000), IN p_keep_change BIGINT)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_rep BIGINT;
  SELECT representative_room_tenant_id INTO v_rep FROM contracts WHERE id = p_contract;
  IF p_date IS NULL OR p_date > DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR)
    OR EXISTS (SELECT 1 FROM room_tenants WHERE contract_id = p_contract AND status = 'ACTIVE' AND move_in_date > p_date) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Departure date cannot precede move-in or be in the future';
  END IF;
  UPDATE room_tenants SET status = 'CANCELLED', cancellation_reason = p_reason, updated_at = UTC_TIMESTAMP(6)
    WHERE contract_id = p_contract AND status = 'PLANNED';
  UPDATE room_tenants SET status = 'LEFT', move_out_date = p_date, move_out_confirmed_by_id = p_actor,
    move_out_confirmed_at = UTC_TIMESTAMP(6), updated_at = UTC_TIMESTAMP(6)
    WHERE contract_id = p_contract AND status = 'ACTIVE' AND id <> v_rep;
  UPDATE room_tenants SET status = 'LEFT', move_out_date = p_date, move_out_confirmed_by_id = p_actor,
    move_out_confirmed_at = UTC_TIMESTAMP(6), updated_at = UTC_TIMESTAMP(6)
    WHERE contract_id = p_contract AND status = 'ACTIVE' AND id = v_rep;
  CALL _v5_cancel_requests(p_contract, p_actor, p_reason, p_keep_change);
END$$

DROP PROCEDURE IF EXISTS sp_move_out$$
CREATE PROCEDURE sp_move_out(IN p_contract BIGINT, IN p_member BIGINT, IN p_date DATE, IN p_actor BIGINT)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_started BOOLEAN DEFAULT FALSE;
  DECLARE v_room BIGINT;
  DECLARE v_owner BIGINT;
  DECLARE v_status VARCHAR(40);
  DECLARE v_rep BIGINT;
  DECLARE v_move_in DATE;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN IF v_started THEN ROLLBACK; END IF; RESIGNAL; END;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  START TRANSACTION; SET v_started = TRUE;
  SELECT room_id INTO v_room FROM contracts WHERE id = p_contract;
  SELECT id INTO v_room FROM rooms WHERE id = v_room FOR UPDATE;
  SELECT landlord_id, status, representative_room_tenant_id INTO v_owner, v_status, v_rep FROM contracts WHERE id = p_contract FOR UPDATE;
  SELECT move_in_date INTO v_move_in FROM room_tenants WHERE id = p_member AND contract_id = p_contract AND status = 'ACTIVE' FOR UPDATE;
  IF v_owner IS NULL OR NOT (v_owner <=> p_actor) OR v_move_in IS NULL OR p_date IS NULL OR p_date < v_move_in OR p_date > DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid owner or actual departure date'; END IF;
  IF p_member = v_rep AND EXISTS (SELECT 1 FROM room_tenants WHERE contract_id = p_contract AND id <> p_member AND status IN ('ACTIVE','PLANNED')) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Choose and confirm a successor before representative departure'; END IF;
  UPDATE room_tenants SET status = 'LEFT', move_out_date = p_date, move_out_confirmed_by_id = p_actor,
    move_out_confirmed_at = UTC_TIMESTAMP(6), updated_at = UTC_TIMESTAMP(6) WHERE id = p_member;
  IF NOT EXISTS (SELECT 1 FROM room_tenants WHERE contract_id = p_contract AND status IN ('ACTIVE','PLANNED')) AND v_status IN ('DRAFT','PENDING_CONFIRMATION','CONFIRMED','ACTIVE') THEN
    CALL _v5_cancel_requests(p_contract, p_actor, 'Last resident left the room', NULL);
    UPDATE contracts SET status = 'TERMINATED', closed_at = UTC_TIMESTAMP(6), closure_reason = 'Last resident left the room', updated_at = UTC_TIMESTAMP(6) WHERE id = p_contract;
  END IF;
  CALL _v5_sync_room(v_room);
  COMMIT;
END$$

DROP PROCEDURE IF EXISTS sp_cancel_contract$$
CREATE PROCEDURE sp_cancel_contract(IN p_contract BIGINT, IN p_actor BIGINT, IN p_reason VARCHAR(1000))
SQL SECURITY DEFINER
BEGIN
  DECLARE v_started BOOLEAN DEFAULT FALSE;
  DECLARE v_room BIGINT;
  DECLARE v_owner BIGINT;
  DECLARE v_status VARCHAR(40);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN IF v_started THEN ROLLBACK; END IF; RESIGNAL; END;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  START TRANSACTION; SET v_started = TRUE;
  SELECT room_id INTO v_room FROM contracts WHERE id = p_contract;
  SELECT id INTO v_room FROM rooms WHERE id = v_room FOR UPDATE;
  SELECT landlord_id, status INTO v_owner, v_status FROM contracts WHERE id = p_contract FOR UPDATE;
  IF v_owner IS NULL OR NOT (v_owner <=> p_actor) OR v_status NOT IN ('DRAFT','PENDING_CONFIRMATION','CONFIRMED')
    OR NULLIF(TRIM(p_reason), '') IS NULL OR EXISTS (SELECT 1 FROM room_tenants WHERE contract_id = p_contract AND status = 'ACTIVE') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only an unoccupied unactivated contract can be cancelled';
  END IF;
  CALL _v5_close_stays(p_contract, DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR), p_actor, p_reason, NULL);
  UPDATE contracts SET status = 'CANCELLED', closed_at = UTC_TIMESTAMP(6), closure_reason = p_reason, updated_at = UTC_TIMESTAMP(6) WHERE id = p_contract;
  CALL _v5_sync_room(v_room);
  COMMIT;
END$$

DROP PROCEDURE IF EXISTS sp_set_room_capacity$$
CREATE PROCEDURE sp_set_room_capacity(IN p_room BIGINT, IN p_capacity INT, IN p_actor BIGINT)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_started BOOLEAN DEFAULT FALSE;
  DECLARE v_owner BIGINT;
  DECLARE v_load BIGINT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN IF v_started THEN ROLLBACK; END IF; RESIGNAL; END;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  START TRANSACTION; SET v_started = TRUE;
  SELECT h.landlord_id INTO v_owner FROM rooms r JOIN rental_houses h ON h.id = r.house_id WHERE r.id = p_room FOR UPDATE;
  IF v_owner IS NULL OR NOT (v_owner <=> p_actor) OR p_capacity IS NULL OR p_capacity <= 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid room owner or capacity'; END IF;
  CALL _v5_room_load(p_room, NULL, v_load);
  IF p_capacity < v_load THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Capacity cannot be less than active, planned and held places'; END IF;
  UPDATE rooms SET max_occupants = p_capacity, updated_at = UTC_TIMESTAMP(6) WHERE id = p_room;
  COMMIT;
END$$

DROP PROCEDURE IF EXISTS sp_schedule_viewing$$
CREATE PROCEDURE sp_schedule_viewing(IN p_conversation BIGINT, IN p_room BIGINT, IN p_tenant BIGINT, IN p_actor BIGINT, IN p_starts_at_utc DATETIME(6), IN p_duration_minutes INT, IN p_notes VARCHAR(2000), OUT p_viewing BIGINT)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_started BOOLEAN DEFAULT FALSE;
  DECLARE v_house BIGINT;
  DECLARE v_owner BIGINT;
  DECLARE v_status VARCHAR(40);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN IF v_started THEN ROLLBACK; END IF; RESIGNAL; END;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  START TRANSACTION; SET v_started = TRUE;
  SELECT r.house_id, h.landlord_id, r.status INTO v_house, v_owner, v_status FROM rooms r JOIN rental_houses h ON h.id = r.house_id WHERE r.id = p_room FOR UPDATE;
  IF v_owner IS NULL OR NOT (v_owner <=> p_actor) OR v_status <> 'AVAILABLE' OR p_starts_at_utc IS NULL OR p_starts_at_utc <= UTC_TIMESTAMP(6)
    OR p_duration_minutes IS NULL OR p_duration_minutes NOT IN (30,60,90,120) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid owner, available room or future UTC viewing interval'; END IF;
  IF EXISTS (SELECT 1 FROM contracts WHERE room_id = p_room AND status IN ('DRAFT','PENDING_CONFIRMATION','CONFIRMED','ACTIVE'))
    OR EXISTS (SELECT 1 FROM room_tenants WHERE room_id = p_room AND status = 'ACTIVE') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Room is already occupied or reserved'; END IF;
  INSERT INTO room_viewing_requests(room_id, house_id, conversation_id, tenant_id, created_by_id, starts_at, ends_at, notes)
    VALUES(p_room, v_house, p_conversation, p_tenant, p_actor, p_starts_at_utc, p_starts_at_utc + INTERVAL p_duration_minutes MINUTE, p_notes);
  SET p_viewing = LAST_INSERT_ID();
  COMMIT;
END$$

DROP PROCEDURE IF EXISTS sp_set_viewing_outcome$$
CREATE PROCEDURE sp_set_viewing_outcome(IN p_viewing BIGINT, IN p_actor BIGINT, IN p_action VARCHAR(40), IN p_reason VARCHAR(1000))
SQL SECURITY DEFINER
BEGIN
  DECLARE v_started BOOLEAN DEFAULT FALSE;
  DECLARE v_room BIGINT;
  DECLARE v_owner BIGINT;
  DECLARE v_tenant BIGINT;
  DECLARE v_status VARCHAR(40);
  DECLARE v_decision VARCHAR(40);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN IF v_started THEN ROLLBACK; END IF; RESIGNAL; END;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  START TRANSACTION; SET v_started = TRUE;
  SELECT room_id INTO v_room FROM room_viewing_requests WHERE id = p_viewing;
  SELECT id INTO v_room FROM rooms WHERE id = v_room FOR UPDATE;
  SELECT created_by_id, tenant_id, status, rental_decision INTO v_owner, v_tenant, v_status, v_decision FROM room_viewing_requests WHERE id = p_viewing FOR UPDATE;
  IF v_owner IS NULL OR p_actor IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unknown viewing or actor'; END IF;
  IF p_action IN ('ATTENDED','NO_SHOW') THEN
    IF p_actor <> v_owner OR v_status <> 'SCHEDULED' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only the owner may record viewing attendance'; END IF;
    IF p_action = 'ATTENDED' THEN
      UPDATE room_viewing_requests SET status = 'COMPLETED', attendance_confirmed_by_id = p_actor, attendance_confirmed_at = UTC_TIMESTAMP(6), updated_at = UTC_TIMESTAMP(6) WHERE id = p_viewing;
    ELSE UPDATE room_viewing_requests SET status = 'NO_SHOW', updated_at = UTC_TIMESTAMP(6) WHERE id = p_viewing; END IF;
  ELSEIF p_action = 'CANCEL' THEN
    IF p_actor NOT IN (v_owner,v_tenant) OR v_status <> 'SCHEDULED' OR NULLIF(TRIM(p_reason),'') IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cancellation requires a participant and a reason'; END IF;
    UPDATE room_viewing_requests SET status = 'CANCELLED', cancelled_at = UTC_TIMESTAMP(6), cancelled_by_id = p_actor, cancellation_reason = p_reason, updated_at = UTC_TIMESTAMP(6) WHERE id = p_viewing;
  ELSEIF p_action IN ('AGREE','DECLINE') THEN
    IF p_actor <> v_tenant OR v_status <> 'COMPLETED' OR v_decision <> 'WAITING' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only the viewing tenant may decide once after attendance'; END IF;
    UPDATE room_viewing_requests SET rental_decision = IF(p_action = 'AGREE','AGREED','DECLINED'),
      rental_decided_by_id = p_actor, rental_decided_at = UTC_TIMESTAMP(6), updated_at = UTC_TIMESTAMP(6) WHERE id = p_viewing;
  ELSEIF p_action = 'WITHDRAW' THEN
    IF p_actor <> v_tenant OR v_decision <> 'AGREED' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only an agreed viewing tenant may withdraw'; END IF;
    UPDATE room_viewing_requests SET rental_decision = 'WITHDRAWN', rental_withdrawn_at = UTC_TIMESTAMP(6), updated_at = UTC_TIMESTAMP(6) WHERE id = p_viewing;
  ELSE SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unknown viewing action'; END IF;
  COMMIT;
END$$

DROP PROCEDURE IF EXISTS sp_create_rental_contract$$
CREATE PROCEDURE sp_create_rental_contract(IN p_viewing BIGINT, IN p_actor BIGINT, IN p_number VARCHAR(100), IN p_start DATE, IN p_end DATE, IN p_rent DECIMAL(15,2), IN p_deposit DECIMAL(15,2), IN p_content LONGTEXT, IN p_template BIGINT, IN p_extra_members JSON, OUT p_contract BIGINT)
SQL SECURITY DEFINER
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
  START TRANSACTION; SET v_started = TRUE;
  SELECT room_id INTO v_room FROM room_viewing_requests WHERE id = p_viewing;
  SELECT house_id, max_occupants INTO v_house, v_capacity FROM rooms WHERE id = v_room FOR UPDATE;
  SELECT created_by_id, tenant_id, status, rental_decision INTO v_owner, v_tenant, v_status, v_decision FROM room_viewing_requests WHERE id = p_viewing FOR UPDATE;
  IF v_owner IS NULL OR NOT (v_owner <=> p_actor) OR v_status <> 'COMPLETED' OR v_decision <> 'AGREED'
    OR p_start IS NULL OR p_end IS NULL OR p_end < p_start OR p_rent IS NULL OR p_rent < 0 OR p_deposit IS NULL OR p_deposit < 0
    OR NULLIF(TRIM(p_number),'') IS NULL OR NULLIF(TRIM(p_content),'') IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid completed viewing, owner or contract terms'; END IF;
  SET p_extra_members = COALESCE(p_extra_members, JSON_ARRAY());
  IF JSON_TYPE(p_extra_members) <> 'ARRAY' OR JSON_LENGTH(p_extra_members) + 1 > v_capacity THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Initial members exceed room capacity'; END IF;
  IF EXISTS (SELECT 1 FROM JSON_TABLE(p_extra_members, '$[*]' COLUMNS(full_name VARCHAR(150) PATH '$.full_name' NULL ON EMPTY)) x WHERE NULLIF(TRIM(x.full_name),'') IS NULL) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Each initial member needs a name'; END IF;
  INSERT INTO contracts(contract_number,room_id,house_id,landlord_id,viewing_id,viewing_tenant_id,source,status,start_date,end_date,rent_amount,deposit_amount)
    VALUES(p_number,v_room,v_house,p_actor,p_viewing,v_tenant,'NEW_RENTAL','DRAFT',p_start,p_end,p_rent,p_deposit);
  SET p_contract = LAST_INSERT_ID();
  INSERT INTO room_tenants(contract_id,room_id,tenant_id,full_name,status,intake_source,planned_move_in_date)
    SELECT p_contract,v_room,u.id,u.full_name,'PLANNED','INITIAL_CONTRACT',p_start FROM users u WHERE u.id=v_tenant AND u.status='ACTIVE';
  IF ROW_COUNT() <> 1 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Representative account is not active'; END IF;
  SET v_rep = LAST_INSERT_ID();
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
  SET v_revision = LAST_INSERT_ID();
  UPDATE contracts SET representative_room_tenant_id=v_rep,current_revision_id=v_revision,status='PENDING_CONFIRMATION',updated_at=UTC_TIMESTAMP(6) WHERE id=p_contract;
  INSERT INTO notifications(user_id,type,title,content,resource_type,resource_id,event_key)
    VALUES(v_tenant,'CONTRACT_SENT','Contract confirmation requested',p_number,'CONTRACT',p_contract,CONCAT('contract-sent:',v_revision));
  CALL _v5_sync_room(v_room);
  COMMIT;
END$$

DROP PROCEDURE IF EXISTS sp_confirm_contract$$
CREATE PROCEDURE sp_confirm_contract(IN p_contract BIGINT, IN p_tenant BIGINT)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_started BOOLEAN DEFAULT FALSE;
  DECLARE v_room BIGINT;
  DECLARE v_revision BIGINT;
  DECLARE v_rep BIGINT;
  DECLARE v_tenant BIGINT;
  DECLARE v_status VARCHAR(40);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN IF v_started THEN ROLLBACK; END IF; RESIGNAL; END;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  START TRANSACTION; SET v_started = TRUE;
  SELECT room_id INTO v_room FROM contracts WHERE id=p_contract;
  SELECT id INTO v_room FROM rooms WHERE id=v_room FOR UPDATE;
  SELECT current_revision_id,representative_room_tenant_id,status INTO v_revision,v_rep,v_status FROM contracts WHERE id=p_contract FOR UPDATE;
  SELECT tenant_id INTO v_tenant FROM room_tenants WHERE id=v_rep;
  IF v_tenant IS NULL OR NOT (v_tenant <=> p_tenant) OR v_status <> 'PENDING_CONFIRMATION' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only the current representative may confirm the pending contract'; END IF;
  UPDATE contract_revisions SET status='CONFIRMED',tenant_confirmed_by_id=p_tenant,tenant_confirmed_at=UTC_TIMESTAMP(6),applied_at=UTC_TIMESTAMP(6),updated_at=UTC_TIMESTAMP(6)
    WHERE id=v_revision AND contract_id=p_contract AND status='PENDING_CONFIRMATION';
  IF ROW_COUNT() <> 1 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Current revision is not pending confirmation'; END IF;
  UPDATE contracts SET status='CONFIRMED',updated_at=UTC_TIMESTAMP(6) WHERE id=p_contract;
  COMMIT;
END$$

DROP PROCEDURE IF EXISTS sp_cancel_planned_member$$
CREATE PROCEDURE sp_cancel_planned_member(IN p_contract BIGINT, IN p_member BIGINT, IN p_actor BIGINT, IN p_reason VARCHAR(1000))
SQL SECURITY DEFINER
BEGIN
  DECLARE v_started BOOLEAN DEFAULT FALSE;
  DECLARE v_room BIGINT;
  DECLARE v_owner BIGINT;
  DECLARE v_rep BIGINT;
  DECLARE v_status VARCHAR(40);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN IF v_started THEN ROLLBACK; END IF; RESIGNAL; END;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  START TRANSACTION; SET v_started = TRUE;
  SELECT room_id INTO v_room FROM contracts WHERE id=p_contract;
  SELECT id INTO v_room FROM rooms WHERE id=v_room FOR UPDATE;
  SELECT landlord_id,representative_room_tenant_id,status INTO v_owner,v_rep,v_status FROM contracts WHERE id=p_contract FOR UPDATE;
  IF v_owner IS NULL OR NOT (v_owner <=> p_actor) OR p_member=v_rep OR v_status NOT IN ('DRAFT','PENDING_CONFIRMATION','CONFIRMED','ACTIVE') OR NULLIF(TRIM(p_reason),'') IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot cancel this planned member separately'; END IF;
  UPDATE room_tenants SET status='CANCELLED',cancellation_reason=p_reason,updated_at=UTC_TIMESTAMP(6) WHERE id=p_member AND contract_id=p_contract AND status='PLANNED';
  IF ROW_COUNT() <> 1 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Member is not a planned stay in this contract'; END IF;
  CALL _v5_sync_room(v_room);
  COMMIT;
END$$

DROP PROCEDURE IF EXISTS sp_cancel_join_hold$$
CREATE PROCEDURE sp_cancel_join_hold(IN p_request BIGINT, IN p_actor BIGINT, IN p_reason VARCHAR(1000))
SQL SECURITY DEFINER
BEGIN
  DECLARE v_started BOOLEAN DEFAULT FALSE;
  DECLARE v_room BIGINT;
  DECLARE v_owner BIGINT;
  DECLARE v_contract BIGINT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN IF v_started THEN ROLLBACK; END IF; RESIGNAL; END;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  START TRANSACTION; SET v_started = TRUE;
  SELECT j.contract_id,c.room_id INTO v_contract,v_room FROM occupant_join_requests j JOIN contracts c ON c.id=j.contract_id WHERE j.id=p_request;
  SELECT id INTO v_room FROM rooms WHERE id=v_room FOR UPDATE;
  SELECT landlord_id INTO v_owner FROM contracts WHERE id=v_contract FOR UPDATE;
  IF v_owner IS NULL OR NOT (v_owner <=> p_actor) OR NULLIF(TRIM(p_reason),'') IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cancelling a hold requires the owner and a reason'; END IF;
  UPDATE occupant_join_requests SET status='CANCELLED',cancelled_at=UTC_TIMESTAMP(6),cancelled_by_id=p_actor,cancellation_reason=p_reason,updated_at=UTC_TIMESTAMP(6)
    WHERE id=p_request AND status='APPROVED';
  IF ROW_COUNT() <> 1 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Request is not an approved hold'; END IF;
  COMMIT;
END$$

DROP PROCEDURE IF EXISTS sp_apply_contract_change$$
CREATE PROCEDURE sp_apply_contract_change(IN p_request BIGINT, IN p_actor BIGINT, OUT p_result_contract BIGINT)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_started BOOLEAN DEFAULT FALSE;
  DECLARE v_contract BIGINT;
  DECLARE v_room BIGINT;
  DECLARE v_target BIGINT;
  DECLARE v_lock BIGINT;
  DECLARE v_owner BIGINT;
  DECLARE v_rep BIGINT;
  DECLARE v_rep_tenant BIGINT;
  DECLARE v_revision BIGINT;
  DECLARE v_base BIGINT;
  DECLARE v_proposed BIGINT;
  DECLARE v_kind VARCHAR(40);
  DECLARE v_request_status VARCHAR(40);
  DECLARE v_contract_status VARCHAR(40);
  DECLARE v_effective DATE;
  DECLARE v_start DATE;
  DECLARE v_end DATE;
  DECLARE v_rent DECIMAL(15,2);
  DECLARE v_deposit DECIMAL(15,2);
  DECLARE v_content LONGTEXT;
  DECLARE v_proposal JSON;
  DECLARE v_snapshot JSON;
  DECLARE v_house BIGINT;
  DECLARE v_capacity INT;
  DECLARE v_count INT;
  DECLARE v_next_rep BIGINT;
  DECLARE v_next_revision BIGINT;
  DECLARE v_confirmation BIGINT;
  DECLARE v_target_owner BIGINT;
  DECLARE v_target_status VARCHAR(40);
  DECLARE v_target_price DECIMAL(15,2);
  DECLARE v_target_deposit DECIMAL(15,2);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN IF v_started THEN ROLLBACK; END IF; RESIGNAL; END;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  START TRANSACTION; SET v_started = TRUE;
  SET p_result_contract = NULL;
  SELECT x.contract_id,c.room_id,x.target_room_id INTO v_contract,v_room,v_target FROM contract_change_requests x JOIN contracts c ON c.id=x.contract_id WHERE x.id=p_request;
  IF v_room IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Unknown contract change'; END IF;
  SELECT id INTO v_lock FROM rooms WHERE id=LEAST(v_room,COALESCE(v_target,v_room)) FOR UPDATE;
  IF v_target IS NOT NULL AND v_target<>v_room THEN SELECT id INTO v_lock FROM rooms WHERE id=GREATEST(v_room,v_target) FOR UPDATE; END IF;
  SELECT landlord_id,representative_room_tenant_id,current_revision_id,status,start_date INTO v_owner,v_rep,v_revision,v_contract_status,v_start FROM contracts WHERE id=v_contract FOR UPDATE;
  SELECT type,status,requested_effective_date,base_revision_id,proposed_revision_id,proposal_snapshot,tenant_confirmed_by_id
    INTO v_kind,v_request_status,v_effective,v_base,v_proposed,v_proposal,v_confirmation FROM contract_change_requests WHERE id=p_request FOR UPDATE;
  SELECT tenant_id INTO v_rep_tenant FROM room_tenants WHERE id=v_rep AND status='ACTIVE';
  IF NOT (v_owner <=> p_actor) OR v_contract_status<>'ACTIVE' OR v_request_status<>'READY_TO_APPLY'
    OR v_base<>v_revision OR NOT (v_confirmation <=> v_rep_tenant) OR v_rep_tenant IS NULL
    OR v_effective>DATE(UTC_TIMESTAMP()+INTERVAL 7 HOUR) OR v_effective<v_start THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Change requires the owner, active contract, current revision and current representative confirmation';
  END IF;
  IF v_kind='RENEWAL' THEN
    SELECT end_date,rent_amount,deposit_amount INTO v_end,v_rent,v_deposit FROM contract_revisions
      WHERE id=v_proposed AND contract_id=v_contract AND kind='RENEWAL' AND status='CONFIRMED'
        AND representative_room_tenant_id=v_rep AND effective_from=v_effective;
    IF v_end IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Renewal requires its confirmed proposed revision'; END IF;
    UPDATE contract_revisions SET status='SUPERSEDED',updated_at=UTC_TIMESTAMP(6) WHERE id=v_revision;
    UPDATE contracts SET end_date=v_end,rent_amount=v_rent,deposit_amount=v_deposit,current_revision_id=v_proposed,updated_at=UTC_TIMESTAMP(6) WHERE id=v_contract;
    UPDATE contract_revisions SET applied_at=UTC_TIMESTAMP(6),updated_at=UTC_TIMESTAMP(6) WHERE id=v_proposed;
  ELSEIF v_kind='TERMINATION' THEN
    CALL _v5_close_stays(v_contract,v_effective,p_actor,'Contract terminated by confirmed request',p_request);
    UPDATE contracts SET status='TERMINATED',closed_at=UTC_TIMESTAMP(6),closure_reason='Contract terminated by confirmed request',updated_at=UTC_TIMESTAMP(6) WHERE id=v_contract;
    CALL _v5_sync_room(v_room);
  ELSEIF v_kind='TRANSFER' THEN
    SELECT r.house_id,h.landlord_id,r.status,r.max_occupants,r.rent_price,r.deposit_amount INTO v_house,v_target_owner,v_target_status,v_capacity,v_target_price,v_target_deposit
      FROM rooms r JOIN rental_houses h ON h.id=r.house_id WHERE r.id=v_target;
    SELECT COUNT(*) INTO v_count FROM room_tenants WHERE contract_id=v_contract AND status IN ('ACTIVE','PLANNED');
    IF v_target IS NULL OR v_target=v_room OR NOT (v_target_owner <=> p_actor) OR v_target_status<>'AVAILABLE' OR v_count>v_capacity
      OR EXISTS(SELECT 1 FROM room_tenants WHERE room_id=v_target AND status='ACTIVE')
      OR EXISTS(SELECT 1 FROM contracts WHERE room_id=v_target AND status IN ('DRAFT','PENDING_CONFIRMATION','CONFIRMED','ACTIVE')) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Transfer target must be an available room of the same owner with enough capacity';
    END IF;
    SET v_content=JSON_UNQUOTE(JSON_EXTRACT(v_proposal,'$.content'));
    SET v_end=CAST(JSON_UNQUOTE(JSON_EXTRACT(v_proposal,'$.end_date')) AS DATE);
    SET v_rent=COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(v_proposal,'$.rent_amount')) AS DECIMAL(15,2)),v_target_price);
    SET v_deposit=COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(v_proposal,'$.deposit_amount')) AS DECIMAL(15,2)),v_target_deposit);
    IF NULLIF(TRIM(v_content),'') IS NULL OR v_end IS NULL OR v_end<v_effective OR v_rent<0 OR v_deposit<0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Confirmed transfer proposal needs target content and a valid end date';
    END IF;
    INSERT INTO contracts(contract_number,room_id,house_id,landlord_id,previous_contract_id,source,status,start_date,end_date,rent_amount,deposit_amount)
      VALUES(CONCAT('TRANSFER-',p_request),v_target,v_house,p_actor,v_contract,'TRANSFER','DRAFT',v_effective,v_end,v_rent,v_deposit);
    SET p_result_contract=LAST_INSERT_ID();
    INSERT INTO room_tenants(contract_id,room_id,tenant_id,full_name,phone_number,identity_number,date_of_birth,gender,permanent_address,status,intake_source,planned_move_in_date)
      SELECT p_result_contract,v_target,tenant_id,full_name,phone_number,identity_number,date_of_birth,gender,permanent_address,'PLANNED','TRANSFER',v_effective
      FROM room_tenants WHERE contract_id=v_contract AND status IN ('ACTIVE','PLANNED');
    SELECT id INTO v_next_rep FROM room_tenants WHERE contract_id=p_result_contract AND tenant_id=v_rep_tenant;
    SELECT JSON_ARRAYAGG(JSON_OBJECT('room_tenant_id',id,'tenant_id',tenant_id,'full_name',full_name)) INTO v_snapshot FROM room_tenants WHERE contract_id=p_result_contract;
    INSERT INTO contract_revisions(contract_id,revision_number,created_by_id,kind,status,start_date,end_date,effective_from,rent_amount,deposit_amount,content,members_snapshot,representative_room_tenant_id,landlord_confirmed_by_id,landlord_confirmed_at,tenant_confirmed_by_id,tenant_confirmed_at,applied_at)
      SELECT p_result_contract,1,p_actor,'TRANSFER','CONFIRMED',v_effective,v_end,v_effective,v_rent,v_deposit,v_content,v_snapshot,v_next_rep,p_actor,x.reviewed_at,v_confirmation,x.tenant_confirmed_at,UTC_TIMESTAMP(6)
      FROM contract_change_requests x WHERE x.id=p_request;
    SET v_next_revision=LAST_INSERT_ID();
    UPDATE contracts SET representative_room_tenant_id=v_next_rep,current_revision_id=v_next_revision,status='CONFIRMED',updated_at=UTC_TIMESTAMP(6) WHERE id=p_result_contract;
    CALL _v5_close_stays(v_contract,v_effective,p_actor,'Transferred to another contract',p_request);
    UPDATE contracts SET status='TERMINATED',closed_at=UTC_TIMESTAMP(6),closure_reason='Transferred to another contract',updated_at=UTC_TIMESTAMP(6) WHERE id=v_contract;
    CALL _v5_sync_room(v_room); CALL _v5_sync_room(v_target);
  ELSE SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Unknown contract change type'; END IF;
  UPDATE contract_change_requests SET status='COMPLETED',result_contract_id=p_result_contract,applied_by_id=p_actor,applied_at=UTC_TIMESTAMP(6),updated_at=UTC_TIMESTAMP(6) WHERE id=p_request;
  COMMIT;
END$$

DELIMITER ;
-- END V5 WORKFLOW OBJECTS 20261024

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
