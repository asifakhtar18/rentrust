import { Inject, Injectable } from '@nestjs/common';
import { SEARCH_PROVIDER, SearchProvider, SearchResult } from './search.interface';
import { SearchQueryDto } from './dto/search.dto';

/**
 * Thin facade over the configured SearchProvider. Keeps controllers free of
 * provider details and gives a single place to add cross-cutting concerns
 * (analytics events, caching) later without changing the provider contract.
 */
@Injectable()
export class SearchService {
  constructor(@Inject(SEARCH_PROVIDER) private readonly provider: SearchProvider) {}

  search(dto: SearchQueryDto): Promise<SearchResult> {
    return this.provider.search({
      q: dto.q,
      types: dto.types,
      limit: dto.limit,
      latitude: dto.latitude,
      longitude: dto.longitude,
      radiusMeters: dto.radiusMeters,
    });
  }
}
