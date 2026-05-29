import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

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
    default: () => "'CUSTOMER'",
  })
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN';

  @Column('timestamp', {
    name: 'created_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column('timestamp', {
    name: 'updated_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
  reservations: any;
}
