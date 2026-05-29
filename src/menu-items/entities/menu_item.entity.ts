import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('menu_items')
export class MenuItem {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('varchar', { name: 'name', length: 100 })
  name: string;

  @Column('text', { name: 'description', nullable: true })
  description: string | null;

  @Column('decimal', { name: 'price', precision: 10, scale: 2 })
  price: string;

  @Column('varchar', { name: 'category', nullable: true, length: 50 })
  category: string | null;

  @Column({
    type: 'boolean',
    name: 'is_active',
    nullable: true,
    default: true,
  })
  isActive: boolean | null;

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
