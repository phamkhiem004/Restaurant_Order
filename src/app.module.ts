import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { MenuItemsModule } from './menu-items/menu-items.module';
import { DiningTablesModule } from './dining-tables/dining-tables.module';
import { ReservationsModule } from './reservations/reservations.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { VnpayModule } from './vnpay/vnpay.module';
import { User } from './users/entities/user.entity';
import { MenuItem } from './menu-items/entities/menu_item.entity';
import { DiningTable } from './dining-tables/entities/dining-table.entity';
import { Reservation } from './reservations/entities/reservation.entity';
import { Order } from './orders/entities/order.entity';
import { OrderItem } from './orders/entities/order-item.entity';
import { Payment } from './payments/entities/payment.entity';

@Module({
  imports: [
    // 1. Nạp file .env toàn cục
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // 2. Cấu hình kết nối MySQL thông qua TypeORM công thức động (async)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),

        // An explicit list is deterministic after Wrangler bundles the app.
        entities: [
          User,
          MenuItem,
          DiningTable,
          Reservation,
          Order,
          OrderItem,
          Payment,
        ],

        retryAttempts:
          configService.get<string>('NODE_ENV') === 'production' ? 1 : 9,

        // Đồng bộ cấu hình entity với database (Chỉ bật TRUE ở môi trường dev)
        synchronize: configService.get<string>('NODE_ENV') !== 'production',

        // Required by mysql2 in the Workers runtime. Hyperdrive owns the
        // database-side pool, so do not retain idle TCP connections here.
        extra: {
          disableEval: true,
          maxIdle: 0,
        },
      }),
    }),
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
})
export class AppModule {}
