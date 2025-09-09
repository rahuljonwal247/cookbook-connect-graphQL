import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';

export enum EventType {
  RECIPE_CREATED = 'RECIPE_CREATED',
  RECIPE_UPDATED = 'RECIPE_UPDATED',
  RECIPE_RATED = 'RECIPE_RATED',
  RECIPE_COMMENTED = 'RECIPE_COMMENTED',
  USER_FOLLOWED = 'USER_FOLLOWED',
  RECOMMENDATION_UPDATED = 'RECOMMENDATION_UPDATED',
}

registerEnumType(EventType, { name: 'EventType' });

// Lightweight types for GraphQL feed
@ObjectType()
export class FeedUser {
  @Field(() => ID)
  id: string;

  @Field()
  username: string;

  @Field({ nullable: true })
  firstName?: string;

  @Field({ nullable: true })
  lastName?: string;

  @Field({ nullable: true })
  avatar?: string;
}

@ObjectType()
export class FeedRecipe {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  cuisine?: string;

  @Field({ nullable: true })
  imageUrl?: string;
}

@ObjectType()
export class NotificationEvent {
  @Field(() => ID)
  id: string;

  @Field(() => EventType)
  type: EventType;

  @Field()
  title: string;

  @Field()
  message: string;

  @Field(() => ID)
  userId: string;

  @Field(() => ID, { nullable: true })
  actorId?: string;

  @Field(() => FeedUser, { nullable: true })
  actor?: FeedUser;

  @Field(() => ID, { nullable: true })
  recipeId?: string;

  @Field(() => FeedRecipe, { nullable: true })
  recipe?: FeedRecipe;

  @Field()
  createdAt: Date;

  @Field({ nullable: true })
  data?: string;
}

@ObjectType()
export class ActivityFeedEvent {
  @Field(() => ID)
  id: string;

  @Field(() => EventType)
  type: EventType;

  @Field()
  message: string;

  @Field(() => FeedUser)
  actor: FeedUser;

  @Field(() => FeedRecipe, { nullable: true })
  recipe?: FeedRecipe;

  @Field()
  createdAt: Date;

  @Field({ nullable: true })
  data?: string;
}

@ObjectType()
export class RecommendationEvent {
  @Field(() => ID)
  userId: string;

  @Field(() => [FeedRecipe])
  recommendedRecipes: FeedRecipe[];

  @Field()
  reason: string;

  @Field()
  createdAt: Date;
}
