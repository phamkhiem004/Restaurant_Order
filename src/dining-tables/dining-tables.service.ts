import { Injectable } from '@nestjs/common';
import { CreateDiningTableDto } from './dto/create-dining-table.dto';
import { UpdateDiningTableDto } from './dto/update-dining-table.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DiningTable } from './entities/dining-table.entity';
import { Repository } from 'typeorm';

@Injectable()
export class DiningTablesService {
  constructor(
    @InjectRepository(DiningTable)
    private readonly diningTableRepository: Repository<DiningTable>
  ) {}
  async create(createDiningTableDto: CreateDiningTableDto) {
    console.log(createDiningTableDto);
    return this.diningTableRepository.save(createDiningTableDto);
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