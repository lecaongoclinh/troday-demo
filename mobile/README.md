# Trọday Mobile

App **React Native + Expo**, dành cho **người thuê** và **chủ trọ**. Giao diện dùng thành phần native, font Be Vietnam Pro đóng gói sẵn, màu xanh trầm, nền sáng, thẻ thông tin và thanh điều hướng dưới 5 mục. Quản trị tiếp tục sử dụng bản web tại thư mục cha.

Ảnh từ bản xem trước React Native Web: [Người thuê](docs/tenant-home.png) · [Chủ trọ](docs/landlord-home.png) · [Chat](docs/landlord-chat.png).

## Chạy app

Cần Node.js 22.13+ và Expo Go tương thích Expo SDK 58.

```powershell
cd "E:\Giao diện\troday-demo\mobile"
npm.cmd ci
npm.cmd start
```

Quét QR bằng Expo Go trên điện thoại cùng mạng. Nhấn `a` để mở Android Emulator đã cài sẵn; `npm.cmd run ios` cần macOS/Xcode. Có thể dùng `npm.cmd run web` để xem trước giao diện React Native trong trình duyệt.

Nếu Expo Go báo **“The request timed out”**, điện thoại chưa truy cập được máy chủ phát triển. Khi dùng LAN, điện thoại và máy tính cần ở cùng Wi-Fi; điện thoại dùng 4G không truy cập trực tiếp được địa chỉ nội bộ của máy tính. Nếu đang cùng Wi-Fi, kiểm tra quyền **Mạng cục bộ / Local Network** của Expo Go trong Cài đặt iPhone và cho phép Node.js qua Windows Firewall trên mạng riêng.

Để dùng khác mạng hoặc tránh hạn chế của Wi-Fi, dừng lệnh đang chạy bằng `Ctrl+C`, rồi chạy:

```powershell
npm.cmd run start:tunnel
```

Lệnh này chọn rõ **Expo Go và ngrok** (`expo start --go --tunnel ngrok`); gói hỗ trợ đã có trong devDependencies. Với SDK 58, chỉ dùng `--tunnel` sẽ chọn tunnel do Expo cung cấp và báo `Couldn't create a signed tunnel URL` nếu CLI chưa đăng nhập. Nếu muốn dùng tunnel mặc định của Expo, đăng nhập bằng `npx.cmd expo login` trước.

Giữ terminal mở, chờ tunnel sẵn sàng rồi quét **QR mới**. Tunnel cần Internet trên cả hai thiết bị và có thể tải chậm hơn LAN. QR chỉ dùng được khi server và tunnel tương ứng còn chạy.

**iPhone thật:** cài Expo Go, đăng nhập cùng một tài khoản Expo ở CLI (`npx.cmd expo login`) và Expo Go trên điện thoại, sau đó dùng **Camera của iPhone** quét QR và chọn mở bằng Expo Go. Dùng `npx.cmd expo whoami` để kiểm tra tài khoản trên máy tính. Ngrok giải quyết đường kết nối; yêu cầu cùng tài khoản của Expo Go trên iOS vẫn áp dụng. Nếu đổi tài khoản, khởi động lại server rồi quét QR mới. Không gửi mật khẩu hoặc mã đăng nhập trong chat. Xem [yêu cầu đăng nhập của Expo Go trên iOS](https://docs.expo.dev/troubleshooting/expo-go-sign-in-required/).

Chạm logo **trọday** ở góc trên để đổi giữa Người thuê và Chủ trọ. Tab **Tiện ích** chứa toàn bộ màn hình của từng vai trò.

## Phạm vi

| Người thuê | Chủ trọ |
| --- | --- |
| Tìm/lọc phòng, lưu tin, xem chi tiết, báo cáo | Tổng quan, nhà/phòng, xác minh quyền cho thuê |
| Chat, chia sẻ phòng, đề nghị lịch xem | Tin đăng, chat, duyệt đề nghị và tạo lịch xem |
| Hợp đồng, gia hạn/đổi phòng/chấm dứt | Hợp đồng, xác nhận vào ở, đại diện, người ở |
| Hóa đơn, hồ sơ ở ghép, lời mời/kết nối | Dịch vụ, giá riêng của phòng, hóa đơn, CSV cư trú |
| Tài khoản, giấy tờ, thông báo | Tài khoản, thông báo |

App giữ các kiểm tra, trạng thái và điều kiện của nghiệp vụ gốc. Dữ liệu demo lưu bằng AsyncStorage, riêng với localStorage của bản web. Minh chứng PDF/ảnh được sao chép vào thư mục riêng của app trên Android/iOS; chọn tệp và chia sẻ CSV/PDF sử dụng API native. Bản xem trước web không bảo đảm giữ tệp sau khi đóng trình duyệt.

Đây vẫn là bản demo cục bộ như dự án gốc: chưa có đăng nhập thật, API/MySQL, chat đồng bộ giữa các thiết bị hay push notification. Chuyển vai trò mô phỏng hai tài khoản trên cùng thiết bị; không đồng bộ dữ liệu tự động với bản web.

## Giữ nguyên nghiệp vụ

- `scripts/sync-core.cjs` đóng gói nguyên văn `../app.js`, `../house-rights.js`, `../business-guide.js` thành `src/generated/core.cjs`, kèm SHA256 để kiểm tra nguồn.
- `src/runtime/` cung cấp cổng trạng thái, biểu mẫu, tệp và sự kiện. Cây biểu mẫu trung gian được chuyển thành `View`, `Text`, `TextInput`, `Pressable`, `Image`, `Modal` và bộ chọn ngày giờ native trong `src/ui/NativeWorkflow.tsx`.
- Trang khám phá và dashboard được thiết kế riêng tại `src/screens/Home.tsx`; chat tại `src/screens/Chats.tsx` có header gọn và ô soạn tin cố định. Giao diện không chạy trong WebView; không tải HTML từ server và không sử dụng `eval`.
- Để thay đổi nghiệp vụ, sửa nguồn tương ứng ở thư mục cha rồi chạy `npm.cmd run sync:core`. Không sửa trực tiếp tệp generated. Khi tách backend thật, thay các cổng lưu trữ/gọi xử lý tại `src/engine.ts` và giữ kiểm tra quyền phía server.

## Kiểm tra

```powershell
npm.cmd run check
npx.cmd expo install --check
npx.cmd expo export --platform all
npm.cmd run test:browser
```

`check` kiểm tra TypeScript và các luồng qua adapter native: tìm kiếm/lưu dữ liệu, tạo nhà/phòng, chọn tài liệu xác minh, chat, gia hạn, xác nhận vào ở, quyền riêng tư và xuất CSV. Bộ test nghiệp vụ gốc tiếp tục nằm ở `../tests/app.test.cjs`.

`test:browser` cần Chrome và bản web đã export trong `dist/`. Nó kiểm tra giao diện React Native Web, chuyển vai trò, biểu mẫu gia hạn, nhà/phòng, dịch vụ, chat, tải lại và bố cục 320–768 px. Ảnh kiểm tra được lưu trong `../.tmp/mobile-preview/`. Kiểm tra này không thay thế thử nghiệm trên thiết bị Android/iOS thật.

## Tạo APK thử nghiệm

`eas.json` có sẵn profile `preview` tạo APK. Sau khi cấu hình tài khoản Expo/EAS của dự án:

```powershell
npx.cmd eas-cli build --platform android --profile preview
```

Lệnh này cần tài khoản/quyền build EAS và gửi mã nguồn lên dịch vụ build. Chưa thực hiện build hoặc phát hành lên store trong lần chuyển giao này.

Tài liệu chính thức: [Expo SDK](https://docs.expo.dev/versions/latest/), [chạy trên thiết bị](https://docs.expo.dev/get-started/start-developing/), [EAS build](https://docs.expo.dev/build/introduction/).
