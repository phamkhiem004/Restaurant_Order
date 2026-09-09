import { Module } from '@nestjs/common';
import { D1RepositoryModule } from '../database/d1.module';
import { RedisModule } from '../redis/redis.module';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RolesGuard } from './roles.guard';
import { SessionAuthGuard } from './session-auth.guard';

@Module({
  imports: [RedisModule, UsersModule, D1RepositoryModule.forFeature([User])],
  controllers: [AuthController],
  providers: [AuthService, SessionAuthGuard, RolesGuard],
  exports: [AuthService, SessionAuthGuard, RolesGuard],
})
export class AuthModule {}
