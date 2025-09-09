import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { AuthPayload } from './dto/auth.payload';
import { LoginInput, RegisterInput } from './dto/auth.input';

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Mutation(() => AuthPayload)
  async register(@Args('input') registerInput: RegisterInput) {
    return this.authService.register(registerInput);
  }

  @Mutation(() => AuthPayload)
  async login(@Args('input') loginInput: LoginInput) {
    return this.authService.login(loginInput);
  }
}