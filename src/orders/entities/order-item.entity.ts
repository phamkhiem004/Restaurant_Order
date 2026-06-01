import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
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
  priceAtTime: number;

  @Column('enum', {
    name: 'status',
    nullable: true,
    enum: ['PENDING', 'COOKING', 'DONE', 'CANCELLED'],
    default: 'PENDING',
  })
  status: 'PENDING' | 'COOKING' | 'DONE' | 'CANCELLED' | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Order, (order) => order.orderItems, {
    onDelete: 'CASCADE',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'order_id', referencedColumnName: 'id' }])
  order: Order;
}
