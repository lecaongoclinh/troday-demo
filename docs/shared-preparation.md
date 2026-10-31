# Chuẩn bị phần dùng chung trước luồng nghiệp vụ

> Tài liệu sinh từ `scripts/shared-preparation-plan.cjs`; cập nhật nguồn rồi chạy `npm run plan:build`.

Làm nền tảng chung trước; sau đó chuẩn bị model, mapper và repository vừa đủ cho từng nhóm chức năng rồi viết service của nhóm đó. Đây là thứ tự chi tiết bên trong các task hiện có.

Bước 1–2 chuẩn bị nền tảng; bước 3–6 lặp lại cho từng nhóm chức năng theo hàng đợi. Các model/repository của toàn hệ thống không phải điều kiện để bắt đầu AuthService hay HouseService.

## Thứ tự thực hiện

| Bước | Phụ trách | Đầu ra | Điều kiện chuyển bước |
| --- | --- | --- | --- |
| 1. Chốt hợp đồng dữ liệu | A + B + C | Thống nhất field/nullable/status từ SQL, ID JSON, tiền, thời gian, lỗi, phân trang và chữ ký hàm. Ghi consumer của từng model/query. | B01/C01 bàn giao phân tích; A02 chốt contract trước các consumer. |
| 2. Hoàn tất nền tảng dùng chung | A | ApiResponse/PageMeta, lỗi tập trung, ActorContext, Clock, cấu hình JDBC và quy ước transaction/procedure. | A01/A02 có code và test; model và query nghiệp vụ chưa cần hoàn tất toàn bộ. |
| 3. Model/projection cho nhóm đang làm | Owner chức năng | Chỉ tạo model được luồng hiện tại hoặc consumer đã xác định sử dụng; tách projection đọc khỏi response HTTP có dữ liệu riêng tư. | Có danh sách field và nơi sử dụng; không sinh model cho mọi bảng chỉ để đủ bộ. |
| 4. RowMapper và repository/query | Owner chức năng | mapRow, truy vấn cụ thể, lọc quyền, null/decimal/date mapping, ghi có điều kiện. Luồng SQL đã có procedure dùng gateway thay CRUD chồng lên procedure. | Truy vấn/ghi chạy trên MySQL test, xử lý trường hợp không có dữ liệu và lỗi ràng buộc. |
| 5. Bàn giao hàm được nhiều luồng dùng | Provider A/B/C | Cổng tệp/token/audit/event, snapshot phòng/cư trú, báo giá dịch vụ và bằng chứng lịch xem theo mốc cung cấp bên dưới. | Có implementation và test; interface hoặc mock riêng lẻ chưa phải bàn giao hoàn tất. |
| 6. Service → controller → kiểm thử luồng | Owner chức năng | Service điều phối quyền/trạng thái/transaction; controller nhận DTO và trả kết quả. Hoàn tất một luồng có thể kiểm thử rồi bổ sung nhóm tiếp theo. | Kiểm thử thành công, sai quyền, dữ liệu cũ, rollback và retry liên quan; ghi PR/test vào task hiện tại. |

## File và hàm đề xuất

Các đường dẫn tính từ `BE/src/main/java/com/troday/`. Tên file/hàm là minh họa cần chốt tại task, chưa phải implementation đã có. Các mục dưới đây theo mốc cung cấp trong hàng đợi hiện tại.

### COMMON-01 — Response, lỗi và phân trang

Phạm vi: Toàn hệ thống. Provider: **A / BE-A02**. Consumer: `BE-A03`, `BE-B02`, `BE-C02`.

- `dto/response/ApiResponse.java`
- `dto/response/PageMeta.java`
- `dto/request/PageQuery.java`
- `exception/DomainException.java`
- `exception/GlobalExceptionHandler.java`

Hàm đề xuất: `ApiResponse.success(data)`; `PageQuery.validate(allowedSortFields)`; `GlobalExceptionHandler.handleDomainException(...)`.

Điều kiện bàn giao: Contract JSON đúng kiểu; validate page/size/sort, thống nhất lỗi và requestId; không lộ SQL hoặc PII.

### COMMON-02 — Actor, đồng hồ và ranh giới giao dịch

Phạm vi: Toàn hệ thống. Provider: **A / BE-A02**. Consumer: `BE-A03`, `BE-B02`, `BE-C04`.

- `security/ActorContext.java`
- `config/ClockConfig.java`
- `exception/ProcedureErrorTranslator.java`
- `repository/procedure/StoredProcedureGateway.java`

Hàm đề xuất: `ActorContext.requireUserId()`; `Clock.instant()`; `ProcedureErrorTranslator.toDomainException(sqlException)`; `StoredProcedureGateway: kiểm tra Propagation.NEVER qua Spring proxy`.

Điều kiện bàn giao: Actor từ SecurityContext; Clock có thể cố định trong test. Gateway dùng chữ ký procedure tường minh, không cho client chọn SQL/procedure tùy ý.

### COMMON-03 — Dữ liệu người dùng và phiên

Phạm vi: Nhiều luồng danh tính. Provider: **A / BE-A03**. Consumer: `BE-A03`, `BE-A06`, `BE-A07`.

- `model/User.java`
- `model/AuthSession.java`
- `repository/mapper/UserRowMapper.java`
- `repository/UserRepository.java`
- `repository/SessionRepository.java`

Hàm đề xuất: `UserRepository.findById(userId)`; `UserRepository.findByLogin(login)`; `SessionRepository.findActive(sessionId,now)`.

Điều kiện bàn giao: Chuẩn bị trong A03 trước AuthService. Thông tin xác thực không đi vào response chung; kiểm tra user/session bị khóa hoặc hết hạn.

### COMMON-04 — Idempotency, audit và sự kiện

Phạm vi: Các luồng có tác dụng ghi. Provider: **A / BE-A04**. Consumer: `BE-A05`, `BE-B06`, `BE-C03`.

- `repository/IdempotencyRepository.java`
- `service/IdempotencyService.java`
- `service/AuditPort.java`
- `service/EventPort.java`

Hàm đề xuất: `IdempotencyRepository.tryStart(scope,key,hash)`; `IdempotencyRepository.storeResult(...)`; `AuditPort.append(tx,...)`; `EventPort.append(tx,event)`.

Điều kiện bàn giao: Cùng key/payload không ghi lặp; khác payload bị từ chối. Audit/event dùng đúng transaction; procedure đã ghi thì không ghi lần hai. D09/D14 phải chốt.

### COMMON-05 — Metadata tệp và quyền sử dụng

Phạm vi: Xác minh, tin đăng, chứng cứ. Provider: **A / BE-A05**. Consumer: `BE-A06`, `BE-B05`, `BE-B06`, `BE-C13`.

- `model/FileMetadata.java`
- `repository/mapper/FileMetadataRowMapper.java`
- `repository/FileRepository.java`
- `service/FilePort.java`
- `integration/FileStorageClient.java`

Hàm đề xuất: `FileRepository.findById(fileId)`; `FilePort.assertUsable(actor,fileId,purpose,context,tx)`; `FilePort.authorizeDownload(...)`.

Điều kiện bàn giao: Kiểm thử quyền đọc private, chủ sở hữu, mục đích, trạng thái tệp và retention; trả metadata cần thiết, không dùng URL bucket cố định.

### COMMON-06 — Token dùng một lần

Phạm vi: OTP/reset và liên kết cư dân. Provider: **A / BE-A07**. Consumer: `BE-A07`, `BE-C08`.

- `repository/TokenRepository.java`
- `service/TokenPort.java`

Hàm đề xuất: `TokenPort.issue(purpose,target,actor,tx)`; `TokenPort.consume(purpose,target,actor,tx)`.

Điều kiện bàn giao: Consume nguyên tử, đúng purpose/target, có hạn dùng; rollback luồng liên kết phải rollback consume. Không tự commit ngoài transaction consumer.

### COMMON-07 — Nhà/phòng và mapper cơ bản

Phạm vi: CRUD và nguồn đọc phòng. Provider: **B / BE-B02**. Consumer: `BE-B02`, `BE-B04`.

- `model/House.java`
- `model/Room.java`
- `repository/mapper/HouseRowMapper.java`
- `repository/mapper/RoomRowMapper.java`
- `repository/HouseRepository.java`
- `repository/RoomRepository.java`

Hàm đề xuất: `HouseRepository.findOwnedById(actor,houseId)`; `RoomRepository.findById(roomId)`; `HouseRepository.insert(...)`.

Điều kiện bàn giao: Làm model/mapper/repository trong B02 trước HouseService/RoomService; quyền sửa nhà và xử lý sức chứa đúng SQL hiện có.

### COMMON-08 — Báo giá dịch vụ hiệu lực

Phạm vi: Dịch vụ và hóa đơn. Provider: **B / BE-B03**. Consumer: `BE-B03`, `BE-A10`.

- `model/ServiceQuote.java`
- `repository/mapper/ServiceQuoteRowMapper.java`
- `repository/ServiceQuoteRepository.java`
- `service/ServiceQuotePort.java`

Hàm đề xuất: `ServiceQuoteRepository.findEffectiveByRoomId(roomId)`; `ServiceQuotePort.getEffective(roomId,tx)`.

Điều kiện bàn giao: Null kế thừa, override 0 giữ 0, tiền dùng BigDecimal; invoice giữ snapshot, không đọc lại giá mới thay giá đã chốt.

### COMMON-09 — Snapshot phòng và kết nối

Phạm vi: Chat, lịch xem và hợp đồng. Provider: **B / BE-B04**. Consumer: `BE-A08`, `BE-C05`.

- `model/RoomSnapshot.java`
- `repository/mapper/RoomSnapshotRowMapper.java`
- `repository/PropertyReadRepository.java`
- `repository/ConnectionReadRepository.java`
- `service/PropertyReadPort.java`
- `service/ConnectionReadPort.java`

Hàm đề xuất: `PropertyReadPort.getRentalSnapshot(actor,roomId,tx)`; `ConnectionReadPort.assertAccepted(actor,connectionId,tx)`.

Điều kiện bàn giao: Provider SQL thật, không có PII cư dân. Snapshot dùng đọc; giữ phòng/gia hạn/chuyển vẫn kiểm tra lại quyền và capacity dưới khóa.

### COMMON-10 — Snapshot hợp đồng và cư trú

Phạm vi: Hồ sơ ở ghép, hóa đơn, thuê. Provider: **C / BE-C02**. Consumer: `BE-C05`, `BE-B11`, `BE-A10`.

- `model/ContractSnapshot.java`
- `model/ActiveStay.java`
- `repository/mapper/ContractSnapshotRowMapper.java`
- `repository/ResidencyReadRepository.java`
- `service/ResidencyReadPort.java`

Hàm đề xuất: `ResidencyReadPort.getContractSnapshot(actor,contractId,tx)`; `ResidencyReadPort.getActiveStay(actor,tx)`; `ResidencyReadPort.getMetrics(...)`.

Điều kiện bàn giao: Kiểm thử bằng MySQL fixture trước API tạo hợp đồng; phân biệt ACTIVE/PLANNED, payer và representative; chỉ trả projection được phép đọc.

### COMMON-11 — Gateway giao dịch thuê và revision

Phạm vi: Các luồng ghi thuê. Provider: **C / BE-C04**. Consumer: `BE-C05`, `BE-C06`, `BE-C07`.

- `repository/procedure/RentalProcedureGateway.java`

Hàm đề xuất: `RentalProcedureGateway: CALL có IN/OUT và expectedRevision theo từng thủ tục`; `Dùng ProcedureErrorTranslator của A; C bàn giao mã SIGNAL và tình huống nghiệp vụ cần ánh xạ`.

Điều kiện bàn giao: C04 bàn giao nền gọi procedure và bảo vệ revision; từng hàm CALL được hoàn thiện ở task luồng tương ứng. Không bọc CALL tự commit trong transaction Spring; test lỗi/rollback/race tại task sử dụng.

### COMMON-12 — Bằng chứng và timeline lịch xem

Phạm vi: Chat và tạo hợp đồng. Provider: **B / BE-B08**. Consumer: `BE-A11`, `BE-C05`.

- `model/ViewingEvidence.java`
- `repository/ViewingReadRepository.java`
- `service/ViewingReadPort.java`

Hàm đề xuất: `ViewingReadPort.getTimeline(actor,context,tx)`; `ViewingReadPort.getRentalEvidence(actor,context,tx)`.

Điều kiện bàn giao: Hoàn tất provider trong B08 trước C05; dữ liệu gốc của lịch, đúng tenant/landlord và trạng thái hiện tại, không sao chép trạng thái từ chat.

## Thứ tự ví dụ khi bắt đầu service

| Task | Service | Đầu vào | Luồng |
| --- | --- | --- | --- |
| BE-A03 | `AuthService.login(...)` | COMMON-01, COMMON-02, COMMON-03 | Validate → tìm User → kiểm tra password/trạng thái → tạo Session → trả DTO. |
| BE-A05 | `FileService.completeUpload(...)` | COMMON-01, COMMON-02, COMMON-04, COMMON-05 | Kiểm tra actor/purpose → xác minh object/MIME/hash → cập nhật metadata → ghi audit/event → trả DTO. |
| BE-B02 | `HouseService.createHouse(...)` | COMMON-01, COMMON-02, COMMON-04, COMMON-07 | Validate/quyền chủ trọ → ghi nhà/phòng theo transaction đã chốt → audit/event → trả DTO. |
| BE-C05 | `ContractService.submit(...)` | COMMON-02, COMMON-04, COMMON-09, COMMON-10, COMMON-11, COMMON-12 | Kiểm tra actor/bằng chứng xem → đọc snapshot → CALL tạo hợp đồng và kiểm tra lại dưới khóa → đọc kết quả; không bọc procedure tự commit trong transaction Spring. |
| BE-A10 | `InvoiceService.createDraft(...)` | COMMON-01, COMMON-02, COMMON-04, COMMON-08, COMMON-10 | Đọc cư trú/người trả → lấy báo giá → tính tiền → lưu invoice/items và snapshot trong cùng transaction. |

Provider và service cùng task: hoàn tất model/query trước service trong task đó. Danh sách này là ví dụ các luồng, không thay toàn bộ thứ tự 52 task.

## Điều kiện bắt đầu service

- Chữ ký hàm, đầu vào/đầu ra, field nullable và người sở hữu đã được chốt cho luồng đang viết.
- Model/RowMapper/query mà luồng dùng có test phù hợp; repository không chỉ là interface hoặc mock.
- Quyền theo actor/tài nguyên, trạng thái và thời điểm cần kiểm tra lại dưới khóa đã rõ.
- Đã chọn một chủ transaction: service Spring hoặc procedure tự quản lý; audit/event/token tham gia đúng ranh giới.
- Có ca thành công và các ca sai quyền, không tìm thấy, dữ liệu cũ, rollback/retry cần cho luồng.

## Giới hạn của cách chia

- Không cần BaseRepository<T>/BaseService<T> hoặc CRUD cho mọi bảng trước. Spring JDBC đã xử lý kết nối/statement/exception; chỉ trích helper khi có nhu cầu thực tế.
- Model trong cùng thư mục không đồng nghĩa cả nhóm được ghi mọi bảng. Owner giữ quy tắc ghi; các consumer dùng projection/cổng đọc đã bàn giao.
- Không giao A viết toàn bộ model, B toàn bộ repository, C toàn bộ service. Mỗi owner hoàn thiện phần dữ liệu và luồng của chức năng mình; A giữ hạ tầng chung.
- Các tên file/hàm ở đây là đề xuất cần chốt tại task, chưa phải API Java đã tồn tại. Các mục này không tạo thêm task, đổi STT hay tự đánh dấu tiến độ.

## Tài liệu đối chiếu

- [Spring JDBC: RowMapper có thể tái sử dụng](https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/org/springframework/jdbc/core/RowMapper.html)
- [Spring: transaction tại service và cơ chế proxy](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/annotations.html)
- [Martin Fowler: chi phí xây dựng trước nhu cầu (Yagni)](https://martinfowler.com/bliki/Yagni.html)
