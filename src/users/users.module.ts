// import { Module } from '@nestjs/common';
// import { UsersService } from './users.service';
// import { UsersResolver } from './users.resolver';
// import { PrismaModule } from '../prisma/prisma.module';

// @Module({
//   imports: [PrismaModule],
//   providers: [UsersService, UsersResolver],
//   exports: [UsersService],
// })
// export class UsersModule {}


import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersResolver } from './users.resolver';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module'; 

@Module({
  imports: [PrismaModule, EventsModule],
  providers: [UsersService, UsersResolver],
  exports: [UsersService],
})
export class UsersModule {}
