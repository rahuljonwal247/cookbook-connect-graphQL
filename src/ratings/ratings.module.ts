import { Module } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule], // Import PrismaModule
  providers: [RatingsService],
  exports: [RatingsService],
})
export class RatingsModule {}