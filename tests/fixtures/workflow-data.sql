-- TEST FIXTURE ONLY. tests/database.test.cjs loads this into its isolated temporary server.
SET time_zone = '+00:00';
SET @today = DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR);
SET @activation = UTC_TIMESTAMP(6) - INTERVAL 90 DAY;
INSERT INTO users(id,email,password_hash,full_name,role) VALUES
  (1,'owner@fixture.invalid','fixture','Owner','LANDLORD'),
  (2,'mai@fixture.invalid','fixture','Mai','TENANT'),
  (3,'ngoc@fixture.invalid','fixture','Ngoc','TENANT'),
  (4,'bao@fixture.invalid','fixture','Bao','TENANT'),
  (5,'lan@fixture.invalid','fixture','Lan','TENANT'),
  (6,'extra@fixture.invalid','fixture','Extra','TENANT'),
  (7,'admin@fixture.invalid','fixture','Admin','ADMIN');
INSERT INTO landlords(id) VALUES(1);
INSERT INTO tenants(id) VALUES(2),(3),(4),(5),(6);
INSERT INTO admins(id) VALUES(7);
INSERT INTO rental_houses(id,landlord_id,address,province_code) VALUES(1,1,'Fixture address','01');
INSERT INTO rooms(id,house_id,room_number,area,rent_price,deposit_amount,max_occupants,allow_additional_occupants) VALUES
  (1,1,'P305',30,5400000,5400000,3,TRUE),
  (2,1,'P101',30,5000000,5000000,3,TRUE),
  (3,1,'SMALL',15,3000000,3000000,1,TRUE),
  (4,1,'NEW',22,4000000,4000000,2,TRUE),
  (5,1,'VIEW',20,3500000,3500000,2,TRUE);
INSERT INTO files(id,owner_user_id,storage_key,original_name,mime_type,size_bytes,sha256,purpose,visibility,status)
  VALUES(1,1,'fixture/paper','paper.pdf','application/pdf',0,REPEAT('0',64),'CONTRACT','PRIVATE','ACTIVE');
INSERT INTO contracts(id,contract_number,room_id,house_id,landlord_id,paper_document_file_id,source,status,start_date,end_date,rent_amount,deposit_amount)
  VALUES(1,'PAPER-305',1,1,1,1,'PAPER_IMPORT','DRAFT',@today-INTERVAL 90 DAY,@today+INTERVAL 365 DAY,5400000,5400000);
INSERT INTO room_tenants(id,contract_id,room_id,tenant_id,full_name,status,intake_source,planned_move_in_date)
  VALUES(10,1,1,2,'Mai','PLANNED','PAPER_IMPORT',@today-INTERVAL 90 DAY),
        (11,1,1,3,'Ngoc','PLANNED','PAPER_IMPORT',@today-INTERVAL 40 DAY);
INSERT INTO contract_revisions(id,contract_id,revision_number,created_by_id,kind,status,start_date,end_date,effective_from,rent_amount,deposit_amount,content,members_snapshot,representative_room_tenant_id,document_file_id)
  VALUES(100,1,1,1,'PAPER_IMPORT','IMPORTED',@today-INTERVAL 90 DAY,@today+INTERVAL 365 DAY,@today-INTERVAL 90 DAY,5400000,5400000,'Original signed paper',JSON_ARRAY(JSON_OBJECT('name','Mai'),JSON_OBJECT('name','Ngoc')),10,1);
UPDATE contracts SET representative_room_tenant_id=10,current_revision_id=100,status='CONFIRMED' WHERE id=1;
UPDATE room_tenants SET status='ACTIVE',move_in_date=@today-INTERVAL 90 DAY,move_in_confirmed_by_id=1,move_in_confirmed_at=@activation WHERE id=10;
UPDATE room_tenants SET status='ACTIVE',move_in_date=@today-INTERVAL 40 DAY,move_in_confirmed_by_id=1,move_in_confirmed_at=UTC_TIMESTAMP(6)-INTERVAL 40 DAY WHERE id=11;
UPDATE contracts SET status='ACTIVE',activated_at=@activation WHERE id=1;
UPDATE rooms SET status='OCCUPIED' WHERE id=1;
INSERT INTO occupant_join_requests(id,contract_id,applicant_id,requested_by_id,representative_room_tenant_id,planned_move_in_date,status,representative_consented_by_id,representative_consented_at,applicant_consented_by_id,applicant_consented_at)
  VALUES(200,1,4,2,10,@today,'PENDING_LANDLORD',2,UTC_TIMESTAMP(6),4,UTC_TIMESTAMP(6)),
        (201,1,5,2,10,@today,'PENDING_LANDLORD',2,UTC_TIMESTAMP(6),5,UTC_TIMESTAMP(6));
INSERT INTO contract_change_requests(id,contract_id,requested_by_id,representative_room_tenant_id,base_revision_id,type,status,requested_effective_date,proposal_snapshot,reviewed_by_id,reviewed_at,tenant_confirmed_by_id,tenant_confirmed_at)
  VALUES(300,1,2,10,100,'TERMINATION','READY_TO_APPLY',@today,JSON_OBJECT('reason','fixture termination'),1,UTC_TIMESTAMP(6),2,UTC_TIMESTAMP(6));
INSERT INTO invoices(id,contract_id,room_id,contract_revision_id,payer_room_tenant_id,payer_snapshot,billing_period,due_date,occupant_count_at_billing,status,created_by_id)
  VALUES(500,1,1,100,10,JSON_OBJECT('name','Mai'),DATE_FORMAT(@today,'%Y-%m-01'),@today,2,'DRAFT',1);
INSERT INTO invoice_items(invoice_id,room_id,position,item_type,name_snapshot,unit_snapshot,quantity,unit_price_snapshot,amount)
  VALUES(500,1,1,'RENT','Rent','month',1,5400000,5400000);
UPDATE invoices SET status='UNPAID' WHERE id=500;
INSERT INTO posts(id,landlord_id,house_id,room_id,title) VALUES(1,1,1,4,'New rental fixture'),(2,1,1,5,'Viewing fixture');
INSERT INTO conversations(id,type,room_id,post_id) VALUES(1,'ROOM_INQUIRY',4,1),(2,'ROOM_INQUIRY',5,2);
INSERT INTO conversation_participants(conversation_id,user_id,joined_at) VALUES(1,1,UTC_TIMESTAMP(6)),(1,5,UTC_TIMESTAMP(6)),(2,1,UTC_TIMESTAMP(6)),(2,6,UTC_TIMESTAMP(6));
UPDATE posts SET status='APPROVED';
INSERT INTO chat_messages(conversation_id,sender_id,client_message_key,message_type,content,sent_at) VALUES(1,5,UUID(),'TEXT','Can I view this room?',UTC_TIMESTAMP(6)),(1,1,UUID(),'TEXT','Let us arrange a time.',UTC_TIMESTAMP(6)),(2,6,UUID(),'TEXT','I would like to view this room.',UTC_TIMESTAMP(6)),(2,1,UUID(),'TEXT','What time suits you?',UTC_TIMESTAMP(6));
INSERT INTO room_viewing_requests(id,room_id,house_id,conversation_id,tenant_id,created_by_id,starts_at,ends_at,status,attendance_confirmed_by_id,attendance_confirmed_at,rental_decision,rental_decided_by_id,rental_decided_at)
  VALUES(400,4,1,1,5,1,UTC_TIMESTAMP(6)-INTERVAL 2 DAY,UTC_TIMESTAMP(6)-INTERVAL 2 DAY+INTERVAL 1 HOUR,'COMPLETED',1,UTC_TIMESTAMP(6)-INTERVAL 2 DAY,'AGREED',5,UTC_TIMESTAMP(6)-INTERVAL 1 DAY);
