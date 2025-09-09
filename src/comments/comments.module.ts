import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule], // Import PrismaModule
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}