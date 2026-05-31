import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { DiningTablesService } from './dining-tables.service';
import { CreateDiningTableDto } from './dto/create-dining-table.dto';
import { UpdateDiningTableDto } from './dto/update-dining-table.dto';

@Controller('dining-tables')
export class DiningTablesController {
  constructor(private readonly diningTablesService: DiningTablesService) {}

  @Post()
  async create(@Body() createDiningTableDto: CreateDiningTableDto) {
    return this.diningTablesService.create(createDiningTableDto);
  }

  @Get()
  async findAll() {
    return await this.diningTablesService.findAll();
  }
  @Get('/available')
  async findAvailableTables() {
    return await this.diningTablesService.findAvailableTables();
  }
  @Get('/map')
  async getTableMap() {
    return this.diningTablesService.getTableMap();
  }
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.diningTablesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDiningTableDto: UpdateDiningTableDto,
  ) {
    return this.diningTablesService.update(+id, updateDiningTableDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.diningTablesService.remove(+id);
  }

  
}
