import { ObjectType, Field, ID,Int } from '@nestjs/graphql';

@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field()
  username: string;

  @Field({ nullable: true })
  firstName?: string;

  @Field({ nullable: true })
  lastName?: string;

  @Field({ nullable: true })
  avatar?: string;

  @Field({ nullable: true })
  bio?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Computed fields for social features
  @Field(() => Int, { nullable: true })
  followersCount?: number;

  @Field(() => Int, { nullable: true })
  followingCount?: number;

  @Field(() => Int, { nullable: true })
  recipesCount?: number;

  @Field(() => Boolean, { nullable: true })
  isFollowing?: boolean;

  // password field is NOT exposed in GraphQL
}