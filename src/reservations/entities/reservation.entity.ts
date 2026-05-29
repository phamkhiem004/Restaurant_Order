import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('user_id', ['userId'], {})
@Index('table_id', ['tableId'], {})
@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('int', { name: 'user_id' })
  userId: number;

  @Column('int', { name: 'table_id', nullable: true })
  tableId: number | null;

  @Column('datetime', { name: 'reservation_time' })
  reservationTime: Date;

  @Column('int', { name: 'guest_count' })
  guestCount: number;

  @Column('enum', {
    name: 'status',
    nullable: true,
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
    default: () => "'PENDING'",
  })
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | null;

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
}
