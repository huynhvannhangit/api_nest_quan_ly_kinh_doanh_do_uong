# API Quản Lý Kinh Doanh Đồ Uống

Một hệ thống backend toàn diện dựa trên NestJS để quản lý kinh doanh đồ uống, bao gồm các tính năng cho sản phẩm, đơn hàng, nhân viên, bàn và thống kê.

---

## 📑 Mục Lục

- [Giới Thiệu](#giới-thiệu)
- [Báo Cáo Dự Án](#báo-cáo-dự-án)
- [Tính Năng](#tính-năng)
- [Công Nghệ Sử Dụng](#công-ngệ-sử-dụng)
- [Yêu Cầu Hệ Thống](#yêu-cầu-hệ-thống)
- [Cài Đặt](#cài-đặt)
- [Chạy Ứng Dụng](#chạy-ứng-dụng)
- [Di Cư Dữ Liệu & Khởi Tạo](#di-cư-dữ-liệu--khởi-tạo)
- [Tài Liệu API](#tài-liệu-api)

---

## 📄 Báo Cáo Dự Án
Chi tiết về yêu cầu hệ thống, thiết kế cơ sở dữ liệu và quy trình nghiệp vụ của toàn bộ đồ án có thể được tìm thấy tại:
👉 **[Xem Báo Cáo Đồ Án Chuyên Ngành 2](https://drive.google.com/file/d/1k0uGiPZl95nbOvWFmxplT5eA__Nfxd7W/view?usp=drive_link)**

---

## 🌟 Giới Thiệu

**API Quản lý Kinh doanh Đồ uống** là một giải pháp backend mạnh mẽ và có khả năng mở rộng, được thiết kế riêng cho các cửa hàng đồ uống, quán cà phê và nhà hàng hiện đại. Được xây dựng với **NestJS**, nó cung cấp một nền tảng vững chắc để quản lý các hoạt động hàng ngày, từ kho hàng và xử lý đơn hàng đến hiệu suất của nhân viên và báo cáo tài chính.

Điểm đặc biệt của dự án này là tích hợp **thông tin dựa trên AI** (Gemini/OpenAI) và **thống kê thời gian thực**, giúp chủ doanh nghiệp đưa ra các quyết định dựa trên dữ liệu. Cho dù đó là theo dõi các loại đồ uống bán chạy nhất, quản lý lịch trình nhân viên hay tự động hóa quy trình phê duyệt cho các hành động nhạy cảm, API này đều xử lý tất cả với tiêu chí bảo mật và hiệu quả làm đầu.

---

## 🚀 Tính Năng

Ứng dụng được mô-đun hóa thành các lĩnh vực kinh doanh chính:

- **🤖 Trợ lý AI**: Chatbot thông minh tích hợp sẵn, hỗ trợ bởi OpenAI/Gemini để cung cấp câu trả lời nhanh chóng về hiệu quả kinh doanh (doanh thu, đơn hàng, v.v.).
- **📊 Thống kê thời gian thực**: Các API sẵn sàng cho bảng điều khiển (dashboard) để theo dõi tổng doanh thu, tỷ lệ hoàn thành đơn hàng và các sản phẩm bán chạy nhất.
- **🔐 Bảo mật nâng cao**: Hệ thống xác thực và phân quyền an toàn với JWT và Kiểm soát truy cập dựa trên vai trò (RBAC) chi tiết.
- **🛒 Quản lý Đơn hàng & Hóa đơn**: Luồng công việc liền mạch từ gọi món tại bàn đến tạo hóa đơn và xử lý thanh toán.
- **👥 Hệ thống Nhân viên & Người dùng**: Quản lý toàn diện hồ sơ nhân viên, vai trò và quyền hạn.
- **📦 Sản phẩm & Kho hàng**: Quản lý danh mục, sản phẩm, giá cả và hình ảnh một cách dễ dàng.
- **✅ Quy trình Phê duyệt**: Quy trình phê duyệt có cấu trúc cho các hành động quan trọng (ví dụ: hoàn tiền, hủy đơn) để đảm bảo tính minh bạch và trách nhiệm.
- **📍 Quản lý Khu vực & Bàn**: Sơ đồ hóa kỹ thuật số bố cục cửa hàng vật lý để phục vụ tại bàn hiệu quả.

---

## 🛠 Công Nghệ Sử Dụng

- **Khung chương trình (Framework)**: [NestJS](https://nestjs.com/)
- **Ngôn ngữ**: [TypeScript](https://www.typescriptlang.org/)
- **Cơ sở dữ liệu**: [MySQL](https://www.mysql.com/)
- **ORM**: [TypeORM](https://typeorm.io/)
- **Tài liệu**: [Swagger](https://swagger.io/)
- **Công cụ hỗ trợ**:
  - **Xác thực dữ liệu**: class-validator, class-transformer
  - **Xác thực người dùng**: Passport, JWT
  - **Email**: Nodemailer
  - **Excel**: ExcelJS
  - **AI**: Google Gemini (@google/generative-ai), OpenAI SDK

---

## 🚦 Yêu Cầu Hệ Thống

- Node.js (phiên bản 18 trở lên)
- Yarn hoặc NPM
- Cơ sở dữ liệu MySQL

---

## ⚙️ Cài Đặt

1.  **Sao chép mã nguồn**

    ```bash
    git clone <repository-url>
    cd api_nest_quan_ly_kinh_doanh_do_uong
    ```

2.  **Cài đặt các thư viện phụ thuộc**

    ```bash
    yarn install
    ```

3.  **Cấu hình môi trường**

    Tạo tệp `.env` trong thư mục gốc và cấu hình các biến môi trường (Kết nối cơ sở dữ liệu, mã bí mật JWT, v.v.).

---

## 🚀 Chạy Ứng Dụng

```bash
# Chế độ phát triển
yarn run start

# Chế độ phát triển (tự động cập nhật - watch mode)
yarn run start:dev

# Chế độ thực tế (production)
yarn run start:prod
```

---

## 🗄 Di Cư Dữ Liệu & Khởi Tạo

**Chạy Migration (Cập nhật cấu trúc DB):**

```bash
yarn migration:run
```

**Khởi tạo dữ liệu mẫu (Tài khoản Admin, dữ liệu ban đầu):**

```bash
yarn seed
```

---

## 📖 Tài Liệu API

Khi ứng dụng đang chạy, bạn có thể truy cập tài liệu hướng dẫn API (Swagger) tại:

```
http://localhost:3000/api
```

*(Lưu ý: Thay thế `3000` bằng cổng (PORT) bạn đã cấu hình trong file .env)*

---

## 📁 Cấu Trúc Thư Mục

```
src/
├── common/         # Cấu hình chung, decorators, filters
├── core/           # Module cốt lõi, bảo mật (guards), interceptors
├── database/       # Migrations, seeds, cấu hình dữ liệu
├── modules/        # Các module tính năng (Xác thực, Sản phẩm, Đơn hàng, v.v.)
└── main.ts         # Điểm khởi chạy của ứng dụng
```
