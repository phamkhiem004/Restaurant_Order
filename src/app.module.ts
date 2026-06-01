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

        // Tự động load các class Entity (bảng database) bạn định nghĩa bằng code
        autoLoadEntities: true,

        // Đồng bộ cấu hình entity với database (Chỉ bật TRUE ở môi trường dev)
        synchronize: true,
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
