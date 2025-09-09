


import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecipeInput, UpdateRecipeInput } from './dto';
import {SearchRecipesInput} from './dto/search-recipes.input'
import { ElasticsearchService, RecipeDocument } from '../elasticsearch/elasticsearch.service';
import { EventService } from '../events/event.service';

@Injectable()
export class RecipesService {
  constructor(
    private prisma: PrismaService,
    private elasticsearchService: ElasticsearchService,
    private eventService: EventService,
  ) {}

  async create(createRecipeInput: CreateRecipeInput, authorId: string) {
    const { ingredients, instructions, ...recipeData } = createRecipeInput;

    const recipe = await this.prisma.recipe.create({
      data: {
        ...recipeData,
        authorId,
        ingredients: {
          create: ingredients,
        },
        instructions: {
          create: instructions,
        },
      },
      include: {
        author: true,
        ingredients: true,
        instructions: {
          orderBy: { step: 'asc' },
        },
        ratings: {
          include: { user: true },
        },
        comments: {
          include: { user: true },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { 
            ratings: true,
            comments: true 
          },
        },
      },
    });

    // Index in Elasticsearch
    await this.indexRecipeInElasticsearch(recipe);
 // Trigger real-time events
  await this.eventService.onRecipeCreated(recipe, authorId);
    return this.transformRecipe(recipe);
  }

  async findAll(offset = 0, limit = 20) {
    const recipes = await this.prisma.recipe.findMany({
      skip: offset,
      take: limit,
      include: {
        author: true,
        ingredients: true,
        instructions: {
          orderBy: { step: 'asc' },
        },
        ratings: true,
        _count: {
          select: { 
            ratings: true,
            comments: true 
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return recipes.map(recipe => this.transformRecipe(recipe));
  }

  async findOne(id: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      include: {
        author: true,
        ingredients: true,
        instructions: {
          orderBy: { step: 'asc' },
        },
        ratings: {
          include: { user: true },
        },
        comments: {
          include: { user: true },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { 
            ratings: true,
            comments: true 
          },
        },
      },
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${id} not found`);
    }

    return this.transformRecipe(recipe);
  }

  async update(id: string, updateRecipeInput: UpdateRecipeInput, userId: string) {
    // Check if recipe exists and user owns it
    const existingRecipe = await this.prisma.recipe.findUnique({
      where: { id },
    });

    if (!existingRecipe) {
      throw new NotFoundException(`Recipe with ID ${id} not found`);
    }

    if (existingRecipe.authorId !== userId) {
      throw new ForbiddenException('You can only update your own recipes');
    }

    const { ingredients, instructions, ...recipeData } = updateRecipeInput;

    const updatedRecipe = await this.prisma.recipe.update({
      where: { id },
      data: {
        ...recipeData,
        ...(ingredients && {
          ingredients: {
            deleteMany: {},
            create: ingredients,
          },
        }),
        ...(instructions && {
          instructions: {
            deleteMany: {},
            create: instructions,
          },
        }),
      },
      include: {
        author: true,
        ingredients: true,
        instructions: {
          orderBy: { step: 'asc' },
        },
        ratings: {
          include: { user: true },
        },
        comments: {
          include: { user: true },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { 
            ratings: true,
            comments: true 
          },
        },
      },
    });

    // Update in Elasticsearch
    await this.indexRecipeInElasticsearch(updatedRecipe);

    return this.transformRecipe(updatedRecipe);
  }

  async remove(id: string, userId: string) {
    // Check if recipe exists and user owns it
    const existingRecipe = await this.prisma.recipe.findUnique({
      where: { id },
    });

    if (!existingRecipe) {
      throw new NotFoundException(`Recipe with ID ${id} not found`);
    }

    if (existingRecipe.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own recipes');
    }

    const deletedRecipe = await this.prisma.recipe.delete({
      where: { id },
    });

    // Remove from Elasticsearch
    await this.elasticsearchService.deleteRecipe(id);

    return deletedRecipe;
  }

  // Complex queries
  async getRecipesWithRatings() {
    const recipes = await this.prisma.recipe.findMany({
      include: {
        author: true,
        ratings: true,
        _count: {
          select: { 
            ratings: true,
            comments: true 
          },
        },
      },
    });

    return recipes.map(recipe => this.transformRecipe(recipe));
  }

  async getRecipesByIngredients(ingredientNames: string[]) {
    const recipes = await this.prisma.recipe.findMany({
      where: {
        ingredients: {
          some: {
            name: {
              in: ingredientNames,
              mode: 'insensitive',
            },
          },
        },
      },
      include: {
        author: true,
        ingredients: true,
        instructions: {
          orderBy: { step: 'asc' },
        },
        ratings: true,
        _count: {
          select: { 
            ratings: true,
            comments: true 
          },
        },
      },
    });

    return recipes.map(recipe => this.transformRecipe(recipe));
  }

  async getUserFeed(userId: string, offset = 0, limit = 20) {
    // Get recipes from users that the current user follows
    const recipes = await this.prisma.recipe.findMany({
      where: {
        author: {
          followers: {
            some: {
              followerId: userId,
            },
          },
        },
      },
      skip: offset,
      take: limit,
      include: {
        author: true,
        ingredients: true,
        ratings: true,
        _count: {
          select: { 
            ratings: true,
            comments: true 
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return recipes.map(recipe => this.transformRecipe(recipe));
  }

  async searchRecipes(searchInput: SearchRecipesInput) {
    const searchResult = await this.elasticsearchService.searchRecipes(searchInput);
    
    if (searchResult.recipes.length === 0) {
      return {
        recipes: [],
        total: 0,
        skip: searchInput.skip || 0,
        take: searchInput.take || 20,
      };
    }

    // Get full recipe data from database
    const recipeIds = searchResult.recipes.map((recipe: any) => recipe.id);
    const recipes = await this.prisma.recipe.findMany({
      where: { id: { in: recipeIds } },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        ingredients: true,
        instructions: { orderBy: { step: 'asc' } },
        ratings: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            ratings: true,
            comments: true,
          },
        },
      },
    });

    // Maintain the order from Elasticsearch
    const orderedRecipes = recipeIds
      .map((id) => recipes.find((recipe) => recipe.id === id))
      .filter(Boolean)
      .map(recipe => this.transformRecipe(recipe));

    return {
      recipes: orderedRecipes,
      total: searchResult.total,
      skip: searchInput.skip || 0,
      take: searchInput.take || 20,
    };
  }

  async getIngredientSuggestions(query: string) {
    return this.elasticsearchService.getIngredientSuggestions(query);
  }

  async getRecipeSuggestions(query: string) {
    return this.elasticsearchService.getRecipeSuggestions(query);
  }

  private async indexRecipeInElasticsearch(recipe: any) {
    const averageRating = this.calculateAverageRating(recipe.ratings || []);
    
    const recipeDocument: RecipeDocument = {
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      cuisine: recipe.cuisine,
      difficulty: recipe.difficulty,
      cookTime: recipe.cookTime,
      servings: recipe.servings,
      authorId: recipe.authorId,
      authorUsername: recipe.author.username,
      ingredients: recipe.ingredients.map((ing: any) => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
      })),
      averageRating,
      ratingsCount: recipe._count?.ratings || recipe.ratings?.length || 0,
      commentsCount: recipe._count?.comments || recipe.comments?.length || 0,
      createdAt: recipe.createdAt.toISOString(),
      updatedAt: recipe.updatedAt.toISOString(),
    };

    await this.elasticsearchService.indexRecipe(recipeDocument);
  }

  private transformRecipe(recipe: any) {
    const averageRating = this.calculateAverageRating(recipe.ratings || []);
    
    return {
      ...recipe,
      averageRating,
      ratingsCount: recipe._count?.ratings || recipe.ratings?.length || 0,
      commentsCount: recipe._count?.comments || recipe.comments?.length || 0,
    };
  }

  private calculateAverageRating(ratings: any[]): number {
    if (!ratings || ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, rating) => acc + rating.value, 0);
    return Math.round((sum / ratings.length) * 10) / 10; // Round to 1 decimal place
  }
}