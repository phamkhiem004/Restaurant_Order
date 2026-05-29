import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World! & Welcome to NestJS with TypeScript 6.0.3!';
  }
}
