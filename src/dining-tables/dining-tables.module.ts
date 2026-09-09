import { Module } from '@nestjs/common';
import { DiningTablesService } from './dining-tables.service';
import { DiningTablesController } from './dining-tables.controller';
import { DiningTable } from './entities/dining-table.entity';
import { D1RepositoryModule } from '../database/d1.module';
import { Reservation } from '../reservations/entities/reservation.entity';

@Module({
  imports: [D1RepositoryModule.forFeature([DiningTable, Reservation])],
  controllers: [DiningTablesController],
  providers: [DiningTablesService],
})
export class DiningTablesModule {}
