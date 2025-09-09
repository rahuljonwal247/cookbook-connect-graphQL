import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async create(recipeId: string, userId: string, content: string) {
    // Check if recipe exists
    const recipe = await this.prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    return this.prisma.comment.create({
      data: {
        content,
        userId,
        recipeId,
      },
      include: { user: true },
    });
  }

  async update(id: string, userId: string, content: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only update your own comments');
    }

    return this.prisma.comment.update({
      where: { id },
      data: { content },
      include: { user: true },
    });
  }

  async remove(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    return this.prisma.comment.delete({ where: { id } });
  }
}