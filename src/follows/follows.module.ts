import { Module } from '@nestjs/common';
import { FollowsService } from './follows.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule], // Import PrismaModule
  providers: [FollowsService],
  exports: [FollowsService],
})
export class FollowsModule {}