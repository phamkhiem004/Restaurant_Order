import { Module } from '@nestjs/common';
import { VnpayService } from './vnpay.service';
import { VnpayController } from './vnpay.controller';
import { PaymentsModule } from 'src/payments/payments.module';

@Module({
  imports: [
    PaymentsModule 
  ],
  controllers: [VnpayController],
  providers: [VnpayService],
})
export class VnpayModule {}
