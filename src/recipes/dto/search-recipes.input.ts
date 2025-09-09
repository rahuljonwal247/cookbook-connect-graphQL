import { InputType, Field, Int, ObjectType } from '@nestjs/graphql';
import { IsOptional, IsArray, Min, Max } from 'class-validator';
import { Recipe } from '../entities/recipe.entity'; // Add this import

@InputType()
export class SearchRecipesInput {
  @Field({ nullable: true })
  @IsOptional()
  query?: string; // Full-text search

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  ingredients?: string[]; // "Cook with what I have"

  @Field({ nullable: true })
  @IsOptional()
  cuisine?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @Min(1)
  @Max(5)
  difficulty?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @Min(1)
  maxCookTime?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @Min(1)
  minRating?: number;

  @Field(() => Int, { defaultValue: 0 })
  @IsOptional()
  @Min(0)
  skip?: number;

  @Field(() => Int, { defaultValue: 20 })
  @IsOptional()
  @Min(1)
  @Max(100)
  take?: number;

  @Field({ nullable: true })
  @IsOptional()
  sortBy?: string; // 'relevance' | 'rating' | 'date' | 'cookTime'
}

@ObjectType()
export class SearchRecipesResult {
  @Field(() => [Recipe])
  recipes: Recipe[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  skip: number;

  @Field(() => Int)
  take: number;
}