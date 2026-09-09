import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis/cloudflare';
import { D1_DATABASE } from '../database/d1.constants';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private readonly database: D1Database;

  constructor(
    private readonly configService: ConfigService,
    @Inject(D1_DATABASE) database: object,
  ) {
    this.database = database as D1Database;
  }

  async get<T>(key: string): Promise<T | null> {
    const redis = this.client();
    if (redis) {
      try {
        const value = await redis.get<T>(key);
        if (value !== null) return value;
      } catch {
        this.logger.warn(
          'Redis unavailable; reading session from D1 fallback.',
        );
      }
    }

    const row = await this.database
      .prepare(
        'SELECT user_json, expires_at FROM auth_sessions WHERE token = ? LIMIT 1',
      )
      .bind(key)
      .first<{ user_json: string; expires_at: number }>();
    if (!row) return null;
    if (row.expires_at <= Math.floor(Date.now() / 1000)) {
      await this.deleteFallback(key);
      return null;
    }
    try {
      return JSON.parse(row.user_json) as T;
    } catch {
      await this.deleteFallback(key);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const redis = this.client();
    if (redis) {
      try {
        await redis.set(key, value, { ex: ttlSeconds });
        return;
      } catch {
        this.logger.warn('Redis unavailable; storing session in D1 fallback.');
      }
    }

    await this.database
      .prepare(
        `INSERT INTO auth_sessions (token, user_json, expires_at)
         VALUES (?, ?, ?)
         ON CONFLICT(token) DO UPDATE SET
           user_json = excluded.user_json,
           expires_at = excluded.expires_at`,
      )
      .bind(
        key,
        JSON.stringify(value),
        Math.floor(Date.now() / 1000) + ttlSeconds,
      )
      .run();
  }

  async delete(key: string): Promise<void> {
    const redis = this.client();
    if (redis) {
      try {
        await redis.del(key);
      } catch {
        this.logger.warn('Redis unavailable while deleting session.');
      }
    }
    await this.deleteFallback(key);
  }

  private client(): Redis | null {
    const url = this.configService.get<string>('UPSTASH_REDIS_REST_URL');
    const token = this.configService.get<string>('UPSTASH_REDIS_REST_TOKEN');
    if (!url || !token) return null;

    return new Redis({
      url,
      token,
      signal: AbortSignal.timeout(2500),
      retry: false,
    });
  }

  private async deleteFallback(key: string): Promise<void> {
    await this.database
      .prepare('DELETE FROM auth_sessions WHERE token = ?')
      .bind(key)
      .run();
  }
}
