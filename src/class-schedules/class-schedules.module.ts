import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { D1RepositoryModule } from '../database/d1.module';
import { RealtimeKitModule } from '../realtimekit/realtimekit.module';
import { ClassSchedulesController } from './class-schedules.controller';
import { ClassSchedulesService } from './class-schedules.service';
import { ClassEnrollment } from './entities/class-enrollment.entity';
import { ClassSchedule } from './entities/class-schedule.entity';

@Module({
  imports: [
    D1RepositoryModule.forFeature([ClassSchedule, ClassEnrollment]),
    AuthModule,
    RealtimeKitModule,
  ],
  controllers: [ClassSchedulesController],
  providers: [ClassSchedulesService],
  exports: [ClassSchedulesService],
})
export class ClassSchedulesModule {}
