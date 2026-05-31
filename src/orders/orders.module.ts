import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItem } from './entities/order-item.entity';
import { MenuItem } from 'src/menu-items/entities/menu_item.entity';
import { Reservation } from 'src/reservations/entities/reservation.entity';
import { DiningTable } from 'src/dining-tables/entities/dining-table.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order,OrderItem,MenuItem, DiningTable, Reservation])],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
