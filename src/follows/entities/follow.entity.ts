import { ObjectType, Field, ID } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity';

@ObjectType()
export class Follow {
  @Field(() => ID)
  id: string;

  @Field()
  createdAt: Date;

  @Field()
  followerId: string;

  @Field()
  followingId: string;

  @Field(() => User)
  follower: User;

  @Field(() => User)
  following: User;
}

@ObjectType()
export class FollowStats {
  @Field(() => Number)
  followersCount: number;

  @Field(() => Number)
  followingCount: number;

  @Field(() => Boolean)
  isFollowing: boolean;
}