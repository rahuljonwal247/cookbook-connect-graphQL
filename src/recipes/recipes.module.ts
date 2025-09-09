// import { Module } from '@nestjs/common';
// import { RecipesService } from './recipes.service';
// import { RecipesResolver } from './recipes.resolver';
// import { RatingsService } from '../ratings/ratings.service';
// import { CommentsService } from '../comments/comments.service';
// import { PrismaModule } from '../prisma/prisma.module';
// import { CustomElasticsearchModule } from '../elasticsearch/elasticsearch.module';



// @Module({
//   imports: [PrismaModule,CustomElasticsearchModule], 
//   providers: [RecipesService, RecipesResolver, RatingsService, CommentsService],
//   exports: [RecipesService],
// })
// export class RecipesModule {}


import { Module } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { RecipesResolver } from './recipes.resolver';
import { RatingsService } from '../ratings/ratings.service';
import { CommentsService } from '../comments/comments.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CustomElasticsearchModule } from '../elasticsearch/elasticsearch.module';
import { EventsModule } from '../events/events.module'; // ✅ import EventsModule

@Module({
  imports: [PrismaModule, CustomElasticsearchModule, EventsModule], // ✅ include EventsModule
  providers: [RecipesService, RecipesResolver, RatingsService, CommentsService],
  exports: [RecipesService],
})
export class RecipesModule {}

