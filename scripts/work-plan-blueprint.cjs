// Team plan for the existing API catalogue and the layered backend in troday/BE.
// Class names describe planned work, not backend features already implemented.
const {MAIN:JAVA,TEST:JAVA_TEST,architecture}=require('./spring-boot-plan.cjs');
const featureClasses={
  identity:['User','AuthSession','Auth','Account','Profile','Session','Verification','PasswordReset','Token','Identity'],
  files:['File'],messaging:['Conversation','Message','Chat'],notifications:['Notification','Sse'],
  billing:['Invoice','Billing'],accountadmin:['AccountAdmin'],audit:['Audit'],admindashboard:['AdminDashboard'],
  properties:['House','Room','Property','LandlordDashboard'],houserights:['HouseRight'],posts:['Post','PublicPost','Favorite'],
  services:['RentalService','HouseRentalService','RoomRentalService','ServiceQuote'],viewings:['Viewing','RentalDecision'],
  roommates:['Roommate','Connection','Matching','Criterion'],reviews:['Review'],reports:['Report'],
  rentals:['ActiveStay','Contract','ContractRevision','ContractTemplate','Resident','Residency','OccupantJoin','RentalChange','Representative','Rental']
};
const group=names=>names.length===1?names[0]:`{${names.join(',')}}`;
const featurePaths=features=>features.flatMap(feature=>{
  const names=featureClasses[feature];
  if(!names)throw Error('Unknown feature class scope '+feature);
  const type=group(names),resource=group(names.map(name=>name.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()).slice(1)));
  return [
    `${JAVA}/controller/${type}Controller.java`,`${JAVA}/service/${type}*.java`,
    `${JAVA}/repository/${type}*.java`,`${JAVA}/repository/mapper/${type}RowMapper.java`,
    `${JAVA}/repository/procedure/${type}*Gateway.java`,`${JAVA}/model/${type}*.java`,
    `${JAVA}/dto/request/*${type}*Request.java`,`${JAVA}/dto/response/*${type}*Response.java`,
    `${JAVA_TEST}/{controller,service,repository,integration,contract}/${type}*Tests.java`,
    `${JAVA_TEST}/support/fixtures/${type}*Fixtures.java`,
    `BE/src/test/resources/sql/${resource}-*.sql`,`BE/docs/contracts/*${resource}*.json`
  ];
}).join('; ');
const people = [
  {id:'A',name:'Người A',role:'Nền tảng, tài khoản, tương tác & hóa đơn',color:'teal',summary:'Dựng khung dùng chung trước; sau đó phát triển xác thực, tệp, chat/thông báo và hóa đơn. Giữ vai trò tích hợp các tệp toàn dự án.',reviewer:'B'},
  {id:'B',name:'Người B',role:'Nhà/phòng, tin đăng, lịch xem & ở ghép',color:'blue',summary:'Sở hữu nguồn phòng cho thuê, công khai tin, dịch vụ và lịch xem. Sau luồng thuê ban đầu, hoàn thiện kết nối ở ghép và kiểm duyệt nội dung.',reviewer:'C'},
  {id:'C',name:'Người C',role:'Hợp đồng, cư trú & thay đổi thuê',color:'amber',summary:'Tập trung vào giao dịch thuê: hợp đồng, phiên bản, vào/rời phòng, thêm người, bàn giao và gia hạn/đổi phòng. Ít endpoint hơn vì nghiệp vụ giao dịch phức tạp hơn.',reviewer:'A'}
];
// One global queue. Task IDs stay stable so old links and checklist evidence can
// be reviewed after replanning; the ordinal below defines execution order.
const sequenceByPhase = {
  P0:['BE-A01','BE-B01','BE-C01','BE-A02'],
  P1:['BE-A03','BE-A04','BE-A05','BE-A06','BE-A07'],
  P2:['BE-B02','BE-B03','BE-B04','BE-C02','BE-C03','BE-B05','BE-B06','BE-B07','BE-C04'],
  P3:['BE-A08','BE-A09','BE-B08','BE-B09','BE-C05','BE-B10'],
  P4:['BE-C06','BE-C07','BE-C08','BE-B11','BE-B12','BE-B13','BE-A11','BE-C09','BE-A10','BE-A12'],
  P5:['BE-A13','BE-C10','BE-C11','BE-C12','BE-A14','BE-B14'],
  P6:['BE-A15','BE-B15','BE-B16','BE-B17','BE-B18','BE-C13','BE-C14'],
  P7:['BE-C15','BE-B19','BE-A16','BE-C16','BE-A17']
};
const sequencePolicy = {
  maxActiveTasks:1,
  legacyBlueprintHashes:['03a29e465214408a5205f419f99e2ed8a4f9a18266685cb87e069c233ef99ed6'],
  compatibleBlueprintHashes:['07c6e1d0157545fa9b3588432b1f460f53bfcaee6168931c948b947b4a319902','4071c7777b29300ee114b07595c29ad9c2570860627c955ddb46f1841762a43e','f0d6f1173a6905358af04c565c5b2378880192d413de464052356c516e3bdf59'],
  handoffChecklist:[
    'Hoàn tất 7 bước, reviewer duyệt và PR của task hiện tại đã merge vào main.',
    'A tích hợp mọi SQL sinh ra/dependency dùng chung trong cùng lượt bàn giao; CI và db:check xanh.',
    'Ghi commit main, chữ ký interface/procedure, migration và kết quả test vào bằng chứng task.',
    'Người nhận cập nhật main, chạy lại các kiểm tra đầu vào rồi tạo nhánh mới từ commit đã bàn giao.',
    'Chỉ mở task tiếp theo trong hàng đợi. Nếu thiếu quyết định hoặc provider thật, đánh Bị chặn và xử lý ngay tại task hiện tại.'
  ]
};
const interfaceRequirements={
  'BE-A08':['IF-CORE','IF-FILES','IF-ROOM','IF-CONNECTION'],
  'BE-B08':['IF-CHAT','IF-ROOM','IF-EVENT'],
  'BE-C05':['IF-ROOM','IF-VIEWING'],
  'BE-B11':['IF-RESIDENT','IF-CONNECTION'],
  'BE-A10':['IF-SERVICE','IF-RESIDENT'],
  'BE-A11':['IF-CHAT','IF-VIEWING','IF-CONNECTION'],
  'BE-C03':['IF-AUDIT'],
  'BE-B16':['IF-AUDIT','IF-RESIDENT'],
  'BE-C08':['IF-TOKEN'],
  'BE-A15':['IF-ROOM','IF-RESIDENT','IF-AUDIT'],
  'BE-C13':['IF-FILES']
};
const phases = [
  ['P0','Dựng khung → phân tích → chốt contract','A dựng khung; B phân tích nhà/phòng; C phân tích thuê; sau đó A chốt contract v1 từ hai bản bàn giao đã hoàn tất.','G0'],
  ['P1','Hoàn tất nền tảng, danh tính & tệp','A lần lượt hoàn tất auth, idempotency/audit, kho tệp, xét duyệt tài khoản và OTP/TokenPort. Các chức năng sau nhận provider thật đã merge.','G1'],
  ['P2','Dữ liệu nhà/phòng → cổng đọc → tin công khai','Hoàn tất nhà/phòng, dịch vụ, cổng đọc, mẫu hợp đồng, quyền nhà và public post; bảo vệ expected revision trước khi code thao tác thuê.','G2'],
  ['P3','Chat → lịch xem → giữ phòng','A hoàn tất chat/thông báo; B hoàn tất đề nghị và lịch xem; C tạo hợp đồng; B kiểm thử việc đóng lịch bằng các API đã xong.','G3'],
  ['P4','Vào ở → kết nối → hóa đơn nháp','C xác nhận và ghi cư trú thực tế; B tạo hồ sơ/kết nối; A hoàn tất thẻ chat rồi lập hóa đơn từ dịch vụ và cư trú đã chạy thật.','G4'],
  ['P5','Thuê chung, thay đổi & thu tiền','Hoàn tất giữ chỗ, bàn giao, gia hạn/đổi phòng/chấm dứt, thu tiền và vận chuyển sự kiện SSE.','G5'],
  ['P6','Chính sách mở rộng & tác vụ nền','Chốt thuật toán ghép, nhập giấy, audit mở rộng, đánh giá, dashboard và worker. Các mục chưa chốt tiếp tục được đánh dấu phụ thuộc.','G6'],
  ['P7','Kiểm thử lần lượt → bàn giao bản release','C kiểm thử giao dịch thuê, B kiểm thử chức năng nhà/tin, A kiểm thử hạ tầng, C chạy E2E toàn hệ thống, cuối cùng A tích hợp bản release.','G7']
].map(([id,title,goal,gate],index)=>({id,title,goal,gate,index}));

const modules = [
 ['platform','A','Spring Boot & thành phần dùng chung',`${JAVA}/config/**; ${JAVA}/security/**; ${JAVA}/exception/**; ${JAVA}/util/**; ${JAVA}/dto/request/PageQuery.java; ${JAVA}/dto/response/{ApiResponse,PageMeta}.java; ${JAVA}/service/{Idempotency,Event,Audit}*.java; ${JAVA}/repository/{Idempotency,Event}*.java; ${JAVA}/repository/procedure/StoredProcedureGateway.java; ${JAVA}/TrodayApplication.java; ${JAVA_TEST}/{config,security,exception}/**; ${JAVA_TEST}/service/{Idempotency,Event}*Tests.java; ${JAVA_TEST}/repository/{Idempotency,Event}*Tests.java; ${JAVA_TEST}/support/fixtures/PlatformFixtures.java; ${JAVA_TEST}/contract/CoreContractTests.java; ${JAVA_TEST}/e2e/PlatformE2ETests.java; BE/src/test/resources/sql/platform-*.sql; BE/docs/contracts/core*.json; BE/pom.xml; BE/mvnw; BE/mvnw.cmd; BE/.mvn/**; .github/workflows/backend.yml`,'ActorContext trong security; ApiResponse trong dto/response; lỗi trong exception; gateway trong repository/procedure; event/audit/idempotency trong service/repository.','A giữ main class/config/POM và lớp dùng chung. B/C thêm lớp nghiệp vụ vào các tầng controller/service/repository/model/dto, Spring component scan nhận tự động.'],
 ['identity','A','Tài khoản & danh tính',featurePaths(['identity']),'users, roles, profiles, auth_sessions, verification_tokens, identity verification.','C dùng TokenPort cho OCCUPANT_LINK, không tự sửa token repository của A.'],
 ['files','A','Kho tệp & quyền đọc',featurePaths(['files'])+`; ${JAVA}/integration/FileStorage*.java; ${JAVA_TEST}/integration/FileStorage*Tests.java`,'Metadata, upload/complete/download, MIME/hash/retention, private authorization.','B/C truyền fileId và business context; không viết thêm một file service riêng.'],
 ['messaging','A','Hội thoại & thông báo',featurePaths(['messaging','notifications']),'Hội thoại, participant, message, notifications; SSE dùng SseEmitter của Spring MVC.','Chat gộp theo cặp ở read model; context ghi vẫn đúng conversation/post/room của v5.'],
 ['billing','A','Hóa đơn & thu tiền',featurePaths(['billing']),'invoices/invoice_items, snapshot người trả/giá; thu toàn bộ theo phạm vi hiện tại.','Nhận dữ liệu hợp đồng/cư trú qua cổng C, giá dịch vụ qua cổng B; không sửa bảng giá/hợp đồng.'],
 ['account-admin','A','Quản trị tài khoản & audit',featurePaths(['accountadmin','audit','admindashboard']),'Khóa phiên/tài khoản, truy vết và tổng quan quản trị; endpoint /admin của B/C đặt trong controller theo chức năng tương ứng.','Không gom mọi endpoint /admin vào một controller chung.'],
 ['properties','B','Nhà, quyền nhà & phòng',featurePaths(['properties','houserights'])+`; ${JAVA_TEST}/e2e/PropertyE2ETests.java`,'Nhà/phòng, quyền cho thuê, tải phòng và nguồn đọc công khai.','C gọi interface trong service hoặc SQL procedure dưới khóa; không đổi trạng thái phòng bằng setter từ controller.'],
 ['posts','B','Tin đăng & tìm kiếm',featurePaths(['posts']),'posts/post_images/post_amenities/favorites, quota 3 bài chờ và public view.','Mọi tham chiếu giữ postId; ảnh và bài phải lưu nguyên tử sau mở rộng D07.'],
 ['services','B','Dịch vụ & giá hiệu lực',featurePaths(['services']),'rental_services/house_services/room_services và báo giá hiện tại.','A sở hữu hóa đơn; đổi dịch vụ không sửa invoice_items cũ.'],
 ['viewings','B','Lịch xem & quyết định thuê',featurePaths(['viewings'])+`; ${JAVA_TEST}/e2e/ViewingContractE2ETests.java`,'Proposal, schedule, attendance, rental decision.','C tạo hợp đồng bằng viewingId; cùng bản ghi lịch được dùng cho chat và màn hình lịch.'],
 ['roommates','B','Hồ sơ, tiêu chí & kết nối',featurePaths(['roommates']),'roommate_profiles/lifestyles/requests và matching theo chính sách đã chốt.','ACCEPTED chỉ tạo kết nối/chat, không tạo occupant_join_request hoặc consent thuê.'],
 ['content-moderation','B','Đánh giá & báo cáo',featurePaths(['reviews','reports']),'reviews/reports, private evidence và quyết định nội dung.','Khóa user qua dịch vụ A; thay đổi quyền thuê qua C; không gọi trực tiếp controller khác.'],
 ['rentals','C','Hợp đồng & cư trú',featurePaths(['rentals'])+`; ${JAVA_TEST}/e2e/RentalE2ETests.java`,'Contracts, revisions, room_tenants, history, join/change requests, templates và liên kết cư dân; lớp đặt trực tiếp trong từng tầng.','Một transaction owner cho vào/rời/đổi phòng. Interface bàn giao nằm trong service; CALL tự commit dùng repository/procedure.'],
 ['sql-property','B','Nguồn SQL nhà/tin/lịch',`database/source/house-rights.sql; database/source/post-review-quota.sql; database/source/viewing-proposals.sql; ${JAVA_TEST}/integration/PropertySql*Tests.java`,'B sửa nguồn nhà, quota và lịch xem; gửi A tích hợp SQL sinh ra.','Không tự sửa workflows.sql hoặc schema/migration được build.'],
 ['sql-rental','C','Nguồn SQL giao dịch thuê',`database/source/workflows.sql; database/source/contract-viewing-cleanup.sql; ${JAVA_TEST}/integration/RentalSql*Tests.java`,'C giữ nguồn thuê và workflows.sql chứa trigger/procedure dùng chung.','A/B cần thay file này thì gửi C change request và test, không đồng sửa file.'],
 ['integration','A','POM, cấu hình & SQL sinh ra',`database/schema.sql; database/migrations/*; scripts/build-database.cjs; BE/src/main/resources/application*.yml; BE/src/test/resources/application-test.yml; ${JAVA_TEST}/e2e/ReleaseE2ETests.java`,'A cấp thứ tự migration, build SQL, tích hợp cấu hình Spring, phiên bản dependency và CI.','Không tự tạo schema từ ORM; A tái sinh output SQL và duyệt thay đổi cấu hình chung trong lượt bàn giao.']
].map(([id,owner,title,paths,scope,boundary])=>({id,owner,title,paths:paths.split('; '),scope,boundary}));

const tasks=[];
const ids=(...items)=>items.flatMap(x=>typeof x==='number'?[`API-${String(x).padStart(3,'0')}`]:Array.from({length:x[1]-x[0]+1},(_,i)=>`API-${String(x[0]+i).padStart(3,'0')}`));
function T(owner,n,phase,title,points,apiIds,moduleIds,dependsOn,detail,deliverables,acceptance,options={}){
  tasks.push({id:`BE-${owner}${String(n).padStart(2,'0')}`,owner,phase,title,points,apiIds,modules:moduleIds,dependsOn,detail,deliverables,acceptance,priority:phase==='P6'?'P1':'P0',...options});
}
T('A',1,'P0','Khởi tạo Java Spring Boot, Maven và CI',3,[],['platform','integration'],[],
 'Rà soát khung Java 21 + Spring Boot + Maven + MySQL đã có tại troday/BE; hoàn tất CI và bàn giao theo checklist của task. Package được tổ chức theo tầng.',
 ['Rà soát BE/pom.xml, Maven Wrapper, TrodayApplication trong com.troday, các tầng controller/service/repository/model/dto và resources profiles; Spring component scan nhận bean.','Kiểm tra starters Web MVC/Validation/Security/JDBC, MySQL driver và test tương thích; CI chạy Maven test/verify trên DB test riêng.','CI dựng SQL nguồn vào thư mục tạm, không bật ORM tự tạo/cập nhật schema; nhánh be/<owner>/<task-id>-<slug> và review bắt buộc.'],
 ['Application context Spring Boot khởi tạo được; mvnw.cmd test/verify và lệnh chạy local được ghi trong README, không dùng DB thật để test.','B/C thêm controller/service/repository dưới com.troday mà không cùng sửa main class, pom.xml hoặc SecurityConfig.'],{handoff:['Maven Wrapper, profile cấu hình, lệnh chạy/test/CI và package mẫu cho B/C.'],decisions:['D15']});
T('A',2,'P0','Chốt contract v1 và cổng dùng chung',5,[],['platform'],['BE-A01','BE-B01','BE-C01'],
 'Cùng B/C chốt ActorContext, lỗi/envelope, tiền/ID/date, TokenPort, FilePort, AuditPort, EventPort và cách thực thi transaction.',
 ['Công bố BE/docs/contracts/core.json; ActorContext đặt trong security, ApiResponse trong dto/response, validation trong dto/request, xử lý lỗi trong exception.','Service tự ghi dùng @Transactional/TransactionTemplate; StoredProcedureGateway trong repository/procedure là bean riêng dùng Propagation.NEVER khi CALL tự START/COMMIT; actor lấy từ SecurityContext.','Định nghĩa eventId/recipient/eventKey, idempotency scope, whitelist audit target; constructor injection và contract test JUnit sẵn cho B/C.'],
 ['Đã nhận bản phân tích B01/C01 và chốt contract v1 trước khi code các provider.','Contract test quy định rõ đầu vào/đầu ra; test double chỉ dùng cô lập unit test, provider phải chạy thật ở task cung cấp.'],{handoff:['IF-CORE','IF-TOKEN','IF-AUDIT','IF-EVENT'],decisions:['D01','D09','D14','D15']});
T('A',3,'P1','Xác thực, phiên, profile và scope quyền',8,ids([1,5],[18,21]),['identity'],['BE-A02'],
 'Dùng Spring SecurityFilterChain mặc định từ chối, đăng nhập/refresh/thu hồi phiên và thông tin tài khoản; các chức năng khác chỉ nhận ActorContext đã xác thực.',
 ['Register users+tenants+profile nguyên tử; không nhận ADMIN/LANDLORD tùy ý từ client.','Refresh xoay token, session revoked/LOCKED bị chặn; profile và flags theo whitelist.','Cung cấp factory actor/phiên test cho B/C, tách policy role với quyền từng đối tượng.'],
 ['Thiếu token 401; sai scope/LOCKED không truy cập được tài nguyên chức năng khác.','Mọi contact/ID/money/date validate theo đặc tả, không log secret.'],{decisions:['D01'],qa:['QA16'],handoff:['Middleware + fixture phiên hợp lệ/hết hạn/bị khóa cho B/C.']});
T('A',4,'P1','Idempotency, event store và adapter audit nền',5,[],['platform','integration'],['BE-A02'],
 'Hoàn thiện hạ tầng chặn gửi lặp và lưu/phát sự kiện. Thiết kế phần SQL cần bổ sung theo D09; không giả các bảng đã tồn tại.',
 ['Store key+actor+route+request hash+kết quả; xử lý đang chạy, TTL và retry sau commit.','EventPort append cùng transaction cho service; cơ chế lấy notifications sau CALL có checkpoint/dedupe và giới hạn bảo đảm được ghi rõ.','Chốt và triển khai mở rộng audit D14 ngay tại task này, gồm target template/review/criterion; procedure đã ghi audit thì adapter không ghi lặp.'],
 ['Cùng key/payload trả kết quả cũ; khác payload 409; retry không nhân đôi tác dụng phụ.','Kiểm thử crash trước/sau commit; không tuyên bố exactly-once cho kênh vận chuyển.'],{decisions:['D09','D14'],qa:['QA12'],handoff:['IF-EVENT','IF-AUDIT','Kho idempotency cho mọi chức năng; migration do A tích hợp.']});
T('A',5,'P1','Kho tệp riêng tư và quyền mở theo ngữ cảnh',8,ids([170,174]),['files'],['BE-A03','BE-A04'],
 'Cung cấp luồng upload → kiểm tra → ACTIVE, private download và xóa hợp lệ cho minh chứng nhà/CCCD/chat/hợp đồng/báo cáo.',
 ['Adapter kho tệp cấu hình qua môi trường; MIME magic, byte length, SHA-256 và ownership được server kiểm tra.','FilePort hỗ trợ context resolver do B/C đăng ký riêng; không import service B/C vào files tạo vòng phụ thuộc.','Proof đã tham chiếu bất biến, URL ngắn hạn và retention có chính sách D05.'],
 ['Proof nhà đúng 1–8 tệp, tối đa 5 MB/tệp; MIME giả/owner khác bị chặn.','Không đọc được file bằng đoán ID; tệp đang được giữ không bị xóa vật lý.'],{decisions:['D05'],qa:['QA15'],handoff:['IF-FILES','ID tệp mẫu ACTIVE/PRIVATE và contract test cho B05/B06/C13.']});
T('A',6,'P1','Xác minh danh tính và cấp vai trò chủ trọ',5,ids([6,17]),['identity'],['BE-A05'],
 'Triển khai hồ sơ của mình, rút hồ sơ, hàng đợi và xét duyệt theo đúng loại tài khoản; dùng chung FilePort.',
 ['Một PENDING/người/loại; duyệt/từ chối có actor/time/reason.','APPROVE landlord tạo dòng landlords trong cùng transaction; không tự duyệt nhà.','Ghi audit và thông báo qua adapter đã chốt, giữ hồ sơ lịch sử.'],
 ['Hai lần nộp đồng thời không có hai PENDING; file của người khác bị chặn.','Chủ trọ mới được cấp vai trò chỉ công khai nhà sau B05 xác minh riêng.'],{decisions:['D05'],handoff:['Tài khoản TENANT/LANDLORD đã xét duyệt cho fixture tích hợp.']});
T('A',7,'P1','OTP, reset mật khẩu và TokenPort',5,ids([22,26]),['identity'],['BE-A03','BE-A04'],
 'Hoàn tất token một lần và adapter generic để C dùng cho liên kết cư dân, cùng cơ chế rate limit/reset grant.',
 ['Hash/HMAC mã, hạn dùng, attempt, consumed/revoked; reset không lộ tài khoản tồn tại.','Reset grant chỉ đổi mật khẩu đúng user và thu hồi phiên; phone uniqueness kiểm tra lại dưới khóa.','TokenPort issue/consume hỗ trợ OCCUPANT_LINK và targetRoomTenantId trong transaction Spring do service C mở, repository A tham gia cùng DataSource.'],
 ['OTP sai/hết hạn/dùng lại đều thất bại đúng mã; không log/response OTP thực.','C08 tiêu thụ token và gắn member trong cùng transaction, không gọi HTTP nội bộ.'],{decisions:['D01','D06'],handoff:['IF-TOKEN']});
T('A',8,'P3','Chat hỏi phòng và cổng hội thoại cho lịch xem',8,ids([76,82]),['messaging'],['BE-A03','BE-A04','BE-A05','BE-B04','BE-B07'],
 'Dùng tin công khai B07 và các cổng đọc B04 đã hoàn tất để mở conversation, gửi/đọc tin và read-state. B nhận tin nhắn thật làm điều kiện hẹn xem ở lượt sau.',
 ['Get-or-create inquiry có unique/khóa theo D08; một context ghi/post/room, gộp peer chỉ khi đọc.','Gửi TEXT/IMAGE chống trùng; cập nhật participant/read-state/last_message và sự kiện nguyên tử.','Công bố ensureRoommateConversation(tx) cho B13; ConnectionPort kiểm tra accepted từ DB/fixture dù endpoint kết nối chưa hoàn thiện.'],
 ['Có tin người thuê về đúng phòng cho B08/B09; ROOMMATE không dùng hẹn chủ trọ.','Chỉ participant được đọc/gửi; sender+client key không tạo trùng.'],{decisions:['D03','D08'],handoff:['IF-CHAT','conversationId + postId + roomId + tenantId chuẩn cho B.']});
T('A',9,'P3','Feed thông báo, bộ đếm và đánh dấu đọc',3,ids([86,89]),['messaging'],['BE-A04','BE-A08'],
 'API thông báo đọc từ cùng dữ liệu nghiệp vụ, không phụ thuộc SSE để bảo đảm đúng kết quả.',
 ['Feed scoped user, counts, read một/tất cả đến mốc server.','Chống event_key trùng, mở tài nguyên vẫn kiểm tra quyền lại.','Chuẩn hóa thông báo do procedure và service phát, giữ popup là trạng thái UI.'],
 ['Đọc thông báo của user khác bị chặn; read-all không đọc nhầm sự kiện đến sau mốc.','Tắt realtime không làm mất thông báo đã commit.'],{handoff:['Notification DTO và event mapping để B/C đưa vào ca tích hợp.']});
T('A',10,'P4','Hóa đơn nháp và snapshot giá/người trả',5,ids([145,148]),['billing'],['BE-A04','BE-B03','BE-C02','BE-C07'],
 'Dùng ServiceQuotePort của B và ResidencyReadPort của C để lập kỳ tiền, tách khỏi code cấu hình dịch vụ/hợp đồng.',
 ['Unique contract+kỳ chưa hủy; server tính quantity, meter, tiền thuê và giảm trừ bằng decimal.','Snapshot revision, representative/payer và số ACTIVE trong cùng transaction đọc hợp đồng.','Chỉ sửa DRAFT; kiểm thử ngay bằng hợp đồng ACTIVE và người ở thật do C07 đã bàn giao.'],
 ['Override=0 giữ 0; người PLANNED không tính dịch vụ theo người; chỉ số cuối<đầu bị chặn.','Đổi giá giữ snapshot; trường hợp bàn giao đại diện do C11 kiểm thử sau khi API bàn giao được viết.'],{decisions:['D12'],qa:['QA10'],handoff:['InvoiceReadPort/metrics cho B17; invoice thật cho ca bàn giao C11.']});
T('A',11,'P4','Thẻ lịch, chat bạn ghép và chia sẻ đúng tin',5,ids([83,85]),['messaging'],['BE-A08','BE-B04','BE-C02','BE-B13','BE-B09'],
 'Hoàn thiện route chat cần dữ liệu B/C: timeline đọc lịch gốc, ROOMMATE và POST_SHARE; dùng cổng đọc đã chốt, không chép bảng.',
 ['Timeline lấy viewing/proposal theo conversation có quyền; share giữ đúng postId.','ROOMMATE chỉ mở/gửi khi accepted còn hiệu lực; inactive post trả unavailable không lộ ảnh/tiêu đề.','B13 dùng ensureRoommateConversation đã có ở A08; hai phần không phụ thuộc nhau theo vòng HTTP.'],
 ['Accept kết nối đã chạy ở B13 mở đúng conversation; share không tạo join/hold/lịch.','Bài ẩn không tự đổi sang bài khác cùng phòng; timeline dùng lịch B09 đã hoàn tất.'],{decisions:['D03'],qa:['QA13']});
T('A',12,'P4','Quản trị tài khoản và tra cứu audit',5,ids([161,164],168,169),['account-admin'],['BE-A03','BE-A04'],
 'Các route /admin/users và /admin/moderation-actions thuộc A; B/C giữ các route /admin theo nghiệp vụ của họ.',
 ['Lock/unlock có reason, audit và revoke session; không xóa cư trú/nghĩa vụ.','Audit chỉ đọc, lọc đối tượng và che secret/PII khỏi snapshot.','Không sửa source SQL nhà của B để tính quyền; view hiệu lực đã xét trạng thái user.'],
 ['Tài khoản bị khóa mất quyền trên mọi chức năng qua cùng middleware.','Khóa landlord làm public view mất quyền, nhưng hợp đồng/người ở cũ được giữ.'],{qa:['QA09','QA16']});
T('A',13,'P5','Phát hành, thu đủ, hủy và thay hóa đơn',5,ids([149,152]),['billing'],['BE-A10'],
 'Hoàn thiện vòng đời hóa đơn; chủ trọ ghi nhận thu đủ trong phạm vi hiện tại, chưa thêm cổng thanh toán hay thu một phần.',
 ['Issue DRAFT có dòng tiền → UNPAID; PAID có người ghi nhận/time; hủy chưa thu có lý do.','Replacement giữ cùng contract/kỳ và liên kết bản đã hủy; không sửa lines phát hành.','JOB04 chuyển UNPAID quá due_date VN sang OVERDUE, chạy lặp an toàn; giữ quyền người trả cũ sau bàn giao, không giả có issued_at riêng.'],
 ['Hai lần thu cùng khóa không tạo thêm thu tiền; PAID/CANCELLED không sửa.','Kỳ mới lấy đại diện hiện tại, kỳ cũ vẫn đúng payer.'],{decisions:['D12'],jobs:['JOB04'],qa:['QA10']});
T('A',14,'P5','SSE có xác thực và nối lại sự kiện',5,ids(90),['messaging'],['BE-A04','BE-A09'],
 'Dùng Spring MVC SseEmitter cho kênh có xác thực/reconnect; B/C chỉ append/ghi sự kiện, không cùng sửa SSE controller.',
 ['Auth phiên, Last-Event-ID, replay trong cửa sổ lưu, recipient scope và dedupe eventId.','Phát sau commit; reconnect không coi popup đã đóng là đã đọc.','Tải trọng tối thiểu rồi client fetch resource; kiểm tra session revoked khi stream còn mở.'],
 ['Mất kết nối/retry không mất nguồn dữ liệu gốc và không lộ sự kiện người khác.','Crash/delivery lặp vẫn cho client dedupe và đọc lại feed.'],{decisions:['D09'],jobs:['JOB06'],qa:['QA12']});
T('A',15,'P6','Retention, kiểm tra audit và dashboard quản trị',3,ids(176),['platform','account-admin','integration'],['BE-A05','BE-A06','BE-A12','BE-A14','BE-B04','BE-B14','BE-C02'],
 'Dùng audit adapter đã hoàn tất tại A04; dọn phiên/token/tệp và tổng hợp dashboard bằng các metric port đã bàn giao, không chờ endpoint dashboard B17.',
 ['Kiểm tra migration/adapters D14 từ A04 vẫn đúng target; không gán nhầm review thành post.','JOB05 dọn đúng scope/hạn lưu, tệp bị giữ làm chứng cứ được bảo toàn.','Admin dashboard dùng IdentityMetrics A06, PropertyMetrics B04, ReportMetrics B14 và ResidencyMetrics C02; flags email/push chỉ bật khi provider được chốt.'],
 ['Job lặp an toàn, không xóa bằng chứng đang tham chiếu.','Mọi provider metric đã merge trước task; dashboard không công khai PII và trả asOf.'],{decisions:['D04','D05','D14'],jobs:['JOB05']});
T('A',16,'P7','Kiểm thử bảo mật, hóa đơn và lỗi hạ tầng',5,[],['platform','billing','messaging'],['BE-A15'],
 'A giữ BE/src/test/java/com/troday/e2e/PlatformE2ETests.java; kiểm thử phần nền tảng và dòng tiền, mỗi lớp test có người phụ trách rõ.',
 ['Test scope chéo ID, nhiều vai trò, revoke/LOCKED, OTP và tài liệu riêng.','Test idempotency sau commit/timeout, outbox/SSE reconnect và invoice snapshot.','Ghi bằng chứng chạy CI, migration mới và cách rollback/retry về mặt vận hành.'],
 ['QA10/11/12/15/16 đạt trên DB tạm và storage test.','Không dùng localStorage wireframe làm bằng chứng backend đã chạy.'],{qa:['QA10','QA11','QA12','QA15','QA16']});
T('A',17,'P7','Tích hợp bản bàn giao Backend',3,[],['integration'],['BE-A16','BE-B19','BE-C16'],
 'A là người tích hợp tệp dùng chung; việc phát hành thực tế là một bước riêng sau khi team duyệt bản release.',
 ['Tái sinh schema từ toàn bộ source, chốt thứ tự migration; test tạo mới/nâng cấp trên DB tạm.','Đối chiếu 176 API có đúng một task và người phụ trách, gom collection/API docs và hướng dẫn chạy.','Xác nhận G0–G6 và report E2E C16 trước bàn giao; chốt G7 sau khi A17 hoàn thành, không dùng gate chứa chính A17 làm điều kiện bắt đầu.'],
 ['Feature CI, DB check, contract tests và E2E ba lane đều xanh.','Không ai sửa tay schema sinh ra; không deploy hoặc áp dụng migration DB thật trong task tài liệu này.'],{jobs:['OPS01'],handoff:['Bản release có thể review, checklist và hướng dẫn bàn giao.']});

T('B',1,'P0','Chốt chức năng nhà/tin/lịch và dữ liệu bàn giao',3,[],['properties','posts','services','viewings','roommates'],[],
 'B đọc rule/SQL và công bố DTO/port thuộc mình trước khi phát triển; không chọn cách code theo từng vai trò UI.',
 ['Phân biệt postId/roomId, quyền nhà, capacity load, quote service và trạng thái kết nối.','Tạo BE/src/test/java/com/troday/support/fixtures/PropertyFixtures.java và SQL fixture property-*.sql trong BE/src/test/resources/sql; không sửa fixture của chức năng A/C.','Gửi đề xuất IF-ROOM/IF-SERVICE/IF-CONNECTION để C01 phân tích thuê và A02 chốt contract v1 ở các lượt tiếp theo.'],
 ['Bản đề xuất DTO/fixture đã review và bàn giao cho A02; chưa cần backend của A02 được triển khai.','D02/D07/D08/D13 được ghi rõ người đề xuất/người chốt và route bị ảnh hưởng.'],{decisions:['D02','D07','D08','D13'],handoff:['IF-ROOM','IF-SERVICE','IF-CONNECTION']});
T('B',2,'P2','Nhà/phòng CRUD và sức chứa',8,ids([29,32],[42,45]),['properties'],['BE-A02','BE-A03','BE-A06','BE-B01'],
 'Tạo/sửa nhà nháp, phòng, tình trạng và capacity bằng middleware auth và vai trò chủ trọ đã hoàn tất ở A03/A06; không giữ adapter chờ tích hợp.',
 ['Nhà create idempotency, update row_version/verification_version đúng procedure.','Mã phòng duy nhất/nhà; giá và diện tích hợp lệ, status suy từ người/hợp đồng.','Capacity gọi sp_set_room_capacity; procedure nằm workflows.sql của C, cần đổi thì gửi C patch request.'],
 ['Không đặt phòng có ACTIVE thành AVAILABLE; không giảm dưới ACTIVE+PLANNED mở+hold còn hạn.','Chạy test bằng auth middleware và tài khoản thật của A, không hardcode user Quân/demo.'],{qa:['QA05','QA09']});
T('B',3,'P2','Dịch vụ nhà/phòng và giá hiệu lực',5,ids(49,[137,144]),['services'],['BE-A02','BE-B02'],
 'B giữ toàn bộ cấu hình dịch vụ và route read dịch vụ phòng; A chỉ dùng quote đã chốt để lập hóa đơn.',
 ['Danh mục đúng rental_services hiện tại, không giả có code/active; dịch vụ riêng catalog_service_id null.','Upsert đúng nhà/phòng, active cả hai cấp; null kế thừa, override 0 giữ 0.','Công bố ServiceQuotePort có thể đọc bằng connection/UoW của consumer để chốt invoice snapshot.'],
 ['Không gán dịch vụ nhà khác; giá/phương pháp override hợp lệ.','Đổi cấu hình không cập nhật dòng invoice đã có.'],{handoff:['IF-SERVICE'],qa:['QA10']});
T('B',4,'P2','Cổng đọc nhà/phòng và kết nối cho A/C',3,[],['properties','services','roommates'],['BE-B02','BE-B03'],
 'Hoàn tất adapter SQL thật trước consumer. Mọi cổng được bàn giao đều có query, kiểm tra quyền và test DB, không chỉ có chữ ký hoặc mock.',
 ['RoomSnapshot và PropertyMetrics đọc nguồn SQL hiện có: capacity/load/right, số nhà/phòng và pending post; không chứa PII cư dân.','ConnectionPort có query accepted/not-ended đầy đủ trên schema hiện có, test với DB fixture; không phụ thuộc endpoint tạo kết nối B13.','ServiceQuotePort và FileContext resolver chạy thật, không có import vòng hoặc provider rỗng.'],
 ['Contract test và integration test dùng adapter SQL thật đều xanh trước khi bàn giao A/C.','C vẫn recheck quyền/capacity dưới khóa trong procedure, không dùng snapshot cũ làm quyền thuê.'],{handoff:['IF-ROOM','IF-SERVICE','IF-CONNECTION','PropertyMetrics cho A15; không chờ B17.']});
T('B',5,'P2','Xác minh quyền nhà và trạng thái hiệu lực',8,ids([33,41]),['properties','sql-property'],['BE-B04','BE-A05','BE-A06'],
 'B phụ trách cả /houses/.../verifications và /admin/house-verifications vì cùng một nghiệp vụ; A chỉ cung cấp tệp/auth/audit.',
 ['Nộp/rút/duyệt/từ chối/thu hồi đúng procedure, đủ loại giấy theo OWNER/AUTHORIZED/SUBLESSOR.','Ngày hiệu lực VN, định danh/version khớp; pending không tự làm mất quyền cũ.','Dùng effective view khi đọc; mất quyền chặn công khai/thuê mới nhưng giữ lịch sử.'],
 ['Không có quyền chỉ nhờ account landlord được duyệt; admin cần evidenceChecked=true.','Đổi định danh/rút/hết hạn/thu hồi giữ tệp bất biến và audit.'],{decisions:['D05'],qa:['QA09','QA15']});
T('B',6,'P2','Gửi tin kèm ảnh nguyên tử và kiểm duyệt',8,ids(47,[50,56]),['posts','sql-property'],['BE-B05','BE-A04','BE-A05'],
 'Mở rộng D07 trước khi coi API gửi bài kèm ảnh là hoàn chỉnh; B sở hữu source post-review-quota.sql, A tích hợp output SQL.',
 ['sp_submit_post nhận/ghi ảnh+amenities cùng transaction, content_version và quota 3 slot đúng hiện tại.','Edit giữ roomId; pending edit không chiếm thêm lượt; moderate/hide/restore theo đúng postId.','Các /admin/posts nằm trong controller/PostController.java của B; không sửa AccountAdminController của A.'],
 ['4 submit tranh slot chỉ có tối đa 3 pending; lỗi ảnh rollback cả bài và slot.','Duyệt/restore yêu cầu quyền nhà hiệu lực; không ảnh hưởng các tin khác của phòng.'],{decisions:['D07'],qa:['QA01','QA09'],handoff:['PublicPost DTO/file resolver và tin mẫu đã duyệt cho A08/B07.']});
T('B',7,'P2','Tìm phòng, chi tiết và lưu tin công khai',5,ids(46,[57,61]),['posts','properties'],['BE-B06'],
 'Toàn bộ nguồn public qua v_public_house_posts; tách dữ liệu phòng khỏi bài đăng.',
 ['Lọc/search/paging/sort whitelist; không lộ PII người ở trong room detail.','Lưu theo postId; tin ẩn trả placeholder/404, không chuyển sang tin khác cùng phòng.','Bàn giao PublicPostPort để A share card và tạo inquiry từ postId.'],
 ['Hết quyền nhà ẩn ngay không chờ job; khám phá loại OCCUPIED đúng rule.','Public JSON không có residents/CCCD/tin chưa duyệt.'],{handoff:['Tin/phòng công khai + price/state hiện tại; IF-ROOM bổ sung public post.'],qa:['QA09','QA13']});
T('B',8,'P3','Đề nghị lịch xem và xét duyệt',5,ids([91,94]),['viewings','sql-property'],['BE-A08','BE-B07'],
 'Triển khai proposal riêng với lịch chính thức; B giữ source viewing-proposals.sql và API proposal.',
 ['Idempotency UUID; một PENDING/tenant+room; proposal chưa giữ giờ/chỗ.','Accept khóa room, recheck context/quyền/tài khoản và overlap; tạo đúng một schedule cùng transaction.','Withdraw/expire theo now, không đợi worker; kết quả gửi vào notification source.'],
 ['Hai proposal trùng giờ có thể chờ nhưng chỉ một schedule nếu xung đột.','Duyệt lại trả linked schedule, không tạo lần hai.'],{qa:['QA02','QA14'],handoff:['ViewingReadPort cho A11 và C05.']});
T('B',9,'P3','Tạo lịch trực tiếp, tham dự và ý định thuê',5,ids([95,100]),['viewings','sql-property'],['BE-B08'],
 'Chốt đầu vào COMPLETED+AGREED cho hợp đồng; luồng này có thể hoàn thiện trước matching/ở ghép.',
 ['Hẹn trực tiếp cần tin thuê đúng conversation/room; UTC và duration 30/60/90/120.','ATTENDED/NO_SHOW/CANCEL đúng vai trò/thời điểm; quyết định thuê theo chuyển trạng thái cho phép.','Công bố fixture viewing đủ điều kiện và không đủ điều kiện; C không viết một lịch riêng.'],
 ['Khoảng [start,end) không chồng nhau, liền kề được; không hẹn bằng ROOMMATE.','AGREED không giữ phòng; withdrawal bị chặn khi còn hợp đồng mở.'],{qa:['QA02','QA14'],handoff:['COMPLETED + AGREED viewingId cho C05.']});
T('B',10,'P3','Bàn giao và kiểm tra lịch khi hợp đồng giữ phòng',3,[],['viewings'],['BE-B09','BE-C05'],
 'B giữ BE/src/test/java/com/troday/e2e/ViewingContractE2ETests.java; C giữ procedure tạo hợp đồng và đóng hoạt động xem.',
 ['Gửi contract từ lịch bàn giao, kiểm tra lịch/proposal ở mọi post cùng room.','Phân biệt lịch chưa bắt đầu với đang diễn ra/đã hết; trả event tổng hợp cho A.','Hủy contract không khôi phục lịch cũ; lập bug đúng owner file/SQL thay vì sửa chéo.'],
 ['QA03/04 chạy với cả endpoint lịch và contract thật.','Timeline A11 và list lịch đều đọc cùng trạng thái.'],{qa:['QA03','QA04'],handoff:['G3: phòng RESERVED và lịch đã đóng đúng phạm vi.']});
T('B',11,'P4','Hồ sơ ở ghép và tình trạng nhà ở',5,ids([62,64],66,67),['roommates'],['BE-B04','BE-C02','BE-C07'],
 'Tách giới thiệu hồ sơ khỏi thao tác mời; C cung cấp chứng cứ ACTIVE qua ResidencyReadPort.',
 ['PUT profile version, budget/location/available date; IN_SYSTEM do server suy từ đúng member ACTIVE.','EXTERNAL tối đa 1.000 ký tự và bỏ mô tả khi đổi trạng thái.','Giá trị lifestyle giữ schema JSON theo criterion, không thêm cột mỗi thói quen.'],
 ['Không tự gắn memberId client gửi; stale version 409.','Người chưa có ACTIVE được tự khai chưa có chỗ/ngoài hệ thống đúng rule.']);
T('B',12,'P4','Danh mục tiêu chí ghép linh động',3,ids(65,69,70),['roommates'],['BE-B11'],
 'Quản lý tiêu chí và validate nghĩa của JSON; đây là phần chuẩn bị, chưa tự coi là thuật toán ghép đã chốt.',
 ['Code duy nhất, valueType/allowedValues hợp lệ; mandatory cần preferredValue, importance 0–5.','Không đổi kiểu khiến profile cũ mất nghĩa; thay đổi tương thích cần version/plan.','Đề xuất D02 cho người chốt; giải thích score v1 và xử lý thiếu dữ liệu.'],
 ['Self/preferred JSON sai kiểu hoặc category ngoài tập bị chặn.','Ngừng tiêu chí vẫn giữ giá trị lịch sử theo chính sách.'],{decisions:['D02']});
T('B',13,'P4','Mời kết nối và tạo chat đúng một lần',5,ids([71,75]),['roommates'],['BE-B12','BE-A08'],
 'B sở hữu request/accept/cancel/end; A08 đã cung cấp cổng tạo conversation trong transaction do B mở.',
 ['Người gửi có profile, cặp chuẩn hóa chống hai chiều, receiver mới được phản hồi.','ACCEPT ghi request và ensureRoommateConversation(tx) nguyên tử, không tạo join/hold.','End ghi ended_at/reason, chặn gửi mới; policy đọc lịch sử D03 phải chốt cùng A.'],
 ['Gửi chéo không tự accept; retry accept không sinh chat trùng.','Hồ sơ cũ vẫn phản hồi được; room capacity không chặn kết nối đơn thuần.'],{decisions:['D03'],handoff:['Kết nối ACCEPTED và conversationId cho A11.']});
T('B',14,'P5','Báo cáo vi phạm và kết luận',5,ids([156,160]),['content-moderation'],['BE-B07','BE-A05','BE-A04'],
 'B xử lý report/evidence/decision bằng ReportController/ReportService/ReportRepository trong các tầng tương ứng; thay đổi trạng thái user/post theo owner liên quan.',
 ['Target đúng một loại và người báo cáo có quyền đọc; file bằng chứng PRIVATE thuộc actor.','Hàng đợi/details/decision với actor/time/resolution; audit không tự khóa user hoặc hủy thuê.','Bàn giao ReportMetrics chạy SQL thật cho A15, giữ FK và che kết quả điều tra riêng tư khỏi reporter.'],
 ['Không nhắm nhiều target cùng report; bản đóng không bị form cũ mở lại.','Nếu cần khóa account, gọi cổng A theo nghiệp vụ; không viết users repository mới.']);
T('B',15,'P6','Danh sách người phù hợp theo chính sách đã chốt',5,ids(68),['roommates'],['BE-B13'],
 'Chỉ triển khai score khi D02 đã chốt; không dùng thuật toán AI cho phần này và không điền tab AI.',
 ['Lọc self/inactive, location/budget và tiêu chí bắt buộc.','AlgorithmVersion/score/explanations cố định theo D02, test cùng dữ liệu thiếu/ngân sách biên.','Nếu D02 chưa chốt, ghi Bị chặn cho task; không trả score mẫu như kết quả thật.'],
 ['Cùng input+algorithmVersion có kết quả xác định, không lộ PII cư dân.','Cấu trúc output giữ contract, có pagination/sort ổn định.'],{decisions:['D02'],priority:'P1'});
T('B',16,'P6','Đánh giá theo bằng chứng cư trú và audit',5,ids([153,155]),['content-moderation'],['BE-B14','BE-C02','BE-C12','BE-A04'],
 'Chốt D13 về thời điểm/hạn sửa trước khi mở review; dữ liệu chứng cứ lấy từ C, audit target review do A mở rộng D14.',
 ['Unique reviewer+room+contract; đúng roomTenant evidence của actor, rating 1–5.','Public chỉ PUBLISHED, moderation không sửa bằng chứng hợp đồng/cư trú.','Giữ trạng thái cần chốt nếu D13/D14 chưa có quyết định, không ghi nhầm target_post_id.'],
 ['Tài khoản chỉ từng xem phòng không được review; không đánh giá trùng.','Ẩn review giữ audit đúng đối tượng và không làm mất cư trú.'],{decisions:['D13','D14']});
T('B',17,'P6','Dashboard chủ trọ bằng metric ports',3,ids(175),['properties'],['BE-B02','BE-B09','BE-A13','BE-C12'],
 'B sở hữu API dashboard landlord; tổng hợp read-only từ properties/viewings của B, invoice của A và rental của C.',
 ['Scope landlord cho từng metric; ACTIVE tính occupied, không đồng nhất reserved với occupied.','Lịch chưa hết giờ, hóa đơn UNPAID/OVERDUE và pending requests có nguồn đúng chức năng.','Có asOf, tách truy vấn count khỏi trả danh tính cư dân.'],
 ['Không cộng nhầm dữ liệu chủ khác; amount decimal và status phù hợp.','Contract tests của metric ports phát hiện consumer dùng field cũ.']);
T('B',18,'P6','Worker hết quyền nhà và bảo toàn dữ liệu cũ',2,[],['properties','sql-property'],['BE-B05'],
 'Đưa JOB03 vào lịch chạy mà A cung cấp; nguồn quyền hiệu lực vẫn được kiểm tra ngay khi truy vấn.',
 ['APPROVED valid_until<todayVN → EXPIRED theo chính sách, giữ proof/history.','Không xóa/ẩn vật lý từng post hoặc kết thúc contract để giả mất quyền.','Thêm bean @Scheduled trong package houserights; cấu hình lịch qua A, không sửa SchedulingConfig chung.'],
 ['Job chậm vẫn không công khai tin hết quyền; chạy lặp an toàn.','Luồng rời/kết thúc hợp đồng cũ tiếp tục dùng được.'],{jobs:['JOB03'],qa:['QA09']});
T('B',19,'P7','Kiểm thử chức năng nhà/tin/lịch và nội dung',5,[],['properties','posts','viewings','roommates','content-moderation'],['BE-B10','BE-B15','BE-B16','BE-B17','BE-B18'],
 'B giữ BE/src/test/java/com/troday/e2e/{Property,ViewingContract}E2ETests.java; kiểm thử quota, quyền nhà, lịch, kết nối và privacy trước bàn giao.',
 ['QA01/02/04/09/13/14/15 có test concurrency và quyền chéo tài khoản.','Kiểm tra D07 upload+post rollback; search/favorites/shared card sau mất quyền.','Nộp report test, collection requests và danh sách source SQL đã thay cho A.'],
 ['Mỗi endpoint B có DTO/auth/logic/test/docs/review và phạm vi file đúng owner.','Không sửa generated SQL/seed/tests của C để làm CI xanh.'],{qa:['QA01','QA02','QA04','QA09','QA13','QA14','QA15']});

T('C',1,'P0','Chốt trạng thái thuê, transaction và cổng cư trú',5,[],['rentals','sql-rental'],[],
 'C phân tích vòng đời contract/member/join/change/representative và công bố snapshot read/expected revision trước khi dựng endpoint.',
 ['Vẽ chuyển trạng thái và lock order roomId tăng dần; xác định procedure tự commit.','Công bố ResidencyReadPort/contract snapshot và fixture của C; A/B không join/ghi trực tiếp các bảng này trong service của họ.','D10 expectedRevision và D11 import được ghi là mở rộng cần làm; không xác nhận nhầm phiên bản.'],
 ['Bản phân tích thuê đã review và bàn giao A02 để chốt contract; C01 không đợi code core A02.','Planned/active/left/cancelled, payer cũ, đại diện ban đầu/hiện tại được phân biệt.'],{decisions:['D06','D10','D11'],handoff:['IF-RESIDENT']});
T('C',2,'P2','Cổng đọc hợp đồng/cư trú, thành viên và lịch sử',5,ids(48,101,102,105,[114,116],126,127),['rentals'],['BE-A02','BE-A03','BE-B04','BE-C01'],
 'C giữ cả /rooms/{roomId}/residents vì đọc cùng bằng chứng cư trú; B giữ room detail public và chỉ dùng activeCount.',
 ['Danh sách/details/revisions/members/history, candidate representative và export CSV.','ResidencyReadPort và ResidencyMetrics có query thật trên schema hiện có, hỗ trợ UoW của consumer; test DB fixture không cần endpoint tạo hợp đồng viết trước.','Privacy theo quan hệ hợp đồng, không lộ CCCD thành viên khác; CSV chống formula injection.'],
 ['A lập invoice/B xác định IN_SYSTEM bằng port thật mà không import repository C.','Không suy người ở chỉ từ representative; time không rõ trả null/chưa rõ.'],{handoff:['IF-RESIDENT','Read-only metrics/snapshot cho A10 và B11.'],qa:['QA11']});
T('C',3,'P2','Mẫu hợp đồng và phiên bản mẫu',3,ids([165,167]),['rentals'],['BE-C02','BE-A04'],
 'Các /admin/contract-templates nằm trong controller/ContractTemplateController.java, service/ContractTemplateService.java và repository/ContractTemplateRepository.java của C.',
 ['Tạo version mới theo name có unique/khóa; không sửa nội dung bản đã dùng.','Chủ chỉ thấy active; admin bật/ngừng, snapshot revision giữ nội dung riêng.','Audit template dùng adapter/target D14 đã được A04 hoàn tất, không đợi task A15 ở cuối kế hoạch.'],
 ['Hai lần tạo cùng name không đụng version; hợp đồng cũ không đổi khi ngừng mẫu.','Không thêm templateController vào file admin chung.'],{decisions:['D14']});
T('C',4,'P2','Bảo vệ expected revision và adapter procedure',5,[],['rentals','sql-rental'],['BE-C01','BE-C02','BE-A04'],
 'C sửa đúng file workflows.sql để đóng D10 trước route confirm; chuẩn bị adapter/test các giao dịch thuê bằng fixture, không chờ UI/hẹn xem thật.',
 ['Procedure confirm nhận expectedRevisionId và so dưới cùng khóa; stale 409 không xác nhận bản mới.','Mapper camelCase → SQL params/JSON snake_case; StoredProcedureGateway là bean riêng có @Transactional(propagation=Propagation.NEVER), không bị bọc transaction Spring ngoài.','Race/rollback fixture cho create/move-in/handover/transfer; đưa patch source cho A tái sinh SQL trước tích hợp.'],
 ['QA06 xác nhận A sau khi B đã gửi bị chặn; test không chỉ check trước CALL ở controller.','Các OUT ID và lỗi SIGNAL được ánh xạ ổn định, không lộ SQL ra HTTP.'],{decisions:['D10','D15'],qa:['QA06'],handoff:['Expected revision adapter và source SQL được A tích hợp.']});
T('C',5,'P3','Gửi hợp đồng thuê mới và đóng lịch tương lai',8,ids(103,104),['rentals','sql-rental'],['BE-C03','BE-C04','BE-B09'],
 'Tạo hợp đồng và side effects thuê mới trong một transaction procedure; B giữ API lịch nhưng C giữ source contract-viewing-cleanup.sql.',
 ['Lịch COMPLETED+AGREED, phòng/quyền nhà/capacity, một open contract; tạo revision+PLANNED+history.','Đóng lịch/proposal theo room trên mọi post, thông báo cùng giao dịch; preview chỉ là read-only.','Không sửa source lịch của B để hủy contract/viewings; thay đổi helper thuộc B đi qua B.'],
 ['Tranh giữ phòng chỉ một hợp đồng thắng; lỗi bất kỳ rollback mọi side effect.','Hủy contract không hồi lịch cũ, đang diễn ra không bị tự hủy.'],{qa:['QA03','QA04'],handoff:['Contract PENDING_CONFIRMATION, room RESERVED và member PLANNED cho C06/A.']});
T('C',6,'P4','Yêu cầu sửa, gửi lại và xác nhận phiên bản',5,ids([106,109]),['rentals','sql-rental'],['BE-C05'],
 'Xử lý vòng đời điều khoản trước vào ở; confirmation và move-in là hai nghiệp vụ riêng.',
 ['Feedback hủy bản chờ/tạo DRAFT mới; chỉ sửa nháp rồi submit phiên bản có snapshot.','Confirm đúng đại diện và expected revision bằng procedure đã sửa ở C04.','Ghi đủ landlord/tenant confirmation/time; quyền nhà kiểm tra lại, không tự ACTIVE.'],
 ['Form revision cũ không ghi đè/xác nhận bản mới.','Xác nhận giữ người PLANNED và hợp đồng CONFIRMED.'],{decisions:['D10'],qa:['QA06']});
T('C',7,'P4','Vào ở từng người, hủy dự kiến và hủy trước ở',5,ids([110,112]),['rentals','sql-rental'],['BE-C06'],
 'Tạo bằng chứng thực tế ở để invoice/roommate profile tiêu thụ; bảo toàn người dự kiến chưa đến.',
 ['Lần đầu có đại diện; đúng ngày VN/contract/revision/quyền nhà; một ACTIVE/account toàn hệ thống.','Hủy member chỉ PLANNED và không hủy riêng đại diện; hủy contract trước ACTIVE.','Publish snapshot/metrics mới, không tạo invoice hoặc sửa roommate profile thay A/B.'],
 ['Confirm contract không tự move-in; date tương lai/ngoài kỳ bị chặn.','Load phòng không đếm trùng, hủy không giả ngày vào/ra.'],{qa:['QA05'],handoff:['Contract ACTIVE + ACTIVE residents thực cho A10, B11 và C09.']});
T('C',8,'P4','Liên kết cư dân với tài khoản bằng token',5,ids(27,28),['rentals'],['BE-C07','BE-A07'],
 'Dù route nằm nhóm sessions của danh mục API, C giữ endpoint liên quan member; A giữ TokenPort/verification_tokens repository.',
 ['Chủ mời member đúng contract chưa có tenant; OCCUPANT_LINK gắn target room_tenant.','Service C dùng @Transactional/TransactionTemplate để tiêu thụ token và gắn account; token repository A tham gia cùng transaction/DataSource.','Chốt D06 kênh/đối chiếu người nhận; không gắn tài khoản theo tên tự khai.'],
 ['User đang ACTIVE nơi khác không được gắn thêm ACTIVE; token dùng lại/hết hạn thất bại.','Rollback gắn member cũng rollback consume, không mất token sau lỗi.'],{decisions:['D06'],handoff:['Contract test TokenPort + Spring transaction cho A review.']});
T('C',9,'P4','Yêu cầu thêm người và hai consent riêng',5,ids([117,120]),['rentals'],['BE-C07'],
 'C giữ nghiệp vụ thuê chung; kết nối B13 chỉ là ngữ cảnh tham khảo, không phải đồng thuận thuê.',
 ['Đại diện hiện tại tạo request, applicant khác requester, một yêu cầu mở.','Mỗi bên tự consent theo actor; đủ hai mới PENDING_LANDLORD, bản cũ sau handover không tái dùng.','Cancel đúng vai trò/trạng thái, snapshot representative/revision hợp lệ.'],
 ['Không copy ACCEPTED của roommate_request làm consent; không giả người đồng ý trong body.','Hợp đồng/đại diện không còn ACTIVE thì không gửi/duyệt tiếp.']);
T('C',10,'P5','Duyệt giữ chỗ 48 giờ và hoàn tất thêm người',8,ids([121,124]),['rentals','sql-rental'],['BE-C09'],
 'Giữ một chỗ khác với giữ cả phòng; mọi điểm quyết định khóa phòng và tính load đầy đủ.',
 ['Approve/reject/cancel hold theo quyền và consent; 48 giờ theo chính sách đã có.','Complete recheck hold/time/account/capacity, tạo member ACTIVE và liên kết hai chiều đúng FK.','Retry đã completed trả kết quả cũ qua idempotency, không gọi lại procedure tạo thêm member.'],
 ['Hai người tranh chỗ cuối chỉ một approve; hold quá hạn không tính tải dù job chưa chạy.','Complete fail không để member mồ côi/hold đã consume.'],{qa:['QA05']});
T('C',11,'P5','Rời phòng và bàn giao đại diện',5,ids(125,128),['rentals','sql-rental'],['BE-C10','BE-A13'],
 'C giữ transaction handover/move-out, không chia một phần history cho A hay phần status phòng cho B.',
 ['Chọn successor ACTIVE cùng contract có account ACTIVE; consent landlord recorded, reason bắt buộc.','Đóng history, LEFT người cũ, đại diện mới, hủy request cũ, notify cùng giao dịch.','Người cuối rời xử lý mọi member mở; không đổi payer invoice cũ, viewing gốc hoặc terms cũ.'],
 ['QA07 kiểm thử bằng hóa đơn A13 đã phát hành/thu tiền, giữ nguyên giá/cọc/thời hạn/contract.','Nhà hết quyền vẫn rời/kết thúc được; thiếu chứng cứ không tự đoán ngày.'],{qa:['QA07','QA09'],handoff:['Kết quả bàn giao và payer/history cho lượt kiểm thử A16.']});
T('C',12,'P5','Gia hạn, đổi phòng và chấm dứt có xác nhận',8,ids([129,136]),['rentals','sql-rental'],['BE-C11','BE-B04'],
 'Một chủ sở hữu cho toàn luồng yêu cầu → duyệt → xác nhận → apply; B cung cấp phòng đích, A giữ nghĩa vụ hóa đơn cũ.',
 ['Một yêu cầu mở; baseRevision/current representative/proposal bất biến và effective date.','Renewal có proposed revision confirmed và quyền nhà; transfer lock room theo ID, kiểm tra mọi điều kiện trước đóng nguồn.','Termination đóng ACTIVE, hủy PLANNED, history/yêu cầu, không xóa invoice; chuyển phòng đích tạo PLANNED chờ vào thực tế.'],
 ['QA08 lỗi đích rollback nguồn; chuyển đủ ACTIVE+PLANNED, không chỉ đại diện.','Gửi/approve/confirm chưa đổi contract; apply stale/hết quyền/đến ngày sai bị chặn.'],{qa:['QA08','QA09'],handoff:['Contract/resultContractId và case history cho dashboard/review.']});
T('C',13,'P6','Nhập hợp đồng giấy có phân quyền riêng',8,ids(113),['rentals','sql-rental'],['BE-C12','BE-A05'],
 'Đóng D11 rồi viết transaction nhập có bằng chứng thật; route nằm giai đoạn mở rộng vì SQL chưa có procedure nhập đầy đủ.',
 ['Chốt JSON members/state/date, chứng cứ đã ký, quyền import riêng và policy dữ liệu lịch sử.','Tạo contract/revision IMPORTED/member/history đúng FK và capacity, không giả tenant confirmation.','Không dùng source PAPER_IMPORT trên thuê mới để né quy trình quyền nhà/lịch xem.'],
 ['Không có quyền/tệp/identity mapping hợp lệ thì không nhập nửa chừng.','Không điền ngày nhận đại diện/ngày rời bằng suy đoán.'],{decisions:['D11'],priority:'P2'});
T('C',14,'P6','Worker thuê, hết hold và đối soát cư trú',3,[],['rentals','sql-rental'],['BE-C12'],
 'C triển khai jobs/ops thuộc thuê; A chỉ sở hữu SchedulingConfig và cấu hình lịch Spring, không cùng sửa logic worker.',
 ['JOB01 expire proposal gọi thủ tục B sở hữu; thay thuật toán lịch thì gửi B.','JOB02 hold hết hạn; OPS02 báo ACTIVE trên contract đóng; OPS03 chốt quy trình hết hạn lease.','Không tự cho người ở LEFT hoặc đóng lease vì chỉ đến end_date; dữ liệu mâu thuẫn cần đối soát.'],
 ['Job lặp không tạo side effects mới; read/write vẫn recheck now khi worker trễ.','Hợp đồng cũ, lịch sử và nghĩa vụ hóa đơn được giữ.'],{jobs:['JOB01','JOB02','OPS02','OPS03']});
T('C',15,'P7','Kiểm thử race/rollback toàn bộ giao dịch thuê',5,[],['rentals','sql-rental'],['BE-C13','BE-C14','BE-B10'],
 'C giữ BE/src/test/java/com/troday/e2e/RentalE2ETests.java và integration/RentalSql*Tests.java, tập trung luồng tạo/chốt/ở/rời/chuyển.',
 ['QA03/05/06/07/08/09 chạy hai connection và fault injection trong transaction.','Kiểm tra lock order, OUT ID, FK ghép, snapshot và notification không ghi nửa chừng.','Đọc lại lịch sử/account scope sau handover, termination, transfer; lưu bằng chứng DB tạm.'],
 ['Một phòng một open contract; một account một ACTIVE; không vượt capacity.','Main SQL sinh ra và feature adapter cùng chữ ký procedure mới.'],{qa:['QA03','QA05','QA06','QA07','QA08','QA09']});
T('C',16,'P7','E2E thuê xuyên các chức năng và bàn giao API',3,[],['rentals'],['BE-C15','BE-A16','BE-B19'],
 'C chạy chuỗi nghiệp vụ đầy đủ với API thật sau khi A/B nộp report chức năng; A vẫn là người tích hợp bản release.',
 ['Auth → upload → nhà/quyền → post → chat → viewing → contract → confirm/move-in → invoice → handover/transfer/terminate.','Đối chiếu API coverage/task owner và collection request; báo lỗi về đúng người, không sửa chéo file.','Nộp report G7, các limit ngoài phạm vi và dữ liệu reset/test cho A17.'],
 ['Không còn stub tại production composition root; toàn bộ API được kế hoạch đánh dấu đạt có test thật.','D11/D02 và các điểm chưa chốt không bị tự đánh dấu hoàn thành vì có fixture.'],{handoff:['Báo cáo E2E liên chức năng cho A17.']});

const interfaces = [
 ['IF-CORE','A','BE-A02',['B','C'],'ActorContext; ApiResponse<T>; DomainException; TransactionTemplate; StoredProcedureGateway','SecurityContext → actor.userId/roles/sessionId/requestId; ID string; BigDecimal/Instant/LocalDate','Service dùng transaction Spring; CALL tự commit qua bean Propagation.NEVER, không self-invocation. tx trong các port là ngữ cảnh cùng DataSource trên server, không truyền JDBC Connection qua HTTP.'],
 ['IF-TOKEN','A','BE-A07',['C'],'TokenPort.issue/consume(purpose,target,actor,tx)','Purpose OCCUPANT_LINK; targetRoomTenantId; expiresAt; attempt/consumed/revoked','Service C mở transaction Spring khi liên kết; adapter A tham gia cùng tx/DataSource, không gọi HTTP hoặc commit riêng.'],
 ['IF-FILES','A','BE-A05',['B','C'],'FilePort.assertUsable/authorizeDownload(actor,fileId,purpose,context,tx?)','Metadata PRIVATE/ACTIVE, owner, MIME/size/hash/expiry; fileId, không có bucket URL cố định','Context resolver theo chức năng, lớp nằm trong service; proof đã nộp bất biến, không tạo import vòng.'],
 ['IF-ROOM','B','BE-B04',['A','C'],'PropertyReadPort.getRentalSnapshot/getMetrics(actor,roomId?,tx?)','house/room/post counts và rental snapshot; asOf, không PII; provider SQL thật hoàn tất tại B04','Khi giữ phòng/gia hạn/chuyển phải kiểm tra lại dưới khóa SQL; metrics không đợi dashboard B17.'],
 ['IF-SERVICE','B','BE-B03',['A'],'ServiceQuotePort.getEffective(roomId,tx)','name/unit/method/unitPrice từ active_room_services, null kế thừa/0 giữ 0','A chốt bản sao invoice dưới UoW; B đổi bảng giá không sửa invoice_items.'],
 ['IF-RESIDENT','C','BE-C02',['A','B'],'ResidencyReadPort.getContractSnapshot/getActiveStay/getMetrics(actor,contractId?,tx?)','currentRevision/payer/member, contract/join metrics và roomId; SQL thật đã kiểm thử ở C02','Không tính cư trú chỉ bằng status contract/representative. Consumer không ghi room_tenants.'],
 ['IF-CHAT','A','BE-A08',['B','C'],'ConversationPort.assertInquiry/ensureRoommateConversation(tx,request)','conversationId/postId/roomId/tenantId/landlordId; đúng hai participant','B13 accept và tạo chat dùng cùng tx; không gọi API A qua mạng trong transaction.'],
 ['IF-VIEWING','B','BE-B08',['A','C'],'ViewingReadPort.getTimeline/getRentalEvidence(actor,context,tx?)','Proposal/schedule hiện tại theo conversation, viewingId/status/tenantDecision cho hợp đồng','Chỉ đọc bảng lịch gốc; người gọi kiểm tra quyền, không tạo bản sao trạng thái trong chat.'],
 ['IF-CONNECTION','B','BE-B04',['A','C'],'ConnectionReadPort.assertAccepted(actor,connectionId,tx?)','sender/receiver/status/endedAt, không dùng làm consent thuê','A kiểm tra khi mở/gửi, C lấy consent riêng từ đại diện và applicant.'],
 ['IF-EVENT','A','BE-A04',['B','C'],'EventPort.append(tx,event) + procedure notification dispatcher','eventId/eventKey/recipient/resource/occurredAt; business event version','Service append cùng tx; procedure theo cơ chế sau COMMIT đã chốt, không insert thông báo trùng.'],
 ['IF-AUDIT','A','BE-A04',['B','C'],'AuditPort.append(tx,actor,action,target,before,after,reason)','D14 được chốt và triển khai tại A04, có target template/review/criterion trước mọi consumer','Procedure đã audit thì không ghi lần hai. Không nhét review/template vào target_post_id.']
].map(([id,owner,taskId,consumers,signature,payload,rule])=>({id,owner,taskId,consumers,signature,payload,rule}));

const gates = [
 ['G0','P0','Contract v1 và quyền file được chốt','A01 → B01 → C01 → A02 đã merge/review; bản contract chốt dùng hai bản phân tích đã bàn giao.'],
 ['G1','P1','Nền tảng hoạt động thật','Auth, audit mở rộng, idempotency, tệp, cấp vai trò và TokenPort đã chạy với DB/kho test, sẵn sàng cho chức năng nghiệp vụ.'],
 ['G2','P2','Nhà/phòng và các provider đã sẵn sàng','Có cổng đọc SQL thật, mẫu hợp đồng, quyền nhà, tin public và expected revision; consumer ở lượt sau không phải chờ implementation.'],
 ['G3','P3','Chat → hẹn xem → giữ phòng nguyên tử','Chat/thông báo đã xong trước lịch xem; contract dùng COMPLETED+AGREED rồi đóng lịch tương lai, có test tranh giữ phòng.'],
 ['G4','P4','Cư trú thực tế và hóa đơn nháp','Move-in xong trước hồ sơ IN_SYSTEM/hóa đơn; kết nối xong trước thẻ chia sẻ; token link, consent và quản trị tài khoản đạt.'],
 ['G5','P5','Bàn giao/đổi phòng/thu tiền đúng lịch sử','Thu tiền hoàn tất trước ca bàn giao; đổi phòng rollback đúng, hold 48h hợp lệ, báo cáo và SSE dùng provider đã hoàn tất.'],
 ['G6','P6','Chính sách và worker đã rõ','D02/D11/D13 được chốt tại task dùng; D14 đã xong từ A04. Metrics không chờ dashboard; worker giữ lịch sử.'],
 ['G7','P7','Bản bàn giao có bằng chứng','C15 → B19 → A16 → C16 → A17 đã review/merge; đủ 176 API và SQL/E2E, không còn provider rỗng ở production.']
].map(([id,phase,title,acceptance])=>({id,phase,title,taskIds:sequenceByPhase[phase],acceptance}));

const rules = [
 ['Thư mục theo tầng, phân công theo chức năng','Mỗi người làm controller/service/repository/model/DTO/test của chức năng mình trong các tầng dùng chung. A giữ nền tảng/tài khoản/tệp/chat/hóa đơn, B giữ nhà/tin/lịch/nội dung, C giữ thuê/cư trú; tên lớp và task xác định người phụ trách.'],
 ['Java Spring Boot theo tầng','Backend nằm tại troday/BE, package gốc com.troday. Controller/service/repository/model/dto và các tầng hỗ trợ nằm trực tiếp dưới package gốc; không tạo package chức năng hoặc thư mục theo người. Các /admin/<nghiệp vụ> đặt trong controller của chức năng tương ứng.'],
 ['Một hàng đợi, một task đang thực hiện','Làm theo số thứ tự toàn cục 01–52. Chỉ nhận task đầu tiên chưa hoàn thành; hai người còn lại review khi được yêu cầu, không mở một luồng code riêng.'],
 ['Hoàn tất và merge trước khi chuyển lượt','Task hiện tại phải đủ 7 bước, có PR/commit và bằng chứng test, đã merge main cùng SQL sinh ra nếu có. Người nhận cập nhật main từ commit bàn giao rồi mới tạo nhánh/task kế tiếp.'],
 ['Phân biệt quyền sửa theo lớp và task','Cần đổi interface/SQL/lớp của chức năng do người khác phụ trách: gửi ví dụ trước/sau và contract test. Owner cập nhật lớp đó trong tầng tương ứng; việc dùng chung thư mục không có nghĩa mọi người cùng sửa một lớp.'],
 ['Tệp dùng chung có một người tích hợp','A giữ TrodayApplication, config/security/exception/util, lớp DTO chung, pom.xml/Maven Wrapper, profile, CI và output SQL. B/C thêm lớp nghiệp vụ trong controller/service/repository/model/dto. Dependency/cấu hình mới do A tích hợp trong lượt bàn giao.'],
 ['SQL nguồn và SQL sinh ra','B sửa house-rights/post-review-quota/viewing-proposals; C sửa workflows/contract-viewing-cleanup. A build/commit schema/migration sinh ra từ nguồn mới nhất trên nhánh tích hợp sau mỗi thay đổi SQL. Feature CI assemble vào thư mục tạm; main vẫn phải qua db:check.'],
 ['Migration có thứ tự do A cấp','Tên migration mới chứa task ID và số thứ tự đăng ký, mỗi task một file; không sửa migration đã áp dụng. Chỉ A cập nhật manifest/thứ tự chung và thực thi trên DB tạm. Không chạy migration chung trên DB cá nhân của người khác.'],
 ['Chủ sở hữu code khác chủ transaction','Các procedure thuê ghi nhiều bảng (room, contract, member, history, notification) trong một giao dịch là chủ đích. Không tách thành ba HTTP call giữa A/B/C. C giữ transaction thuê; A/B nhận read/event sau commit.'],
 ['Một DB test cho mỗi người và mỗi lần chạy','JUnit/MockMvc cho HTTP và unit; MySQL test độc lập/Testcontainers cho CHECK/FK/trigger/procedure/race. Fixture Java dùng support/fixtures, SQL dùng src/test/resources/sql, đặt tên theo chức năng; không chia thư mục A/B/C hoặc cùng sửa một fixture. CI dọn đúng instance do nó tạo.'],
 ['PR nhỏ, review chéo, merge tuần tự','Nhánh be/A|B|C/BE-xx-slug → PR theo task. Rebase nhánh riêng lên main trước mở/merge PR; không rebase/force-push main hoặc nhánh người khác. Reviewer mặc định A→B, B→C, C→A; SQL/shared contract cần owner liên quan cùng duyệt.'],
 ['Provider thật trước consumer','Port/query/procedure được bàn giao phải có implementation và test DB thật ở task cung cấp. Mock chỉ dùng cô lập unit test; không lấy provider rỗng hoặc một task tương lai làm điều kiện hoàn thành task hiện tại. Nếu thiếu đầu vào, dừng tại task hiện tại để xử lý.'],
 ['Phân công theo trách nhiệm, thực hiện theo số thứ tự','A/B/C giữ các lớp thuộc chức năng của mình xuyên các tầng. SP chỉ mô tả độ lớn tương đối, không dùng để xếp ba người làm cùng thời điểm. Các mốc P0–P7 là các đoạn liên tiếp của một hàng đợi.'],
 ['Nguồn theo dõi có phạm vi rõ','Trang lưu tiến độ trên trình duyệt này; Excel là checklist bản sao riêng, không tự đồng bộ hai chiều hay giữa máy. Muốn làm việc cả nhóm, dùng một workbook chung hoặc công cụ quản lý task và đưa PR/test evidence về đó; không coi localStorage là hệ thống nhóm.']
].map(([title,body],i)=>({id:`RULE-${String(i+1).padStart(2,'0')}`,title,body}));

const decisions = [
 ['D01','A','BE-A02','Người phụ trách sản phẩm + cả team'],['D02','B','BE-B15','Người phụ trách sản phẩm'],['D03','A','BE-A08','Người phụ trách sản phẩm + B'],['D04','A','BE-A15','Người phụ trách sản phẩm'],['D05','A','BE-A05','Người phụ trách sản phẩm + B/C'],['D06','C','BE-C08','Người phụ trách sản phẩm + A'],['D07','B','BE-B06','B đề xuất, A tích hợp SQL, C review giao dịch'],['D08','A','BE-A08','A đề xuất, B review ngữ cảnh'],['D09','A','BE-A04','Cả team chốt semantics transaction/delivery'],['D10','C','BE-C04','C đề xuất, A tích hợp SQL'],['D11','C','BE-C13','Người phụ trách sản phẩm + A/B'],['D12','A','BE-A10','Người phụ trách sản phẩm + C'],['D13','B','BE-B16','Người phụ trách sản phẩm + C'],['D14','A','BE-A04','A đề xuất, B/C chốt target trước khi consumer được viết'],['D15','A','BE-A02','Cả team chốt cơ chế version']
].map(([id,owner,taskId,approver])=>({id,owner,taskId,approver}));

module.exports={people,phases,modules,tasks,interfaces,gates,rules,decisions,architecture,executionOrder:Object.values(sequenceByPhase).flat(),sequencePolicy,interfaceRequirements};
