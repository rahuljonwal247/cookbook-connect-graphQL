import { Module } from '@nestjs/common';
import { EventService } from './event.service';
import { RedisModule } from '../redis/redis.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [RedisModule, PrismaModule],
  providers: [EventService],
  exports: [EventService], // ✅ export it for other modules
})
export class EventsModule {}
