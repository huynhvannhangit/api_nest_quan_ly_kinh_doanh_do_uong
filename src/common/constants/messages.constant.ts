/**
 * Message Constants
 * Format: "Tiếng Việt | ENGLISH_CODE"
 */

export const MESSAGES = {
  // Common
  SUCCESS: 'Thành công | SUCCESS',
  CREATED: 'Tạo thành công | CREATED',
  UPDATED: 'Cập nhật thành công | UPDATED',
  DELETED: 'Xoá thành công | DELETED',
  NOT_FOUND: 'Không tìm thấy | NOT_FOUND',

  // Auth
  LOGIN_SUCCESS: 'Đăng nhập thành công | LOGIN_SUCCESS',
  LOGOUT_SUCCESS: 'Đăng xuất thành công | LOGOUT_SUCCESS',
  REGISTER_SUCCESS: 'Đăng ký thành công | REGISTER_SUCCESS',
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng | INVALID_CREDENTIALS',
  NOT_AUTHENTICATED: 'Bạn chưa đăng nhập | NOT_AUTHENTICATED',
  NOT_AUTHORIZED: 'Bạn không có quyền thực thi | NOT_AUTHORIZED',
  TOKEN_EXPIRED: 'Phiên đăng nhập đã hết hạn | TOKEN_EXPIRED',
  INVALID_TOKEN: 'Token không hợp lệ | INVALID_TOKEN',

  // User
  USER_NOT_FOUND: 'Không tìm thấy người dùng | USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS: 'Email đã tồn tại | EMAIL_ALREADY_EXISTS',
  USER_LOCKED: 'Tài khoản đã bị khoá | USER_LOCKED',
  PASSWORD_CHANGED: 'Đổi mật khẩu thành công | PASSWORD_CHANGED',
  INVALID_OLD_PASSWORD: 'Mật khẩu cũ không đúng | INVALID_OLD_PASSWORD',

  // Employee
  EMPLOYEE_NOT_FOUND: 'Không tìm thấy nhân viên | EMPLOYEE_NOT_FOUND',
  EMPLOYEE_CODE_EXISTS: 'Mã nhân viên đã tồn tại | EMPLOYEE_CODE_EXISTS',

  // Area
  AREA_NOT_FOUND: 'Không tìm thấy khu vực | AREA_NOT_FOUND',

  // Table
  TABLE_NOT_FOUND: 'Không tìm thấy bàn | TABLE_NOT_FOUND',
  TABLE_OCCUPIED: 'Bàn đang được sử dụng | TABLE_OCCUPIED',
  TABLE_NUMBER_EXISTS: 'Số bàn đã tồn tại | TABLE_NUMBER_EXISTS',

  // Category
  CATEGORY_NOT_FOUND: 'Không tìm thấy danh mục | CATEGORY_NOT_FOUND',

  // Product
  PRODUCT_NOT_FOUND: 'Không tìm thấy sản phẩm | PRODUCT_NOT_FOUND',
  PRODUCT_UNAVAILABLE: 'Sản phẩm không khả dụng | PRODUCT_UNAVAILABLE',

  // Invoice
  INVOICE_NOT_FOUND: 'Không tìm thấy hoá đơn | INVOICE_NOT_FOUND',
  INVOICE_ALREADY_PAID: 'Hoá đơn đã được thanh toán | INVOICE_ALREADY_PAID',
  INVOICE_CANCELLED: 'Hoá đơn đã bị huỷ | INVOICE_CANCELLED',
  PAYMENT_SUCCESS: 'Thanh toán thành công | PAYMENT_SUCCESS',

  // Approval
  APPROVAL_NOT_FOUND: 'Không tìm thấy yêu cầu phê duyệt | APPROVAL_NOT_FOUND',
  APPROVAL_ALREADY_REVIEWED:
    'Yêu cầu đã được xử lý | APPROVAL_ALREADY_REVIEWED',
  APPROVED: 'Đã phê duyệt | APPROVED',
  REJECTED: 'Đã từ chối | REJECTED',

  // Validation
  INVALID_EMAIL: 'Email không hợp lệ | INVALID_EMAIL',
  INVALID_PHONE: 'Số điện thoại không hợp lệ | INVALID_PHONE',
  REQUIRED_FIELD: 'Trường này là bắt buộc | REQUIRED_FIELD',

  // Server Error
  INTERNAL_ERROR: 'Lỗi hệ thống | INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'Lỗi cơ sở dữ liệu | DATABASE_ERROR',
};
