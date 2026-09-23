export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export const roleLabel: Record<string, string> = {
  CUSTOMER: 'Khách hàng',
  STAFF: 'Nhân viên',
  ADMIN: 'Quản trị viên',
};

export const reservationStatusLabel: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  CANCELLED: 'Đã hủy',
  COMPLETED: 'Hoàn tất',
};

export const reservationStatusTone: Record<string, Tone> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  CANCELLED: 'danger',
  COMPLETED: 'success',
};

export const orderStatusLabel: Record<string, string> = {
  NEW: 'Mới mở bàn',
  PREPARING: 'Đang chuẩn bị',
  SERVED: 'Đã phục vụ',
  BILLED: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
};

export const orderStatusTone: Record<string, Tone> = {
  NEW: 'neutral',
  PREPARING: 'info',
  SERVED: 'success',
  BILLED: 'warning',
  PAID: 'success',
};

export const orderItemStatusLabel: Record<string, string> = {
  PENDING: 'Chờ chế biến',
  COOKING: 'Đang chế biến',
  DONE: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

export const orderItemStatusTone: Record<string, Tone> = {
  PENDING: 'neutral',
  COOKING: 'info',
  DONE: 'success',
  CANCELLED: 'danger',
};

export const tableStatusLabel: Record<string, string> = {
  AVAILABLE: 'Trống',
  OCCUPIED: 'Đang phục vụ',
  MAINTENANCE: 'Bảo trì',
  RESERVED: 'Đã được đặt',
};

export const tableStatusTone: Record<string, Tone> = {
  AVAILABLE: 'success',
  OCCUPIED: 'warning',
  MAINTENANCE: 'danger',
  RESERVED: 'info',
};

export const classScheduleStatusLabel: Record<string, string> = {
  SCHEDULED: 'Đã lên lịch',
  LIVE: 'Đang diễn ra',
  COMPLETED: 'Đã kết thúc',
  CANCELLED: 'Đã hủy',
};

export const classScheduleStatusTone: Record<string, Tone> = {
  SCHEDULED: 'info',
  LIVE: 'success',
  COMPLETED: 'neutral',
  CANCELLED: 'danger',
};

export const classEnrollmentStatusLabel: Record<string, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  CANCELLED: 'Đã hủy',
};

export const classEnrollmentStatusTone: Record<string, Tone> = {
  PENDING_PAYMENT: 'warning',
  PAID: 'success',
  CANCELLED: 'danger',
};
