import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search.dto';

@ApiTags('search')
@Controller({ path: 'search', version: '1' })
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Unified search across properties, landlords, and localities' })
  async run(@Query() dto: SearchQueryDto) {
    const result = await this.search.search(dto);
    return { data: result.hits, meta: { query: result.query, count: result.hits.length } };
  }
}
