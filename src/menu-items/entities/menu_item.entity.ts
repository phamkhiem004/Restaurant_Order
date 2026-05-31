import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('menu_items')
export class MenuItem {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('varchar', { name: 'name', length: 100 })
  name: string;

  @Column('text', { name: 'description', nullable: true })
  description: string | null;

  @Column('decimal', { name: 'price', precision: 10, scale: 2 })
  price: number;

  // 1. CỘT MỚI: Giá sau khi giảm (Cho phép null vì không phải lúc nào cũng sale)
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  sale_price: number;

  // 2. CỘT MỚI: Cờ (Flag) bật/tắt chế độ Flash Sale
  @Column({ type: 'boolean', default: false })
  is_flash_sale: boolean;

  @Column('varchar', { name: 'category', nullable: true, length: 50 })
  category: string | null;

  @Column({
    type: 'boolean',
    name: 'is_active',
    nullable: true,
    default: true,
  })
  isActive: boolean | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
