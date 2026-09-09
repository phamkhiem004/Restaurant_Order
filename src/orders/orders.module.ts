import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { D1RepositoryModule } from '../database/d1.module';
import { OrderItem } from './entities/order-item.entity';
import { MenuItem } from '../menu-items/entities/menu_item.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { DiningTable } from '../dining-tables/entities/dining-table.entity';

@Module({
  imports: [
    D1RepositoryModule.forFeature([
      Order,
      OrderItem,
      MenuItem,
      DiningTable,
      Reservation,
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
