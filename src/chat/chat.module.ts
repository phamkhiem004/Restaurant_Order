import { Module } from '@nestjs/common';
import { ClassSchedulesModule } from '../class-schedules/class-schedules.module';
import { D1RepositoryModule } from '../database/d1.module';
import { DiningTable } from '../dining-tables/entities/dining-table.entity';
import { MenuItem } from '../menu-items/entities/menu_item.entity';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [
    D1RepositoryModule.forFeature([MenuItem, DiningTable]),
    ClassSchedulesModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
