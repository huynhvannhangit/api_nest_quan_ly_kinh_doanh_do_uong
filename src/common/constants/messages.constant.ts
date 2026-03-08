/**
 * Message Constants
 * Chỉ chứa câu thông báo Tiếng Việt
 */

export const MESSAGES = {
  // Common
  SUCCESS: 'Thành công',
  CREATED: 'Tạo thành công',
  UPDATED: 'Cập nhật thành công',
  DELETED: 'Xoá thành công',
  NOT_FOUND: 'Không tìm thấy',

  // Auth
  LOGIN_SUCCESS: 'Đăng nhập thành công',
  LOGOUT_SUCCESS: 'Đăng xuất thành công',
  REGISTER_SUCCESS: 'Đăng ký thành công',
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng',
  NOT_AUTHENTICATED: 'Bạn chưa đăng nhập',
  NOT_AUTHORIZED: 'Bạn không có quyền thực thi',
  TOKEN_EXPIRED: 'Phiên đăng nhập đã hết hạn',
  INVALID_TOKEN: 'Token không hợp lệ',
  DEVICE_ID_REQUIRED: 'Yêu cầu Device ID',
  ACCESS_DENIED: 'Từ chối truy cập',
  ACCESS_DENIED_LOCKED: 'Từ chối truy cập hoặc bị khóa',
  INVALID_VERIFICATION_TOKEN: 'Token xác thực không hợp lệ',
  INVALID_RESET_TOKEN: 'Token đặt lại mật khẩu không hợp lệ',
  TOKEN_MALFORMED: 'Token không đúng định dạng',

  // User
  USER_NOT_FOUND: 'Không tìm thấy người dùng',
  EMAIL_ALREADY_EXISTS: 'Email đã tồn tại',
  USER_LOCKED: 'Tài khoản đã bị khoá',
  PASSWORD_CHANGED: 'Đổi mật khẩu thành công',
  INVALID_OLD_PASSWORD: 'Mật khẩu cũ không đúng',

  // Employee
  EMPLOYEE_NOT_FOUND: 'Không tìm thấy nhân viên',
  EMPLOYEE_CODE_EXISTS: 'Mã nhân viên đã tồn tại',
  EMPLOYEE_AGE_INVALID: 'Nhân viên phải từ đủ 18 tuổi',

  // Area
  AREA_NOT_FOUND: 'Không tìm thấy khu vực',
  AREA_NAME_EXISTS: 'Khu vực với tên này đã tồn tại',
  AREA_HAS_ACTIVE_TABLES: 'Không thể xóa khu vực đang có bàn hoạt động',

  // Table
  TABLE_NOT_FOUND: 'Không tìm thấy bàn',
  TABLE_OCCUPIED: 'Bàn đang được sử dụng',
  TABLE_NUMBER_EXISTS: 'Tên bàn đã tồn tại',
  TABLE_HAS_ACTIVE_ORDERS: 'Không thể xóa bàn đang có đơn hàng chưa hoàn tất',

  // Category
  CATEGORY_NOT_FOUND: 'Không tìm thấy danh mục',
  CATEGORY_HAS_PRODUCTS: 'Không thể xóa danh mục đang có sản phẩm',

  // Role
  ROLE_NOT_FOUND: 'Không tìm thấy chức vụ',

  // Product
  PRODUCT_NOT_FOUND: 'Không tìm thấy sản phẩm',
  PRODUCT_UNAVAILABLE: 'Sản phẩm không khả dụng',
  PRODUCT_HAS_ACTIVE_ORDERS:
    'Không thể xóa sản phẩm đang có trong đơn hàng chưa hoàn tất',

  // File
  FILE_REQUIRED: 'Vui lòng chọn file ảnh',

  // Statistics
  EXCEL_EXPORT_ERROR: 'Không thể xuất file Excel',

  // Payment
  INVOICE_NOT_FOUND: 'Không tìm thấy hoá đơn',
  INVOICE_ALREADY_PAID: 'Hoá đơn đã được thanh toán',
  INVOICE_CANCELLED: 'Hoá đơn đã bị huỷ',
  PAYMENT_SUCCESS: 'Thanh toán thành công',
  VNPAY_CONFIG_MISSING: 'Thiếu cấu hình VNPAY',
  MOMO_API_ERROR: 'MoMo API không trả về URL thanh toán',

  // Approval
  APPROVAL_NOT_FOUND: 'Không tìm thấy yêu cầu phê duyệt',
  APPROVAL_ALREADY_REVIEWED: 'Yêu cầu đã được xử lý',
  APPROVED: 'Đã phê duyệt',
  REJECTED: 'Đã từ chối',

  // Validation
  INVALID_EMAIL: 'Email không hợp lệ',
  INVALID_PHONE: 'Số điện thoại không hợp lệ',
  REQUIRED_FIELD: 'Trường này là bắt buộc',

  // Server Error
  INTERNAL_ERROR: 'Lỗi hệ thống',
  DATABASE_ERROR: 'Lỗi cơ sở dữ liệu',
};
