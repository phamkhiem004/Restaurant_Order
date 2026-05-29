import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Index('order_id', ['orderId'], {})
@Index('menu_item_id', ['menuItemId'], {})
@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('int', { name: 'order_id' })
  orderId: number;

  @Column('int', { name: 'menu_item_id' })
  menuItemId: number;

  @Column('int', { name: 'quantity', default: () => "'1'" })
  quantity: number;

  @Column('decimal', { name: 'price_at_time', precision: 10, scale: 2 })
  priceAtTime: string;

  @Column('enum', {
    name: 'status',
    nullable: true,
    enum: ['PENDING', 'COOKING', 'DONE'],
    default: () => "'PENDING'",
  })
  status: 'PENDING' | 'COOKING' | 'DONE' | null;

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

  @ManyToOne(() => Order, (order) => order.orderItems, {
    onDelete: 'CASCADE',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'order_id', referencedColumnName: 'id' }])
  order: Order;
}
