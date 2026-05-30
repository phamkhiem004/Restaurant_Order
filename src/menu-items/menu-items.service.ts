import { Injectable } from '@nestjs/common';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { MenuItem } from './entities/menu_item.entity';
import { Repository } from 'typeorm';

@Injectable()
export class MenuItemsService {
  constructor(
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>
  ) {}
  create(createMenuItemDto: CreateMenuItemDto) {
    console.log(createMenuItemDto);
    return 'This action adds a new menuItem';
  }

  async findAll() {
    return await this.menuItemRepository.find();
  }

  async findOne(id: number) {
    return await this.menuItemRepository.findOneBy({ id });
  }

  update(id: number, updateMenuItemDto: UpdateMenuItemDto) {
    console.log(updateMenuItemDto);
    return `This action updates a #${id} menuItem`;
  }

  remove(id: number) {
    return `This action removes a #${id} menuItem`;
  }
}
