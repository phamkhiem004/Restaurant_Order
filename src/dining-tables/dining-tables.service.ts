import { Injectable } from '@nestjs/common';
import { CreateDiningTableDto } from './dto/create-dining-table.dto';
import { UpdateDiningTableDto } from './dto/update-dining-table.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DiningTable } from './entities/dining-table.entity';
import { Between, In, Repository } from 'typeorm';
import { Reservation } from 'src/reservations/entities/reservation.entity';

@Injectable()
export class DiningTablesService {
  constructor(
    @InjectRepository(DiningTable)
    private readonly diningTableRepository: Repository<DiningTable>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
  ) {}
  async create(createDiningTableDto: CreateDiningTableDto) {
    console.log(createDiningTableDto);
    return this.diningTableRepository.save(createDiningTableDto);
  }

  async getTableMap() {
  const now = new Date();
  
  const bufferBefore = new Date(now.getTime() - 15 * 60000);
  const bufferAfter = new Date(now.getTime() + 30 * 60000);

  const tables = await this.diningTableRepository.find();


  const activeReservations = await this.reservationRepository.find({
    where: {
      status: In(['PENDING', 'CONFIRMED']),
      reservationTime: Between(bufferBefore, bufferAfter),
    },
    order: { reservationTime: 'ASC' } 
  });


  const tableMap = tables.map(table => {
    let displayStatus: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED' = table.status as any;
    let nextReservationTime: Date | null = null; 

    const matchedReservation = activeReservations.find(res => res.tableId === table.id);

    if (table.status === 'AVAILABLE' && matchedReservation) {
      displayStatus = 'RESERVED';
      nextReservationTime = matchedReservation.reservationTime; 
    }

    return {
      id: table.id,
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      dbStatus: table.status,      
      displayStatus: displayStatus, 
      nextReservationTime: nextReservationTime
    };
  });

  return tableMap;
}

  async findAll() {
    return await this.diningTableRepository.find();
  }
  async findAvailableTables() {
    return await this.diningTableRepository.find({where: {status: 'AVAILABLE'}});
  }
  findOne(id: number) {
    return `This action returns a #${id} diningTable`;
  }

  update(id: number, updateDiningTableDto: UpdateDiningTableDto) {
    console.log(updateDiningTableDto);
    return `This action updates a #${id} diningTable`;
  }

  remove(id: number) {
    return `This action removes a #${id} diningTable`;
  }

  
}