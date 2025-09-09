import { Resolver, Subscription, Query, Args, ID, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { EventService } from './event.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import {
  NotificationEvent,
  ActivityFeedEvent,
  RecommendationEvent,
} from './event.types';

@Resolver()
export class EventResolver {
  constructor(private eventService: EventService) {}

  @Query(() => [NotificationEvent])
  @UseGuards(JwtAuthGuard)
  async notifications(
    @CurrentUser() user: User,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
  ) {
    return this.eventService.getUserNotifications(user.id, limit);
  }

  @Query(() => [ActivityFeedEvent])
  @UseGuards(JwtAuthGuard)
  async activityFeed(
    @CurrentUser() user: User,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
  ) {
    return this.eventService.getUserActivityFeed(user.id, limit);
  }

  @Query(() => [ActivityFeedEvent])
  async globalActivityFeed(
    @Args('limit', { type: () => Int, defaultValue: 50 }) limit: number,
  ) {
    return this.eventService.getGlobalActivityFeed(limit);
  }

  @Subscription(() => NotificationEvent)
  @UseGuards(JwtAuthGuard)
  notificationAdded(@CurrentUser() user: User) {
    return this.eventService.subscribeToNotifications(user.id);
  }

  @Subscription(() => ActivityFeedEvent)
  @UseGuards(JwtAuthGuard)
  activityFeedUpdated(@CurrentUser() user: User) {
    return this.eventService.subscribeToActivityFeed(user.id);
  }

  @Subscription(() => ActivityFeedEvent)
  globalActivityFeedUpdated() {
    return this.eventService.subscribeToGlobalActivityFeed();
  }

  @Subscription(() => RecommendationEvent)
  @UseGuards(JwtAuthGuard)
  recommendationsUpdated(@CurrentUser() user: User) {
    return this.eventService.subscribeToRecommendations(user.id);
  }
}