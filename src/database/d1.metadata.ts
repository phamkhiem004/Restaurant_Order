import { DiningTable } from '../dining-tables/entities/dining-table.entity';
import { MenuItem } from '../menu-items/entities/menu_item.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Order } from '../orders/entities/order.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { User } from '../users/entities/user.entity';

export type EntityConstructor<T = any> = new () => T;

export interface D1EntityMetadata<T = any> {
  entity: EntityConstructor<T>;
  table: string;
  columns: Record<string, string>;
  dates?: string[];
  booleans?: string[];
  relations?: Record<
    string,
    { entity: EntityConstructor; localProperty: string; targetProperty: string }
  >;
}

const timestamps = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

const metadata = new Map<EntityConstructor, D1EntityMetadata>([
  [
    User,
    {
      entity: User,
      table: 'users',
      columns: {
        id: 'id',
        name: 'name',
        phone: 'phone',
        email: 'email',
        password: 'password',
        role: 'role',
        ...timestamps,
      },
      dates: ['createdAt', 'updatedAt'],
    },
  ],
  [
    DiningTable,
    {
      entity: DiningTable,
      table: 'dining_tables',
      columns: {
        id: 'id',
        tableNumber: 'table_number',
        capacity: 'capacity',
        status: 'status',
        ...timestamps,
      },
      dates: ['createdAt', 'updatedAt'],
    },
  ],
  [
    MenuItem,
    {
      entity: MenuItem,
      table: 'menu_items',
      columns: {
        id: 'id',
        name: 'name',
        description: 'description',
        price: 'price',
        category: 'category',
        isActive: 'is_active',
        sale_price: 'sale_price',
        is_flash_sale: 'is_flash_sale',
        ...timestamps,
      },
      dates: ['createdAt', 'updatedAt'],
      booleans: ['isActive', 'is_flash_sale'],
    },
  ],
  [
    Reservation,
    {
      entity: Reservation,
      table: 'reservations',
      columns: {
        id: 'id',
        userId: 'user_id',
        tableId: 'table_id',
        reservationTime: 'reservation_time',
        endTime: 'end_time',
        guestCount: 'guest_count',
        status: 'status',
        notes: 'notes',
        ...timestamps,
      },
      dates: ['reservationTime', 'endTime', 'createdAt', 'updatedAt'],
    },
  ],
  [
    Order,
    {
      entity: Order,
      table: 'orders',
      columns: {
        id: 'id',
        reservationId: 'reservation_id',
        tableId: 'table_id',
        status: 'status',
        totalAmount: 'total_amount',
        note: 'note',
        ...timestamps,
      },
      dates: ['createdAt', 'updatedAt'],
    },
  ],
  [
    OrderItem,
    {
      entity: OrderItem,
      table: 'order_items',
      columns: {
        id: 'id',
        orderId: 'order_id',
        menuItemId: 'menu_item_id',
        quantity: 'quantity',
        priceAtTime: 'price_at_time',
        status: 'status',
        ...timestamps,
      },
      dates: ['createdAt', 'updatedAt'],
      relations: {
        order: {
          entity: Order,
          localProperty: 'orderId',
          targetProperty: 'id',
        },
      },
    },
  ],
  [
    Payment,
    {
      entity: Payment,
      table: 'payments',
      columns: {
        id: 'id',
        orderId: 'order_id',
        paymentMethod: 'payment_method',
        amount: 'amount',
        status: 'status',
        transactionId: 'transaction_id',
        vnpTxnRef: 'vnp_txn_ref',
        ...timestamps,
      },
      dates: ['createdAt', 'updatedAt'],
    },
  ],
]);

export function getD1Metadata<T>(
  entity: EntityConstructor<T>,
): D1EntityMetadata<T> {
  const result = metadata.get(entity);
  if (!result) {
    throw new Error(`D1 metadata is missing for ${entity.name}`);
  }
  return result as D1EntityMetadata<T>;
}
