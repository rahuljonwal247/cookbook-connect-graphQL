import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterInput, LoginInput } from './dto/auth.input';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerInput: RegisterInput) {
    // Create user using UsersService
    const user = await this.usersService.create(registerInput);

    // Generate JWT token
    const token = this.jwtService.sign({
      userId: user.id,
      email: user.email,
    });

    return { user, token };
  }

  async login(loginInput: LoginInput) {
    const { email, password } = loginInput;

    // Find user with password
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate token
    const token = this.jwtService.sign({
      userId: user.id,
      email: user.email,
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }
}