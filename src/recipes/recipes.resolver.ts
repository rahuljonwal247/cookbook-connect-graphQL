import { Resolver, Query, Mutation, Args, ID, Int, ResolveField, Parent } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Recipe, Rating, Comment,SearchRecipesResult } from './entities/recipe.entity';
import { RecipesService } from './recipes.service';
import { RatingsService } from '../ratings/ratings.service';
import { CommentsService } from '../comments/comments.service';
import { CreateRecipeInput, UpdateRecipeInput } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SearchRecipesInput } from './dto/search-recipes.input';

@Resolver(() => Recipe)
export class RecipesResolver {
  constructor(
    private readonly recipesService: RecipesService,
    private readonly ratingsService: RatingsService,
    private readonly commentsService: CommentsService,
  ) {}

  @Mutation(() => Recipe)
  @UseGuards(JwtAuthGuard)
  createRecipe(
    @Args('createRecipeInput') createRecipeInput: CreateRecipeInput,
    @CurrentUser() user: any,
  ) 
  
  {
    
  
  const userId = user?.id || user?.userId || user?.sub;
  
  if (!userId) {
    throw new Error('User ID not found');
  }
  

    return this.recipesService.create(createRecipeInput, userId );
  }

  @Query(() => [Recipe])
  recipes(
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 }) offset: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 }) limit: number,
  ) {
    return this.recipesService.findAll(offset, limit);
  }

  @Query(() => Recipe)
  recipe(@Args('id', { type: () => ID }) id: string) {
    return this.recipesService.findOne(id);
  }


   @Query(() => SearchRecipesResult)
  async searchRecipes(@Args('input') searchInput: SearchRecipesInput) {
    return this.recipesService.searchRecipes(searchInput);
  }

  @Mutation(() => Recipe)
  @UseGuards(JwtAuthGuard)
  updateRecipe(
    @Args('updateRecipeInput') updateRecipeInput: UpdateRecipeInput,
    @CurrentUser() user: any,
  ) {
    return this.recipesService.update(updateRecipeInput.id, updateRecipeInput, user?.id);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async removeRecipe(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: any,
  ) {
    await this.recipesService.remove(id, user?.id);
    return true;
  }

  @Mutation(() => Rating)
  @UseGuards(JwtAuthGuard)
  rateRecipe(
    @Args('recipeId', { type: () => ID }) recipeId: string,
    @Args('value', { type: () => Int }) value: number,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id || user?.userId || user?.sub;
    return this.ratingsService.rateRecipe(recipeId, userId, value);
  }

  @Mutation(() => Comment)
  @UseGuards(JwtAuthGuard)
  addComment(
    @Args('recipeId', { type: () => ID }) recipeId: string,
    @Args('content') content: string,
    @CurrentUser() user: any,
  ) {
    return this.commentsService.create(recipeId, user?.id, content);
  }

  @Query(() => [Recipe])
  recipesByIngredients(@Args('ingredients', { type: () => [String] }) ingredients: string[]) {
    return this.recipesService.getRecipesByIngredients(ingredients);
  }

  @Query(() => [Recipe])
  @UseGuards(JwtAuthGuard)
  userFeed(
    @CurrentUser() user: any,
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 }) offset: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 }) limit: number,
  ) {
    return this.recipesService.getUserFeed(user?.id, offset, limit);
  }

  // Computed field resolvers
  @ResolveField(() => Number, { nullable: true })
  async averageRating(@Parent() recipe: Recipe) {
    if (!recipe.ratings || recipe.ratings.length === 0) {
      return null;
    }
    const sum = recipe.ratings.reduce((acc, rating) => acc + rating.value, 0);
    return sum / recipe.ratings.length;
  }

  @ResolveField(() => Int)
  commentCount(@Parent() recipe: any) {
    return recipe._count?.comments || 0;
  }
}

