import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RatingsService {
  constructor(private prisma: PrismaService) {}

  async rateRecipe(recipeId: string, userId: string, value: number) {
    // Check if recipe exists
    const recipe = await this.prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    // Check if user already rated this recipe
    const existingRating = await this.prisma.rating.findUnique({
      where: {
        userId_recipeId: {
          userId,
          recipeId,
        },
      },
    });

    if (existingRating) {
      // Update existing rating
      return this.prisma.rating.update({
        where: {
          userId_recipeId: {
            userId,
            recipeId,
          },
        },
        data: { value },
        include: { user: true },
      });
    }

    // Create new rating
    return this.prisma.rating.create({
      data: {
        value,
        userId,
        recipeId,
      },
      include: { user: true },
    });
  }

  async removeRating(recipeId: string, userId: string) {
    const rating = await this.prisma.rating.findUnique({
      where: {
        userId_recipeId: {
          userId,
          recipeId,
        },
      },
    });

    if (!rating) {
      throw new NotFoundException('Rating not found');
    }

    return this.prisma.rating.delete({
      where: {
        userId_recipeId: {
          userId,
          recipeId,
        },
      },
    });
  }
}