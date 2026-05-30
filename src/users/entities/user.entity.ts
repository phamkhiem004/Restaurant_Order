import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Index('phone', ['phone'], { unique: true })
@Index('email', ['email'], { unique: true })
@Entity('users', { schema: 'restaurant_db' })
export class User {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('varchar', { name: 'name', length: 100 })
  name: string;

  @Column('varchar', { name: 'phone', unique: true, length: 20 })
  phone: string;

  @Column('varchar', {
    name: 'email',
    unique: true,
    length: 100,
  })
  email: string;

  @Column('varchar', { name: 'password', length: 255 })
  password: string;

  @Column('enum', {
    name: 'role',
    enum: ['CUSTOMER', 'STAFF', 'ADMIN'],
    default: 'CUSTOMER',
  })
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
