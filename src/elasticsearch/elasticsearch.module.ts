import { Module } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { ElasticsearchService } from './elasticsearch.service';

@Module({
  imports: [
    ElasticsearchModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        node: configService.get('ELASTICSEARCH_NODE'),
        maxRetries: 10,
        requestTimeout: 60000,
        sniffOnStart: false,
      }),
    }),
  ],
  providers: [ElasticsearchService],
  exports: [ElasticsearchService],
})
export class CustomElasticsearchModule {}

