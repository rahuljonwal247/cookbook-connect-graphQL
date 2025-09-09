import { Injectable } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  EventType,
  NotificationEvent,
  ActivityFeedEvent,
  FeedUser,
  FeedRecipe,
} from './event.types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EventService {
  private pubSub: PubSub<Record<string, any>>;

  constructor(
    private redisService: RedisService,
    private prisma: PrismaService,
  ) {
    this.pubSub = new PubSub<Record<string, any>>();
  }

  // -------------------- Notifications --------------------
  async publishNotification(
    notification: Omit<NotificationEvent, 'id' | 'createdAt'>,
  ) {
    const event: NotificationEvent = {
      ...notification,
      id: uuidv4(),
      createdAt: new Date(),
    };

    await this.redisService.addToList(`notifications:${notification.userId}`, event);
    await this.redisService.trimList(`notifications:${notification.userId}`, 0, 99);

    this.pubSub.publish(`NOTIFICATION_${notification.userId}`, { notification: event });
    await this.redisService.publish(`notifications:${notification.userId}`, event);

    return event;
  }

  // -------------------- Activity Feed --------------------
  async publishActivityFeedEvent(
    actorId: string,
    type: EventType,
    recipeId?: string,
    data?: any,
  ) {
    const actorFromDb = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
      },
    });

    if (!actorFromDb) return;

    const actor: FeedUser = {
      id: actorFromDb.id,
      username: actorFromDb.username,
      firstName: actorFromDb.firstName ?? undefined,
      lastName: actorFromDb.lastName ?? undefined,
      avatar: actorFromDb.avatar ?? undefined,
    };

    let recipe: FeedRecipe | undefined;

    if (recipeId) {
      const recipeFromDb = await this.prisma.recipe.findUnique({
        where: { id: recipeId },
        select: {
          id: true,
          title: true,
          imageUrl: true,
          cuisine: true,
        },
      });

      if (recipeFromDb) {
        recipe = {
          id: recipeFromDb.id,
          title: recipeFromDb.title,
          cuisine: recipeFromDb.cuisine ?? undefined,
          imageUrl: recipeFromDb.imageUrl ?? undefined,
        };
      }
    }

    const event: ActivityFeedEvent = {
      id: uuidv4(),
      type,
      message: this.generateActivityMessage(type, actor, recipe),
      actor,
      recipe,
      createdAt: new Date(),
      data: data ? JSON.stringify(data) : undefined,
    };

    // Publish to followers
    const followers = await this.prisma.follow.findMany({
      where: { followingId: actorId },
      select: { followerId: true },
    });

    for (const follower of followers) {
      await this.redisService.addToList(`activity_feed:${follower.followerId}`, event);
      await this.redisService.trimList(`activity_feed:${follower.followerId}`, 0, 49);

      this.pubSub.publish(`ACTIVITY_FEED_${follower.followerId}`, { activityFeed: event });
    }

    // Global activity feed
    await this.redisService.addToList('activity_feed:global', event);
    await this.redisService.trimList('activity_feed:global', 0, 99);
    this.pubSub.publish('ACTIVITY_FEED_GLOBAL', { activityFeed: event });

    return event;
  }

  // -------------------- Recipe Created --------------------
  async onRecipeCreated(recipe: any, authorId: string) {
    await this.publishActivityFeedEvent(authorId, EventType.RECIPE_CREATED, recipe.id);
    await this.updateRecommendations(recipe);
  }

  // -------------------- Recipe Rated --------------------
  async onRecipeRated(recipeId: string, rating: number, userId: string, recipeAuthorId: string) {
    if (userId !== recipeAuthorId) {
      const rater = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { username: true },
      });

      const recipe = await this.prisma.recipe.findUnique({
        where: { id: recipeId },
        select: { title: true },
      });

      await this.publishNotification({
        type: EventType.RECIPE_RATED,
        title: 'New Rating!',
        message: `${rater?.username} rated your recipe "${recipe?.title}" ${rating} stars`,
        userId: recipeAuthorId,
        actorId: userId,
        recipeId,
      });
    }

    await this.publishActivityFeedEvent(userId, EventType.RECIPE_RATED, recipeId, { rating });
    await this.updateUserRecommendations(userId);
  }

  // -------------------- Recipe Commented --------------------
  async onRecipeCommented(recipeId: string, comment: string, userId: string, recipeAuthorId: string) {
    if (userId !== recipeAuthorId) {
      const commenter = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { username: true },
      });

      const recipe = await this.prisma.recipe.findUnique({
        where: { id: recipeId },
        select: { title: true },
      });

      await this.publishNotification({
        type: EventType.RECIPE_COMMENTED,
        title: 'New Comment!',
        message: `${commenter?.username} commented on your recipe "${recipe?.title}"`,
        userId: recipeAuthorId,
        actorId: userId,
        recipeId,
      });
    }

    await this.publishActivityFeedEvent(userId, EventType.RECIPE_COMMENTED, recipeId, { comment });
  }

  // -------------------- User Followed --------------------
  async onUserFollowed(followerId: string, followingId: string) {
    const follower = await this.prisma.user.findUnique({
      where: { id: followerId },
      select: { username: true },
    });

    await this.publishNotification({
      type: EventType.USER_FOLLOWED,
      title: 'New Follower!',
      message: `${follower?.username} started following you`,
      userId: followingId,
      actorId: followerId,
    });

    const recentRecipes = await this.prisma.recipe.findMany({
      where: { authorId: followingId },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    for (const recipe of recentRecipes) {
      await this.publishActivityFeedEvent(followingId, EventType.RECIPE_CREATED, recipe.id);
    }
  }

  // -------------------- Get Notifications / Feed --------------------
  async getUserNotifications(userId: string, limit = 20) {
    const notifications = await this.redisService.getFromList(
      `notifications:${userId}`,
      0,
      limit - 1,
    );

    return this.enrichNotifications(notifications);
  }

  async getUserActivityFeed(userId: string, limit = 20) {
    return this.redisService.getFromList(`activity_feed:${userId}`, 0, limit - 1);
  }

  async getGlobalActivityFeed(limit = 50) {
    return this.redisService.getFromList('activity_feed:global', 0, limit - 1);
  }

  // -------------------- Subscriptions --------------------
  subscribeToNotifications(userId: string) {
    return (this.pubSub as any).asyncIterator(`NOTIFICATION_${userId}`);
  }

  subscribeToActivityFeed(userId: string) {
    return (this.pubSub as any).asyncIterator(`ACTIVITY_FEED_${userId}`);
  }

  subscribeToGlobalActivityFeed() {
    return (this.pubSub as any).asyncIterator('ACTIVITY_FEED_GLOBAL');
  }

  subscribeToRecommendations(userId: string) {
    return (this.pubSub as any).asyncIterator(`RECOMMENDATIONS_${userId}`);
  }

  // -------------------- Private Helpers --------------------
  private generateActivityMessage(type: EventType, actor: FeedUser, recipe?: FeedRecipe): string {
    const actorName = actor.firstName ? `${actor.firstName} ${actor.lastName}` : actor.username;

    switch (type) {
      case EventType.RECIPE_CREATED:
        return `${actorName} shared a new recipe: ${recipe?.title}`;
      case EventType.RECIPE_RATED:
        return `${actorName} rated ${recipe?.title}`;
      case EventType.RECIPE_COMMENTED:
        return `${actorName} commented on ${recipe?.title}`;
      default:
        return `${actorName} performed an action`;
    }
  }

  private async enrichNotifications(notifications: any[]) {
    const enriched: NotificationEvent[] = [];

    for (const notification of notifications) {
      const enrichedNotification = { ...notification };

      if (notification.actorId) {
        const actor = await this.prisma.user.findUnique({
          where: { id: notification.actorId },
          select: { id: true, username: true, firstName: true, lastName: true, avatar: true },
        });
        enrichedNotification.actor = actor
          ? {
              id: actor.id,
              username: actor.username,
              firstName: actor.firstName ?? undefined,
              lastName: actor.lastName ?? undefined,
              avatar: actor.avatar ?? undefined,
            }
          : undefined;
      }

      if (notification.recipeId) {
        const recipe = await this.prisma.recipe.findUnique({
          where: { id: notification.recipeId },
          select: { id: true, title: true, imageUrl: true, cuisine: true },
        });

        enrichedNotification.recipe = recipe
          ? {
              id: recipe.id,
              title: recipe.title,
              cuisine: recipe.cuisine ?? undefined,
              imageUrl: recipe.imageUrl ?? undefined,
            }
          : undefined;
      }

      enriched.push(enrichedNotification);
    }

    return enriched;
  }

  private async updateRecommendations(recipe: any) {
    const similarUsers = await this.prisma.rating.findMany({
      where: {
        recipe: {
          OR: [
            { cuisine: recipe.cuisine },
            {
              ingredients: {
                some: { name: { in: recipe.ingredients.map((ing: any) => ing.name) } },
              },
            },
          ],
        },
        value: { gte: 4 },
      },
      select: { userId: true },
      distinct: ['userId'],
      take: 100,
    });

    for (const user of similarUsers) {
      await this.publishRecommendationUpdate(user.userId, [recipe], 'Based on your taste preferences');
    }
  }

  private async updateUserRecommendations(userId: string) {
    const userRatings = await this.prisma.rating.findMany({
      where: { userId, value: { gte: 4 } },
      include: { recipe: { include: { ingredients: true } } },
      take: 10,
    });

    if (!userRatings.length) return;

    const ingredients = userRatings.flatMap(r => r.recipe.ingredients.map(ing => ing.name));
    const cuisines: string[] = userRatings
      .map(r => r.recipe.cuisine)
      .filter((c): c is string => !!c);

    const recommendations = await this.prisma.recipe.findMany({
      where: {
        AND: [
          { authorId: { not: userId } },
          {
            OR: [
              { cuisine: { in: cuisines } },
              { ingredients: { some: { name: { in: ingredients } } } },
            ],
          },
        ],
      },
      include: {
        author: { select: { id: true, username: true, firstName: true, lastName: true, avatar: true } },
        ingredients: true,
        _count: { select: { ratings: true, comments: true } },
      },
      take: 10,
    });

    if (recommendations.length) {
      await this.publishRecommendationUpdate(userId, recommendations, 'Based on your recent ratings');
    }
  }

  private async publishRecommendationUpdate(userId: string, recipes: any[], reason: string) {
    const event = {
      userId,
      recommendedRecipes: recipes,
      reason,
      createdAt: new Date(),
    };

    await this.redisService.setCache(`recommendations:${userId}`, event, 3600);
    this.pubSub.publish(`RECOMMENDATIONS_${userId}`, { recommendationUpdate: event });
  }
}
