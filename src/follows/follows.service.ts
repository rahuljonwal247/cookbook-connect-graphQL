import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FollowsService {
  constructor(private prisma: PrismaService) {}

  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    // Check if user to follow exists
    const userToFollow = await this.prisma.user.findUnique({
      where: { id: followingId },
    });

    if (!userToFollow) {
      throw new NotFoundException('User not found');
    }

    // Check if already following
    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (existingFollow) {
      throw new ConflictException('Already following this user');
    }

    return this.prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
      include: {
        follower: true,
        following: true,
      },
    });
  }

  async unfollowUser(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('You cannot unfollow yourself');
    }

    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (!follow) {
      throw new NotFoundException('You are not following this user');
    }

    await this.prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    return { success: true, message: 'Successfully unfollowed user' };
  }

  async getFollowers(userId: string, currentUserId?: string) {
    const followers = await this.prisma.follow.findMany({
      where: { followingId: userId },
      include: { 
        follower: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
            bio: true,
            _count: {
              select: {
                followers: true,
                following: true,
                recipes: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Add isFollowing flag if currentUserId is provided
    if (currentUserId) {
      const followersWithStatus = await Promise.all(
        followers.map(async (follow) => {
          const isFollowing = await this.isFollowing(currentUserId, follow.follower.id);
          return {
            ...follow,
            follower: {
              ...follow.follower,
              isFollowing,
            },
          };
        })
      );
      return followersWithStatus;
    }

    return followers;
  }

  async getFollowing(userId: string, currentUserId?: string) {
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      include: { 
        following: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
            bio: true,
            _count: {
              select: {
                followers: true,
                following: true,
                recipes: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Add isFollowing flag if currentUserId is provided
    if (currentUserId) {
      const followingWithStatus = await Promise.all(
        following.map(async (follow) => {
          const isFollowing = await this.isFollowing(currentUserId, follow.following.id);
          return {
            ...follow,
            following: {
              ...follow.following,
              isFollowing,
            },
          };
        })
      );
      return followingWithStatus;
    }

    return following;
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    if (followerId === followingId) return false;

    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    return !!follow;
  }

  async getFollowStats(userId: string, currentUserId?: string) {
    const [followersCount, followingCount, isFollowing] = await Promise.all([
      this.prisma.follow.count({ where: { followingId: userId } }),
      this.prisma.follow.count({ where: { followerId: userId } }),
      currentUserId ? this.isFollowing(currentUserId, userId) : false,
    ]);

    return {
      followersCount,
      followingCount,
      isFollowing,
    };
  }

  async getMutualFollows(userId1: string, userId2: string) {
    // Get users that both users follow
    const mutualFollows = await this.prisma.follow.findMany({
      where: {
        AND: [
          {
            followingId: {
              in: await this.prisma.follow.findMany({
                where: { followerId: userId1 },
                select: { followingId: true },
              }).then(follows => follows.map(f => f.followingId)),
            },
          },
          {
            followerId: userId2,
          },
        ],
      },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    return mutualFollows;
  }

  async getSuggestedUsers(userId: string, limit: number = 10) {
    // Get users followed by people the current user follows (friends of friends)
    // Exclude already followed users and the current user
    const suggestions = await this.prisma.user.findMany({
      where: {
        AND: [
          { id: { not: userId } }, // Not the current user
          {
            followers: {
              some: {
                follower: {
                  followers: {
                    some: { followerId: userId },
                  },
                },
              },
            },
          },
          {
            followers: {
              none: { followerId: userId }, // Not already followed
            },
          },
        ],
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        _count: {
          select: {
            followers: true,
            following: true,
            recipes: true,
          },
        },
      },
      take: limit,
      orderBy: {
        followers: {
          _count: 'desc', // Order by popularity
        },
      },
    });

    return suggestions;
  }
}