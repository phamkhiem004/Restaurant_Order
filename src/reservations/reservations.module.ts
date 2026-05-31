import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { Reservation } from './entities/reservation.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiningTable } from 'src/dining-tables/entities/dining-table.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Reservation, DiningTable])],
  controllers: [ReservationsController],
  providers: [ReservationsService],
})
export class ReservationsModule {}
