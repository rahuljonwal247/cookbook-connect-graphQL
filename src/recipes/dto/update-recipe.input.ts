import { InputType, Field, ID, PartialType } from '@nestjs/graphql';
import { CreateRecipeInput } from './create-recipe.input';

@InputType()
export class UpdateRecipeInput extends PartialType(CreateRecipeInput) {
  @Field(() => ID)
  id: string;
}