import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

export async function createNestApp(database: D1Database) {
  const app = await NestFactory.create(AppModule.forD1(database), {
    logger:
      process.env.NODE_ENV === 'production' ? ['error', 'warn'] : undefined,
  });

  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );

  return app;
}
