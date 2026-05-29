import { Controller, Get, Post, Put, Patch, Delete } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post()
  createItem(): string {
    return 'Item created!';
  }

  @Put(':id')
  updateItem(): string {
    return 'Item updated!';
  }

  @Patch(':id')
  patchItem(): string {
    return 'Item patched!';
  }

  @Delete(':id')
  deleteItem(): string {
    return 'Item deleted!';
  }
}
