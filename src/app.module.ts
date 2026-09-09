import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { D1DatabaseModule } from './database/d1.module';
import { DiningTablesModule } from './dining-tables/dining-tables.module';
import { MenuItemsModule } from './menu-items/menu-items.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ReservationsModule } from './reservations/reservations.module';
import { UsersModule } from './users/users.module';
import { VnpayModule } from './vnpay/vnpay.module';

@Module({})
export class AppModule {
  static forD1(database: D1Database): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        D1DatabaseModule.forRoot(database),
        UsersModule,
        MenuItemsModule,
        DiningTablesModule,
        ReservationsModule,
        OrdersModule,
        PaymentsModule,
        VnpayModule,
      ],
      controllers: [AppController],
      providers: [AppService],
    };
  }
}
