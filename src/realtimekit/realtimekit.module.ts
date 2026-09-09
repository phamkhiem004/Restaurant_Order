import { Module } from '@nestjs/common';
import { RealtimeKitController } from './realtimekit.controller';
import { RealtimeKitService } from './realtimekit.service';

@Module({
  controllers: [RealtimeKitController],
  providers: [RealtimeKitService],
})
export class RealtimeKitModule {}
