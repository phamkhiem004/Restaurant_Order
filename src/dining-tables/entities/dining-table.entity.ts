import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

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
    default: () => "'AVAILABLE'",
  })
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | null;

  @Column({
    type: 'timestamp',
    name: 'created_at',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date | null;

  @Column({
    type: 'timestamp',
    name: 'updated_at',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date | null;
}
