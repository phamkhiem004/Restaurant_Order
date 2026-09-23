import type {
  DiningTable,
  MenuItem,
  Order,
  OrderItem,
  OrderItemStatus,
  Reservation,
  ReservationStatus,
  SessionUser,
  TableMapEntry,
  User,
} from './types';

export class ApiError extends Error {}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const contentType = response.headers.get('content-type') ?? '';
  const body: unknown = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : {};
  if (!response.ok) {
    const record = body as { message?: string | string[] };
    const message = Array.isArray(record.message)
      ? record.message.join(', ')
      : record.message;
    throw new ApiError(message || `Yêu cầu thất bại (${response.status})`);
  }
  return body as T;
}

function get<T>(path: string) {
  return api<T>(path);
}
function post<T>(path: string, data?: unknown) {
  return api<T>(path, {
    method: 'POST',
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
}
function patch<T>(path: string, data?: unknown) {
  return api<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(data ?? {}),
  });
}

export interface RegisterPayload {
  name: string;
  phone: string;
  email: string;
  password: string;
}

export const authApi = {
  me: () => get<{ user: SessionUser }>('/auth/me'),
  login: (data: { email: string; password: string }) =>
    post<{ user: SessionUser }>('/auth/login', data),
  register: (data: RegisterPayload) => post<User>('/auth/register', data),
  logout: () => post<{ success: boolean }>('/auth/logout'),
};

export interface MenuItemPayload {
  name: string;
  description?: string;
  price: number;
  category?: string;
  sale_price?: number;
  is_flash_sale?: boolean;
}

export const menuItemsApi = {
  list: () => get<MenuItem[]>('/menu-items'),
  create: (data: Pick<MenuItemPayload, 'name' | 'description' | 'price' | 'category'>) =>
    post<MenuItem>('/menu-items', data),
  update: (id: number, data: MenuItemPayload) =>
    patch(`/menu-items/${id}`, data),
};

export const diningTablesApi = {
  list: () => get<DiningTable[]>('/dining-tables'),
  available: () => get<DiningTable[]>('/dining-tables/available'),
  map: () => get<TableMapEntry[]>('/dining-tables/map'),
  create: (data: { tableNumber: string; capacity: number }) =>
    post<DiningTable>('/dining-tables', data),
};

export interface CreateReservationPayload {
  userId: number;
  tableId: number;
  reservationTime: string;
  guestCount: number;
  notes?: string;
}

export const reservationsApi = {
  list: () => get<Reservation[]>('/reservations'),
  create: (data: CreateReservationPayload) =>
    post<Reservation>('/reservations/create', data),
  updateStatus: (id: number, status: ReservationStatus) =>
    patch(`/reservations/${id}/status`, { status }),
};

export interface CreateOrderPayload {
  tableId: number;
  note?: string;
  reservationId?: number;
  items: { menuItemId: number; quantity: number }[];
}

export const ordersApi = {
  listOrders: () => get<Order[]>('/orders/order'),
  listOrderItems: () => get<OrderItem[]>('/orders/order-item'),
  create: (data: CreateOrderPayload) =>
    post<{ message: string; order: Order; items: OrderItem[] }>(
      '/orders',
      data,
    ),
  addItems: (
    orderId: number,
    data: { items: { menuItemId: number; quantity: number }[] },
  ) => post(`/orders/${orderId}/add-items`, data),
  updateItemStatus: (itemId: number, status: OrderItemStatus) =>
    patch(`/orders/items/${itemId}/status`, { status }),
  updateItemQuantity: (orderId: number, itemId: number, quantity: number) =>
    patch(`/orders/${orderId}/items/${itemId}/quantity`, { quantity }),
  cancelItem: (orderId: number, itemId: number) =>
    patch(`/orders/${orderId}/items/${itemId}/cancel`),
};

export interface UpdateUserPayload {
  name?: string;
  phone?: string;
  email?: string;
  password?: string;
}

export const usersApi = {
  list: () => get<User[]>('/users'),
  create: (data: RegisterPayload) => post<User>('/users/create', data),
  update: (id: number, data: UpdateUserPayload) =>
    patch(`/users/${id}`, data),
};

export const vnpayApi = {
  createPaymentUrl: (orderId: number) =>
    get<{ message: string; url: string }>(
      `/vnpay/create-payment-url?orderId=${orderId}`,
    ),
};

export interface QuickStartPayload {
  title?: string;
  name: string;
  role: 'host';
  persistChat?: boolean;
}

export const realtimekitApi = {
  quickStart: (data: QuickStartPayload) =>
    post<{ meeting: { id: string; title?: string }; joinUrl: string }>(
      '/realtimekit/quick-start',
      data,
    ),
  addParticipant: (meetingId: string, data: { name: string; role: 'host' | 'guest' }) =>
    post<{ token: string }>(
      `/realtimekit/meetings/${encodeURIComponent(meetingId)}/participants`,
      data,
    ),
};
