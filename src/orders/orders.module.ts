import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItem } from './entities/order-item.entity';
import { MenuItem } from 'src/menu-items/entities/menu_item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order,OrderItem,MenuItem])],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
