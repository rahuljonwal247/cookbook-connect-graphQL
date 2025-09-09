import { Resolver, Query } from '@nestjs/graphql';

@Resolver()
export class AppResolver {
  @Query(() => String)
  hello(): string {
    return 'Hello World! GraphQL is working!';
  }

  @Query(() => String)
  health(): string {
    return 'API is healthy';
  }
}