import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity';

@ObjectType()
export class Recipe {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  cuisine?: string;

  @Field(() => Int)
  difficulty: number;

  @Field(() => Int)
  cookTime: number;

  @Field(() => Int)
  servings: number;

  @Field({ nullable: true })
  imageUrl?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Relations
  @Field()
  authorId: string;

  @Field(() => User)
  author: User;

  @Field(() => [Ingredient])
  ingredients: Ingredient[];

  @Field(() => [Instruction])
  instructions: Instruction[];

  @Field(() => [Rating])
  ratings: Rating[];

  @Field(() => [Comment])
  comments: Comment[];

  // Computed fields
  @Field(() => Float, { nullable: true })
  averageRating?: number;

  @Field(() => Int)
  commentCount: number;
}

@ObjectType()
export class Ingredient {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  quantity: string;

  @Field({ nullable: true })
  unit?: string;

  @Field()
  recipeId: string;
}

@ObjectType()
export class Instruction {
  @Field(() => ID)
  id: string;

  @Field(() => Int)
  step: number;

  @Field()
  description: string;

  @Field()
  recipeId: string;
}

@ObjectType()
export class Rating {
  @Field(() => ID)
  id: string;

  @Field(() => Int)
  value: number;

  @Field()
  createdAt: Date;

  @Field()
  userId: string;

  @Field()
  recipeId: string;

  @Field(() => User)
  user: User;
}

@ObjectType()
export class Comment {
  @Field(() => ID)
  id: string;

  @Field()
  content: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field()
  userId: string;

  @Field()
  recipeId: string;

  @Field(() => User)
  user: User;
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