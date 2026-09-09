import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { RedisService } from '../redis/redis.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { SessionUser } from './auth.types';

export const SESSION_COOKIE = 'restaurant_session';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly usersService: UsersService,
    private readonly redisService: RedisService,
  ) {}

  register(dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  async login(dto: LoginDto): Promise<{ token: string; user: SessionUser }> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
    }

    const sessionUser: SessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
    const token = this.createToken();
    await this.redisService.set(
      this.sessionKey(token),
      sessionUser,
      SESSION_TTL_SECONDS,
    );
    return { token, user: sessionUser };
  }

  async getSession(token: string): Promise<SessionUser | null> {
    return this.redisService.get<SessionUser>(this.sessionKey(token));
  }

  async logout(token: string | undefined): Promise<void> {
    if (token) await this.redisService.delete(this.sessionKey(token));
  }

  get cookieMaxAgeMilliseconds(): number {
    return SESSION_TTL_SECONDS * 1000;
  }

  private sessionKey(token: string): string {
    return `restaurant:session:${token}`;
  }

  private createToken(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
      '',
    );
  }
}
