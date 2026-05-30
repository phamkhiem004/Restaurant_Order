import { Module } from '@nestjs/common';
import { DiningTablesService } from './dining-tables.service';
import { DiningTablesController } from './dining-tables.controller';
import { DiningTable } from './entities/dining-table.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([DiningTable])],
  controllers: [DiningTablesController],
  providers: [DiningTablesService],
})
export class DiningTablesModule {}
