import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsOptional, IsInt, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class CreateIngredientInput {
  @Field()
  @IsString()
  name: string;

  @Field()
  @IsString()
  quantity: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  unit?: string;
}

@InputType()
export class CreateInstructionInput {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  step: number;

  @Field()
  @IsString()
  description: string;
}

@InputType()
export class CreateRecipeInput {
  @Field()
  @IsString()
  title: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  cuisine?: string;

  @Field(() => Int, { defaultValue: 1 })
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty: number = 1;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  cookTime: number;

  @Field(() => Int, { defaultValue: 1 })
  @IsInt()
  @Min(1)
  servings: number = 1;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @Field(() => [CreateIngredientInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateIngredientInput)
  ingredients: CreateIngredientInput[];

  @Field(() => [CreateInstructionInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInstructionInput)
  instructions: CreateInstructionInput[];
}