import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderItem } from './order-item.entity';

@Index('reservation_id', ['reservationId'], {})
@Index('table_id', ['tableId'], {})
@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('int', { name: 'reservation_id', nullable: true })
  reservationId: number | null;

  @Column('int', { name: 'table_id' })
  tableId: number;

  @Column('enum', {
    name: 'status',
    nullable: true,
    enum: ['NEW', 'PREPARING', 'SERVED', 'BILLED', 'PAID'],
    default: () => "'NEW'",
  })
  status: 'NEW' | 'PREPARING' | 'SERVED' | 'BILLED' | 'PAID' | null;

  @Column('decimal', {
    name: 'total_amount',
    nullable: true,
    precision: 10,
    scale: 2,
    default: () => "'0.00'",
  })
  totalAmount: string | null;

  @Column('timestamp', {
    name: 'created_at',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date | null;

  @Column('timestamp', {
    name: 'updated_at',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date | null;

  @OneToMany(() => OrderItem, (orderItems) => orderItems.order)
  orderItems: OrderItem[];
}
