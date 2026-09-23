import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('class_enrollments')
export class ClassEnrollment {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('int', { name: 'class_schedule_id' })
  classScheduleId: number;

  @Column('int', { name: 'user_id' })
  userId: number;

  @Column('enum', {
    name: 'status',
    enum: ['PENDING_PAYMENT', 'PAID', 'CANCELLED'],
    default: 'PENDING_PAYMENT',
  })
  status: 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED';

  @Column('decimal', { name: 'amount', precision: 10, scale: 2 })
  amount: number;

  @Column('varchar', { name: 'vnp_txn_ref', nullable: true, length: 100 })
  vnpTxnRef: string | null;

  @Column('datetime', { name: 'paid_at', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
