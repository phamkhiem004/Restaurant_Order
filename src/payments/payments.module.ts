import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Payment } from './entities/payment.entity';
import { D1RepositoryModule } from '../database/d1.module';
import { Order } from '../orders/entities/order.entity';
import { DiningTable } from '../dining-tables/entities/dining-table.entity';

@Module({
  imports: [D1RepositoryModule.forFeature([Payment, Order, DiningTable])],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
