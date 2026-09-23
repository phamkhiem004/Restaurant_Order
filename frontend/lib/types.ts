export type Role = 'CUSTOMER' | 'STAFF' | 'ADMIN';

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface User extends SessionUser {
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  price: number | string;
  sale_price?: number | string | null;
  is_flash_sale?: boolean;
  category: string | null;
  isActive?: boolean | null;
  imageUrl?: string | null;
}

export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
export type TableDisplayStatus = TableStatus | 'RESERVED';

export interface DiningTable {
  id: number;
  tableNumber: string;
  capacity: number;
  status: TableStatus | null;
}

export interface TableMapEntry {
  id: number;
  tableNumber: string;
  capacity: number;
  dbStatus: TableStatus | null;
  displayStatus: TableDisplayStatus;
  nextReservationTime: string | null;
}

export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED';

export interface Reservation {
  id: number;
  userId: number;
  tableId: number | null;
  reservationTime: string;
  endTime: string;
  notes: string | null;
  guestCount: number;
  status: ReservationStatus | null;
  createdAt: string;
}

export type OrderStatus = 'NEW' | 'PREPARING' | 'SERVED' | 'BILLED' | 'PAID';
export type OrderItemStatus = 'PENDING' | 'COOKING' | 'DONE' | 'CANCELLED';

export interface Order {
  id: number;
  reservationId: number | null;
  tableId: number;
  status: OrderStatus | null;
  totalAmount: number | string | null;
  note: string | null;
  createdAt: string;
}

export interface OrderItem {
  id: number;
  orderId: number;
  menuItemId: number;
  quantity: number;
  priceAtTime: number | string;
  status: OrderItemStatus | null;
}

export type ClassScheduleStatus = 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
export type ClassEnrollmentStatus = 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED';

export interface ClassSchedule {
  id: number;
  title: string;
  description: string | null;
  scheduledAt: string;
  durationMinutes: number;
  price: number | string;
  capacity: number | null;
  status: ClassScheduleStatus;
  meetingId: string | null;
  createdBy: number;
}

export interface ClassEnrollment {
  id: number;
  classScheduleId: number;
  userId: number;
  status: ClassEnrollmentStatus;
  amount: number | string;
  vnpTxnRef: string | null;
  paidAt: string | null;
}
