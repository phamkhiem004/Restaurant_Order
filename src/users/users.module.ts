import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { D1RepositoryModule } from '../database/d1.module';
import { User } from './entities/user.entity';

@Module({
  imports: [D1RepositoryModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
