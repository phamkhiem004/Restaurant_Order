import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from './ai/ai.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { ClassSchedulesModule } from './class-schedules/class-schedules.module';
import { D1DatabaseModule } from './database/d1.module';
import { DiningTablesModule } from './dining-tables/dining-tables.module';
import { MenuItemsModule } from './menu-items/menu-items.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { RealtimeKitModule } from './realtimekit/realtimekit.module';
import { ReservationsModule } from './reservations/reservations.module';
import { UsersModule } from './users/users.module';
import { VnpayModule } from './vnpay/vnpay.module';

@Module({})
export class AppModule {
  static forD1(database: D1Database, ai: Ai): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        D1DatabaseModule.forRoot(database),
        AiModule.forRoot(ai),
        AuthModule,
        UsersModule,
        MenuItemsModule,
        DiningTablesModule,
        ReservationsModule,
        OrdersModule,
        PaymentsModule,
        RealtimeKitModule,
        VnpayModule,
        ClassSchedulesModule,
        ChatModule,
      ],
      controllers: [AppController],
      providers: [AppService],
    };
  }
}
