import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
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
    default: 'NEW',
  })
  status: 'NEW' | 'PREPARING' | 'SERVED' | 'BILLED' | 'PAID' | null;

  @Column('decimal', {
    name: 'total_amount',
    nullable: true,
    precision: 10,
    scale: 2,
    default: '0.00',
  })
  totalAmount: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => OrderItem, (orderItems) => orderItems.order)
  orderItems: OrderItem[];
}
