import { Module } from '@nestjs/common';
import { MenuItemsService } from './menu-items.service';
import { MenuItemsController } from './menu-items.controller';
import { MenuItem } from './entities/menu_item.entity';
import { D1RepositoryModule } from '../database/d1.module';
@Module({
  imports: [D1RepositoryModule.forFeature([MenuItem])],
  controllers: [MenuItemsController],
  providers: [MenuItemsService],
})
export class MenuItemsModule {}
