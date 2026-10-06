import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { PostgresSearchProvider } from './postgres-search.provider';
import { SEARCH_PROVIDER } from './search.interface';

/**
 * Search module. Binds the SearchProvider token to the PostgreSQL
 * implementation; swapping to Elasticsearch later is a one-line provider
 * change here.
 */
@Module({
  controllers: [SearchController],
  providers: [
    SearchService,
    PostgresSearchProvider,
    { provide: SEARCH_PROVIDER, useExisting: PostgresSearchProvider },
  ],
  exports: [SearchService],
})
export class SearchModule {}
