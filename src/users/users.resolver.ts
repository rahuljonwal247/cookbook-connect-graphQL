import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UpdateUserInput } from './dto/update-user.input';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Resolver(() => User)
export class UsersResolver {
  constructor(private usersService: UsersService) {}

  @Query(() => [User])
  async users() {
    return this.usersService.findAll();
  }

  @Query(() => User)
  async user(@Args('id', { type: () => ID }) id: string) {
    return this.usersService.findOne(id);
  }

  @Query(() => User)
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: User) {
    return user;
  }

  @Mutation(() => User)
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Args('input') updateUserInput: UpdateUserInput,
    @CurrentUser() user: User,
  ) {
    return this.usersService.update(user.id, updateUserInput);
  }

  @Mutation(() => String)
  @UseGuards(JwtAuthGuard)
  async deleteAccount(@CurrentUser() user: User) {
    const result = await this.usersService.remove(user.id);
    return result.message;
  }
}