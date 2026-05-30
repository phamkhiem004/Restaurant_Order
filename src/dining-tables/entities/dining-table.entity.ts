import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Index('table_number', ['tableNumber'], { unique: true })
@Entity('dining_tables')
export class DiningTable {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('varchar', { name: 'table_number', unique: true, length: 20 })
  tableNumber: string;

  @Column('int', { name: 'capacity' })
  capacity: number;

  @Column('enum', {
    name: 'status',
    nullable: true,
    enum: ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'],
    default: 'AVAILABLE',
  })
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
