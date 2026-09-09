import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { Reservation } from './entities/reservation.entity';
import { D1RepositoryModule } from '../database/d1.module';
import { DiningTable } from '../dining-tables/entities/dining-table.entity';

@Module({
  imports: [D1RepositoryModule.forFeature([Reservation, DiningTable])],
  controllers: [ReservationsController],
  providers: [ReservationsService],
})
export class ReservationsModule {}
