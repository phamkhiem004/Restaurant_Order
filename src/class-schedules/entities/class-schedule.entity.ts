import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('class_schedules')
export class ClassSchedule {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('varchar', { name: 'title', length: 200 })
  title: string;

  @Column('text', { name: 'description', nullable: true })
  description: string | null;

  @Column('datetime', { name: 'scheduled_at' })
  scheduledAt: Date;

  @Column('int', { name: 'duration_minutes', default: 60 })
  durationMinutes: number;

  @Column('decimal', { name: 'price', precision: 10, scale: 2, default: 30000 })
  price: number;

  @Column('int', { name: 'capacity', nullable: true })
  capacity: number | null;

  @Column('enum', {
    name: 'status',
    enum: ['SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED'],
    default: 'SCHEDULED',
  })
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';

  @Column('varchar', { name: 'meeting_id', nullable: true, length: 100 })
  meetingId: string | null;

  @Column('int', { name: 'created_by' })
  createdBy: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
