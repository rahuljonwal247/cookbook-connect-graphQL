import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { Redis as RedisClient } from 'ioredis'; // ✅ Import type separately

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClient;
  private subscriber: RedisClient;
  private publisher: RedisClient;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisConfig = {
      host: this.configService.get('REDIS_HOST'),
      port: this.configService.get<number>('REDIS_PORT'), // ensure number type
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    };

    this.client = new Redis(redisConfig);
    this.subscriber = new Redis(redisConfig);
    this.publisher = new Redis(redisConfig);
  }

  async onModuleDestroy() {
    await this.client?.quit();
    await this.subscriber?.quit();
    await this.publisher?.quit();
  }

  getClient(): RedisClient {
    return this.client;
  }

  getSubscriber(): RedisClient {
    return this.subscriber;
  }

  getPublisher(): RedisClient {
    return this.publisher;
  }

  async publish(channel: string, data: any) {
    return this.publisher.publish(channel, JSON.stringify(data));
  }

  async subscribe(channel: string, callback: (data: any) => void) {
    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const data = JSON.parse(message);
          callback(data);
        } catch (error) {
          console.error('Error parsing Redis message:', error);
        }
      }
    });
  }

  async setCache(key: string, value: any, ttlSeconds?: number) {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      return this.client.setex(key, ttlSeconds, serialized);
    }
    return this.client.set(key, serialized);
  }

  async getCache(key: string) {
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async deleteCache(key: string) {
    return this.client.del(key);
  }

  async addToList(key: string, value: any) {
    return this.client.lpush(key, JSON.stringify(value));
  }

  async getFromList(key: string, start = 0, end = -1) {
    const items = await this.client.lrange(key, start, end);
    return items.map(item => JSON.parse(item));
  }

  async trimList(key: string, start: number, end: number) {
    return this.client.ltrim(key, start, end);
  }
}
