const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname,'..');
const {endpoints:raw,schemas,decisions,jobs} = require('./api-blueprint.cjs');
const sql = fs.readFileSync(path.join(root,'database/schema.sql'),'utf8');
const guide = fs.readFileSync(path.join(root,'business-guide.js'),'utf8');
const context = vm.createContext({document:{addEventListener(){}}});
vm.runInContext(guide,context);
const {flows,groups,roles} = JSON.parse(vm.runInContext('JSON.stringify({flows:BUSINESS_FLOWS,groups:BUSINESS_GROUPS,roles:BUSINESS_ROLES})',context));
const byFlow = Object.fromEntries(flows.map(f=>[f.id,f]));
// Read the literal SQL, including columns/constraints added after the original CREATEs.
// The raw DDL is retained alongside extracted columns so no CHECK/FK is paraphrased away.
const tables = [...sql.matchAll(/CREATE TABLE\s+`?(\w+)`?\s*\(([\s\S]*?)\) ENGINE[^;]*;/g)].map(m=>({name:m[1],line:sql.slice(0,m.index).split('\n').length,ddl:m[0],columns:[]}));
for (const table of tables) {
  const alterations = [...sql.matchAll(new RegExp('ALTER TABLE\\s+`?'+table.name+'`?(?=\\s)[\\s\\S]*?;','g'))];
  table.ddl += alterations.map(m=>'\n\n'+m[0]).join('');
  const columns = new Map();
  for (const line of table.ddl.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:(?:ADD|MODIFY)\s+(?:COLUMN\s+)?)?`?(\w+)`?\s+((?:BIGINT|INT|TINYINT|SMALLINT|VARCHAR|CHAR|DECIMAL|DATETIME|DATE|BOOLEAN|LONGTEXT|TEXT|JSON|TIMESTAMP)\b[^\n]*?)(?:,)?$/i);
    if (m) columns.set(m[1],{name:m[1],definition:m[2].replace(/,$/,'')});
  }
  table.columns=[...columns.values()];
}
const tableNames=new Set(tables.map(t=>t.name));
const procedures=[...new Set([...sql.matchAll(/CREATE PROCEDURE\s+(sp_\w+)\s*\(/g)].map(m=>m[1]))];
const errors = [
 [400,'BAD_REQUEST','JSON/query sai cú pháp, field không cho phép hoặc thiếu header bắt buộc.'],
 [401,'UNAUTHENTICATED','Thiếu/sai token, phiên hết hạn/đã thu hồi.'],
 [403,'FORBIDDEN','Sai vai trò/quyền đối tượng, tài khoản LOCKED/DISABLED.'],
 [404,'RESOURCE_NOT_FOUND','ID không tồn tại hoặc tài nguyên riêng tư không được phép tiết lộ.'],
 [409,'STATE_CONFLICT','Trạng thái nguồn đã thay đổi hoặc thao tác không còn áp dụng.'],
 [409,'VERSION_CONFLICT','If-Match/revisionId không khớp dữ liệu mới nhất.'],
 [409,'IDEMPOTENCY_KEY_REUSED','Cùng khóa và actor/route nhưng payload khác.'],
 [422,'VALIDATION_ERROR','Sai kiểu/giới hạn, quan hệ/điều kiện nghiệp vụ. Trả errors theo field.'],
 [429,'RATE_LIMITED','Vượt hạn gọi/gửi OTP; có Retry-After.'],
 [503,'DEPENDENCY_UNAVAILABLE','Kho tệp/provider tạm lỗi; không báo thành công giả.'],
 [500,'INTERNAL_ERROR','Lỗi máy chủ; trả requestId, không trả SQL/stack trace.']
].map(([status,code,meaning])=>({status,code,meaning}));
const domainErrors={
 account:['422 CONTACT_REQUIRED','409 CONTACT_ALREADY_USED'],
 property:['422 HOUSE_RIGHT_NOT_EFFECTIVE','409 HOUSE_VERSION_CHANGED','422 ROOM_CAPACITY_EXCEEDED'],
 posts:['409 POST_REVIEW_QUOTA_REACHED','409 POST_VERSION_CHANGED','422 HOUSE_RIGHT_NOT_EFFECTIVE'],
 roommates:['409 OPEN_PAIR_EXISTS','422 PROFILE_REQUIRED','422 INVALID_CRITERION_VALUE'],
 messages:['403 NOT_A_PARTICIPANT','409 CONNECTION_ENDED','404 POST_UNAVAILABLE'],
 viewings:['409 VIEWING_TIME_OVERLAP','409 PENDING_PROPOSAL_EXISTS','422 VIEWING_TIME_INVALID','409 PROPOSAL_EXPIRED'],
 contracts:['409 OPEN_CONTRACT_EXISTS','422 VIEWING_NOT_ELIGIBLE','422 HOUSE_RIGHT_NOT_EFFECTIVE','409 REVISION_CHANGED'],
 residents:['422 ROOM_CAPACITY_EXCEEDED','409 ACTIVE_STAY_EXISTS','409 HOLD_EXPIRED','409 REPRESENTATIVE_CHANGED'],
 changes:['409 OPEN_CHANGE_EXISTS','409 BASE_REVISION_CHANGED','422 EFFECTIVE_DATE_NOT_REACHED','422 TARGET_ROOM_UNAVAILABLE'],
 billing:['409 INVOICE_PERIOD_EXISTS','409 INVOICE_IMMUTABLE','422 INVOICE_TOTAL_INVALID'],
 moderation:['409 ALREADY_REVIEWED','422 TENANCY_EVIDENCE_REQUIRED','409 MODERATION_STATE_CHANGED'],
 integrity:['422 FILE_INVALID','403 FILE_CONTEXT_FORBIDDEN','409 EVIDENCE_IMMUTABLE']
};
// These are candidate errors of the endpoint's workflow; do not attach mutation
// errors (quota, capacity, state changes) to a read-only endpoint.
const flowErrors={
 'account-access':['409 CONTACT_ALREADY_USED','422 CONTACT_REQUIRED'],
 profile:['422 PROFILE_INVALID'],
 identity:['409 PENDING_VERIFICATION_EXISTS','422 FILE_INVALID'],
 sessions:['422 TOKEN_INVALID_OR_EXPIRED','409 TOKEN_ALREADY_CONSUMED','429 RATE_LIMITED'],
 'create-house':['409 HOUSE_VERSION_CHANGED','422 HOUSE_COORDINATES_INVALID'],
 'house-proof':['409 PENDING_HOUSE_VERIFICATION_EXISTS','422 HOUSE_PROOF_INVALID','409 HOUSE_IDENTITY_CHANGED'],
 'house-rights-expiry':['409 VERIFICATION_STATE_CHANGED'],
 rooms:['409 ROOM_NUMBER_EXISTS','422 ROOM_CAPACITY_EXCEEDED','409 ROOM_STILL_OCCUPIED'],
 'submit-post':['409 POST_REVIEW_QUOTA_REACHED','409 POST_VERSION_CHANGED','422 POST_IMAGE_INVALID'],
 'moderate-post':['409 MODERATION_STATE_CHANGED','422 HOUSE_RIGHT_NOT_EFFECTIVE'],
 discover:['404 POST_UNAVAILABLE'],
 'roommate-profile':['409 PROFILE_VERSION_CHANGED','422 HOUSING_CONTEXT_INVALID'],
 'matching-criteria':['422 INVALID_CRITERION_VALUE','409 CRITERION_IN_USE'],
 'roommate-invite':['409 OPEN_PAIR_EXISTS','422 PROFILE_REQUIRED','409 CONNECTION_ENDED'],
 'room-chat':['403 NOT_A_PARTICIPANT','422 MESSAGE_OR_CONTEXT_INVALID'],
 'roommate-chat':['409 CONNECTION_ENDED','403 NOT_A_PARTICIPANT'],
 'share-post':['409 CONNECTION_ENDED','404 POST_UNAVAILABLE'],
 notifications:['422 READ_MARKER_INVALID'],
 'propose-viewing':['409 VIEWING_TIME_OVERLAP','409 PENDING_PROPOSAL_EXISTS','409 PROPOSAL_EXPIRED','422 VIEWING_TIME_INVALID'],
 'schedule-viewing':['409 VIEWING_TIME_OVERLAP','422 VIEWING_CONTEXT_INVALID','422 VIEWING_TIME_INVALID'],
 'viewing-outcome':['409 VIEWING_STATE_CHANGED','422 OUTCOME_NOT_YET_ALLOWED','409 OPEN_CONTRACT_EXISTS'],
 'create-contract':['409 OPEN_CONTRACT_EXISTS','422 VIEWING_NOT_ELIGIBLE','422 HOUSE_RIGHT_NOT_EFFECTIVE','422 ROOM_CAPACITY_EXCEEDED'],
 'contract-revision':['409 REVISION_CHANGED','409 CONTRACT_STATE_CHANGED','422 HOUSE_RIGHT_NOT_EFFECTIVE'],
 'move-in':['409 ACTIVE_STAY_EXISTS','422 ROOM_CAPACITY_EXCEEDED','422 HOUSE_RIGHT_NOT_EFFECTIVE'],
 'cancel-contract':['409 CONTRACT_ALREADY_ACTIVE','409 REPRESENTATIVE_CANNOT_BE_CANCELLED'],
 'join-consent':['409 OPEN_JOIN_EXISTS','409 REPRESENTATIVE_CHANGED','422 CONSENT_REQUIRED'],
 'join-hold':['422 ROOM_CAPACITY_EXCEEDED','409 ACTIVE_STAY_EXISTS','409 HOLD_EXPIRED','409 REPRESENTATIVE_CHANGED'],
 departure:['409 HANDOVER_REQUIRED','422 MOVE_OUT_DATE_INVALID'],
 handover:['422 SUCCESSOR_INELIGIBLE','409 REPRESENTATIVE_CHANGED','409 HISTORY_RECONCILIATION_REQUIRED'],
 'change-request':['409 OPEN_CHANGE_EXISTS','409 BASE_REVISION_CHANGED','422 EFFECTIVE_DATE_NOT_REACHED','422 TARGET_ROOM_UNAVAILABLE'],
 services:['409 SERVICE_NAME_EXISTS','422 CROSS_HOUSE_SERVICE','422 SERVICE_PRICE_INVALID'],
 bill:['409 INVOICE_PERIOD_EXISTS','409 INVOICE_IMMUTABLE','422 INVOICE_TOTAL_INVALID'],
 'pay-invoice':['409 INVOICE_STATE_CHANGED','409 INVOICE_PERIOD_EXISTS','422 INVOICE_TOTAL_INVALID'],
 review:['409 ALREADY_REVIEWED','422 TENANCY_EVIDENCE_REQUIRED','422 REVIEW_NOT_YET_ALLOWED'],
 report:['422 REPORT_TARGET_INVALID','409 REPORT_ALREADY_CLOSED'],
 'lock-account':['409 ACCOUNT_STATE_CHANGED'],
 templates:['409 TEMPLATE_VERSION_EXISTS','422 TEMPLATE_INVALID'],
 'file-storage':['422 FILE_INVALID','403 FILE_CONTEXT_FORBIDDEN','409 EVIDENCE_IMMUTABLE']
};
const endpoints=raw.map((e,i)=>{
  if(!byFlow[e.flow])throw Error('Unknown flow '+e.flow);
  if(e.input && !schemas[e.input])throw Error('Unknown schema '+e.input);
  if(e.adapter.startsWith('sp_') && !procedures.includes(e.adapter))throw Error('Unknown procedure '+e.adapter);
  const flowIds=[e.flow,...(e.alsoFlows||[])];
  const relatedFlows=flowIds.map(id=>byFlow[id]||(()=>{throw Error('Unknown flow '+id)})());
  const usedTables=[...new Set(e.tables||relatedFlows.flatMap(f=>f.data.map(([table])=>table)))];
  for(const t of usedTables)if(!tableNames.has(t))throw Error('Unknown table '+t);
  const inputFields=(schemas[e.input]||[]).filter(f=>!e.inputFields||e.inputFields.includes(f.name)).map(f=>({...f,required:e.method==='PATCH'?false:f.required}));
  const id=`API-${String(i+1).padStart(3,'0')}`;
  const isMutation=!['GET','HEAD'].includes(e.method);
  const status=e.status||(['POST'].includes(e.method)&&!/(decision|confirm|cancel|withdraw|complete|apply|hide|restore|revoke|approve|reject|response|end|issue|logout|refresh|login|verify|lock|unlock|attendance|consents|submit|read-all|moderation|read-state|rental-decision|replacements|download-links|revision-requests|password-resets\/complete)$/.test(e.path)?201:200);
  const body=Object.fromEntries(inputFields.filter(f=>f.example!==undefined).map(f=>[f.name,f.example]));
  const list=e.list===true;
  const query=list?(e.pagination==='cursor'?'limit=20&before=<cursor>':'page=1&pageSize=20&sort=-createdAt'):'';
  const successExample=e.path==='/events'?{event:'notification.created',id:'evt-example',data:{resourceId:'1001',occurredAt:'2026-10-29T03:00:00Z'}}:e.path==='/residents/export'?'CSV attachment (ngoại lệ JSON)':{data:list?[]:{id:'1001'},meta:{requestId:'req-example',timestamp:'2026-10-29T03:00:00Z',...(list?e.pagination==='cursor'?{pagination:{nextCursor:null,hasMore:false}}:{pagination:{page:1,pageSize:20,total:0,totalPages:0}}:{})},error:null};
  const tests=[
    `Happy path: ${e.title}; kiểm tra ${e.output}.`,
    e.access==='PUBLIC'?'Đầu vào sai/ID ẩn: không lộ dữ liệu riêng tư.':'Thiếu phiên/phiên revoked/actor LOCKED và actor khác chủ hoặc khác participant phải bị chặn.',
    `Ràng buộc: ${relatedFlows.flatMap(f=>f.rules).find(([layer])=>layer==='DB')?.[1]||'Kiểm tra kiểu dữ liệu và quan hệ FK.'}`,
    isMutation?'Gửi lặp cùng khóa trả kết quả cũ; cùng khóa khác payload trả 409; hai request tranh cùng tài nguyên không vượt hạn mức.':'Phân trang/lọc đúng scope; dữ liệu riêng tư bị loại trên server, không chỉ ẩn UI.',
    e.adapter.startsWith('sp_')?'Lỗi giữa giao dịch phải rollback; xác minh không bọc CALL trong transaction của ứng dụng.':'Kiểm tra lỗi DB/provider không để lại cập nhật dở hoặc trả thành công giả.'
  ];
  return {...e,id,group:byFlow[e.flow].group,flowIds,tables:usedTables,inputFields,status,priority:e.priority||(['account','property','viewings','contracts','residents','changes'].includes(byFlow[e.flow].group)?'P0':'P1'),
    dependencies:[...new Set([...(e.access==='PUBLIC'?[]:['Middleware auth/session/role + object scope']),...(isMutation?['D09: idempotency store nếu chưa có khóa tự nhiên']:[]),...(e.decision?[e.decision]:[]),...(e.concurrency?['D15: kiểm tra version trong khóa']:[])])],
    headers:[...(e.access==='PUBLIC'?[]:['Authorization: Bearer <accessToken>']),...(inputFields.length?['Content-Type: application/json']:[]),...(e.method==='POST'?['Idempotency-Key: <UUID>']:[]),...(e.concurrency?['If-Match: "<currentVersion>"']:[])],
    query:e.query||'',pagination:list?(e.pagination||'page'):null,
    requestExample:body,responseExample:successExample,
    errorCodes:['400 BAD_REQUEST',...(e.access==='PUBLIC'?[]:['401 UNAUTHENTICATED','403 FORBIDDEN']),'404 RESOURCE_NOT_FOUND',...(isMutation?['409 STATE_CONFLICT','409 IDEMPOTENCY_KEY_REUSED','422 VALIDATION_ERROR',...(flowErrors[e.flow]||domainErrors[byFlow[e.flow].group]||[])]:e.list?['422 VALIDATION_ERROR']:[])],
    transaction:e.adapter.startsWith('sp_')?'CALL quản lý transaction riêng; middleware xác thực trước CALL, actor lấy từ phiên. Phần procedure chưa xử lý phải mở rộng cùng transaction, không giả sử transaction app bao trùm được CALL.':isMutation?'Service phải khóa tài nguyên gốc, đọc lại quyền/trạng thái, ghi các bảng + audit/notification cần thiết trong cùng transaction; phát sự kiện sau commit.':'Read-only: scope quyền trong truy vấn SQL; danh sách dùng thứ tự ổn định và giới hạn số bản ghi.',
    tests,exampleUrl:'/api/v1'+e.path+(query?'?'+query:'')};
});
const seen=new Set();for(const e of endpoints){const key=e.method+' '+e.path;if(seen.has(key))throw Error('Duplicate '+key);seen.add(key);}
const linkedFlows=flows.map(f=>({...f,endpointIds:endpoints.filter(e=>e.flowIds.includes(f.id)).map(e=>e.id),jobIds:jobs.filter(j=>j.flow===f.id).map(j=>j.id)}));
for(const f of linkedFlows)if(!f.endpointIds.length&&!f.jobIds.length)throw Error('Uncovered flow '+f.id);
const standards=[
 ['Phạm vi & phiên bản','Đặc tả đề xuất cho backend cần xây dựng; base path /api/v1, JSON UTF-8, camelCase ở API, snake_case ở SQL. Không có endpoint đã triển khai chỉ vì wireframe có màn hình. GET chỉ đọc; command POST đặt tên hành động cụ thể; PUT idempotent; PATCH cập nhật whitelist, phải có ít nhất một field.'],
 ['Kiểu dữ liệu','BIGINT ID truyền bằng chuỗi số dương để tránh mất chính xác JavaScript. Money truyền decimal string tối đa 2 số lẻ, quantity tối đa 3; kiểm tra precision SQL. Date là YYYY-MM-DD theo Việt Nam, datetime ISO 8601 có offset, lưu UTC và trả UTC Z. Không dùng số tiền float.'],
 ['Xác thực & phân quyền','Bearer access token gắn session_key; kiểm tra auth_sessions còn hạn/chưa revoked và users ACTIVE mỗi request. Quyền lấy từ bảng vai trò; actorId/landlordId/paidBy/consentedBy do server lấy, không tin body. Kiểm tra quyền từng object và field; query scopes không bị bỏ qua bởi ID tùy ý. Refresh dùng cookie Secure/HttpOnly/SameSite theo origin; bảo vệ CSRF/Origin.'],
 ['Phản hồi đồng nhất','JSON thành công: {data,meta:{requestId,timestamp,pagination?},error:null}. JSON lỗi: {data:null,meta:{requestId,timestamp},error:{code,message,details:[{field,code,message}]}}. Create 201, command/update/delete mềm 200, reset request 202. Ngoại lệ: SSE text/event-stream, CSV text/csv, PUT bytes tới signed upload URL của kho. Response example chỉ minh họa envelope, hợp đồng data cụ thể ghi ở từng endpoint.'],
 ['Phân trang & tìm kiếm','Danh sách dùng page≥1, pageSize 1–100 (mặc định 20), sort từ whitelist và thêm id làm tie-breaker. Trả pagination page/pageSize/total/totalPages; kết quả rỗng totalPages=0. Messages dùng cursor (sent_at,id), limit 1–100. Trả 422 khi sai giới hạn. Filter status/from/to chỉ chấp nhận enum/ngày hợp lệ; timezone ngày lọc là Asia/Ho_Chi_Minh.'],
 ['Idempotency & gửi đồng thời','Mọi POST nghiệp vụ nhận Idempotency-Key UUID. Scope actor+method+route+key, hash payload chuẩn hóa; cùng khóa/cùng payload trả status/body cũ, khác payload 409. Request đang xử lý trả 409 REQUEST_IN_PROGRESS + Retry-After; không chạy hai lần. TTL đề xuất 24 giờ cần chốt D09. Tận dụng creation_key/proposal.client_request_key/chat.client_message_key sẵn có; lệnh khác cần store bổ sung, không giả có bảng trong schema.'],
 ['Phiên bản & transaction','House dùng row_version, post content_version, roommate profile_version. Server trả version trong data và ETag cho tài nguyên có version; If-Match nhận đúng giá trị đã trả, cập nhật dưới khóa, stale→409. Các tài nguyên chưa có version dùng expected revision/state/updated_at CAS theo D15. Stored procedure công khai tự START/COMMIT, không gọi bên trong transaction app. Không gọi helper _v5_* từ client; không cấp quyền CRUD trực tiếp tùy ý.'],
 ['Dữ liệu lịch sử & riêng tư','Không DELETE cứng hợp đồng, lượt cư trú, revision đã xác nhận, hóa đơn đã phát hành, bằng chứng nhà hoặc audit. Người trả cũ giữ hóa đơn cũ; bàn giao không ghi đè viewing/đại diện ban đầu. ACTIVE trên contract đã đóng vẫn tính tải và cần đối soát; thiếu chứng cứ để null/chưa rõ. Tài liệu riêng tư dùng URL tạm có kiểm tra context; thẻ bài đã ẩn không trả ảnh/tiêu đề cũ.'],
 ['Lỗi & vận hành','Không truyền nguyên SQLSTATE/message/stack trace ra client. Backend cần map lỗi domain ổn định, unique/check/FK và lỗi SIGNAL sang code tương ứng; procedure hiện chưa phát error code HTTP. Deadlock/lock timeout có thể retry giới hạn nếu chưa có commit mơ hồ, giữ nguyên idempotency key; lỗi sau commit phải tra kết quả trước retry. Không log mật khẩu, OTP, token hay bytes giấy tờ.'],
 ['Trạng thái thực thi','Tất cả endpoint/checklist bắt đầu Chưa làm. Nhãn Dùng procedure chỉ nói SQL có thủ tục tương ứng, vẫn cần controller/auth/DTO/mapping/errors/tests. Mục Cần chốt ghi rõ đề xuất hoặc mở rộng schema; không tự thêm bảng/migration vào CSDL hiện tại.']
].map(([title,body])=>({title,body}));
const mappings=[['Room.code','rooms.room_number'],['Room.rentAmount','rooms.rent_price'],['Room.capacity','rooms.max_occupants'],['HouseService.serviceId','house_services.catalog_service_id (nullable)'],['HouseService.unitPrice','house_services.default_unit_price'],['HouseService.calculationMethod','house_services.default_calculation_method'],['HouseService.active / RoomService.active','is_active'],['NewContract.extraMembers[].fullName','p_extra_members[].full_name'],['NewContract.extraMembers[].tenantId','p_extra_members[].tenant_id'],['NewContract.extraMembers[].identityNumber','p_extra_members[].identity_number'],['NewContract.extraMembers[].dateOfBirth','p_extra_members[].date_of_birth'],['Invoice.replacesInvoiceId','invoices.replacement_of_id'],['Invoice.payer','payer_room_tenant_id + payer_snapshot (khác paid_by_id)'],['Invoice.issuedAt','Chưa có issued_at; dùng updated_at khi phát hành hoặc bổ sung cột audit nếu cần timestamp riêng'],['Revision.expectedRevisionId','Cần mở rộng sp_confirm_contract theo D10']].map(([api,sql])=>({api,sql}));
const qa=[
 ['QA01','Giới hạn tin chờ','submit-post','4 submit đồng thời cùng room: tối đa 3 PENDING; sửa một tin PENDING không chiếm slot mới.'],
 ['QA02','Tranh cùng khoảng giờ','schedule-viewing','2 accept/propose khác nhau cùng khoảng giờ: chỉ một SCHEDULED; hai lịch liền kề được phép.'],
 ['QA03','Tranh giữ phòng','create-contract','2 lịch COMPLETED+AGREED cùng room tạo hợp đồng: chỉ một open contract; rollback mọi side effect bên thua.'],
 ['QA04','Đóng lịch khi giữ phòng','reserve-cleanup','Hủy SCHEDULED tương lai và reject pending còn hạn trên tất cả bài cùng room; giữ lịch đang diễn ra/đã kết thúc. Hủy contract không hồi lịch.'],
 ['QA05','Giới hạn người ở','join-hold','2 approve tranh chỗ cuối: chỉ một giữ được. Hold quá 48h không tính capacity/không complete dù job chưa chạy.'],
 ['QA06','Xác nhận revision cũ','contract-revision','Đại diện mở revision A, chủ gửi B trước confirm: request A phải 409, không xác nhận B ngoài ý muốn (D10).'],
 ['QA07','Bàn giao đại diện','handover','Người cũ LEFT, người mới cùng hợp đồng ACTIVE, history đúng; request cũ hủy; payer/viewing/giá/ngày hợp đồng cũ giữ.'],
 ['QA08','Rollback đổi phòng','transfer','Đích mất chỗ/quyền trước apply: không đóng nguồn. Thành công chuyển đủ ACTIVE+PLANNED, đích PLANNED chờ move-in.'],
 ['QA09','Mất quyền nhà','house-rights-expiry','Hết hạn/thu hồi/đổi định danh/khóa landlord: public ẩn ngay, thuê mới/gia hạn/đích bị chặn, rời/kết thúc cũ vẫn hoạt động.'],
 ['QA10','Hóa đơn bất biến','pay-invoice','Đổi giá dịch vụ/đại diện sau phát hành: invoice cũ không đổi. Kỳ trùng bị chặn; override=0 giữ 0; meter cuối<đầu bị chặn.'],
 ['QA11','Phân quyền chéo tài khoản','data-safety','Thử ID nhà/contract/member/file/chat/invoice của người khác, bao gồm nested route không khớp parent; không lộ PII.'],
 ['QA12','Idempotency và mất mạng','data-safety','Retry sau commit/trả response lỗi: cùng key/payload nhận kết quả cũ; khác payload 409; không lặp member/invoice/notification.'],
 ['QA13','Thẻ bài chia sẻ bị ẩn','share-post','Ẩn đúng postId đã share: sharedPost null/unavailable, không lộ ảnh/tiêu đề hoặc tự đổi sang tin khác của phòng.'],
 ['QA14','Ngày giờ Việt Nam','schedule-viewing','Thiết bị timezone khác, lịch vẫn đúng UTC+7; kiểm thử sát 00:00, expiredAt và endDate inclusive.'],
 ['QA15','Chứng cứ tệp','file-storage','MIME giả, size vượt, file của người khác, PRIVATE đổi PUBLIC, file proof đã nộp bị xóa/đổi bytes: đều bị từ chối.'],
 ['QA16','Tài khoản nhiều vai trò/phiên','account-access','Role demo không cấp quyền; users.role không thay bảng role; JWT phiên revoked/LOCKED bị chặn trên mọi endpoint riêng tư.']
].map(([id,title,flow,scenario])=>({id,title,flow,scenario}));
const data={version:'1.0-draft',date:'2026-10-29',basePath:'/api/v1',sourceHashes:Object.fromEntries(['business-guide.js','docs/business-rules.md','database/schema.sql','app.js','house-rights.js'].map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')])),groups,roles,flows:linkedFlows,endpoints,schemas,tables,procedures,standards,errors,decisions,jobs,mappings,qa};
const json=JSON.stringify(data,null,2)+'\n';
const browser='// Generated by npm run api:build. Edit scripts/api-blueprint.cjs and business-guide.js.\nwindow.TRODAY_API_CATALOG = '+JSON.stringify(data).replace(/</g,'\\u003c')+';\n';
const outputs=[['docs/api-catalog.json',json],['api-catalog.js',browser]];
if(process.argv.includes('--check')){
  for(const [file,body]of outputs)if(!fs.existsSync(path.join(root,file))||fs.readFileSync(path.join(root,file),'utf8')!==body)throw Error(file+' chưa đồng bộ; chạy npm run api:build');
  const result=spawnSync('python',[path.join(__dirname,'build-api-checklist.py'),'--check'],{cwd:root,encoding:'utf8',windowsHide:true});
  process.stdout.write(result.stdout||'');if(result.status!==0)throw Error(result.stderr||'Excel verification failed');
}else{
  for(const[file,body]of outputs)fs.writeFileSync(path.join(root,file),body);
  const result=spawnSync('python',[path.join(__dirname,'build-api-checklist.py')],{cwd:root,encoding:'utf8',windowsHide:true});
  process.stdout.write(result.stdout||'');if(result.status!==0)throw Error(result.stderr||'Excel generation failed');
}
console.log(`${endpoints.length} APIs · ${flows.length} flows · ${tables.length} tables · ${decisions.length} decisions · ${jobs.length} jobs/operations`);
