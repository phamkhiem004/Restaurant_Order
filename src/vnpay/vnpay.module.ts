import { Module } from '@nestjs/common';
import { VnpayService } from './vnpay.service';
import { VnpayController } from './vnpay.controller';
import { PaymentsModule } from '../payments/payments.module';
import { ClassSchedulesModule } from '../class-schedules/class-schedules.module';

@Module({
  imports: [PaymentsModule, ClassSchedulesModule],
  controllers: [VnpayController],
  providers: [VnpayService],
})
export class VnpayModule {}
