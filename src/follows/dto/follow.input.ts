import { InputType, Field, ID } from '@nestjs/graphql';
import { IsString, IsNotEmpty } from 'class-validator';

@InputType()
export class FollowUserInput {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  userId: string;
}