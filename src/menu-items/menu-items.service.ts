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
    return this.menuItemRepository.save(createMenuItemDto);
  }

  async findAll() {
    return await this.menuItemRepository.find();
  }

  async findOne(id: number) {
    return await this.menuItemRepository.findOneBy({ id });
  }

  update(id: number, updateMenuItemDto: UpdateMenuItemDto) {
    return this.menuItemRepository.update(id, updateMenuItemDto);
  }

  remove(id: number) {
    return `This action removes a #${id} menuItem`;
  }
}
