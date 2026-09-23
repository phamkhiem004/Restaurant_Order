import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RealtimeKitController } from './realtimekit.controller';
import { RealtimeKitService } from './realtimekit.service';

@Module({
  imports: [AuthModule],
  controllers: [RealtimeKitController],
  providers: [RealtimeKitService],
  exports: [RealtimeKitService],
})
export class RealtimeKitModule {}
