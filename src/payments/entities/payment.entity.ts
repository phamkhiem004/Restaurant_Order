import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Index('order_id', ['orderId'], {})
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('int', { name: 'order_id' })
  orderId: number;

  @Column('enum', {
    name: 'payment_method',
    enum: ['CASH', 'CREDIT_CARD', 'TRANSFER'],
  })
  paymentMethod: 'CASH' | 'CREDIT_CARD' | 'TRANSFER';

  @Column('decimal', { name: 'amount', precision: 10, scale: 2 })
  amount: string;

  @Column('enum', {
    name: 'status',
    nullable: true,
    enum: ['PENDING', 'SUCCESS', 'FAILED'],
    default: 'PENDING',
  })
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | null;

  @Column('varchar', { name: 'transaction_id', nullable: true, length: 100 })
  transactionId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
