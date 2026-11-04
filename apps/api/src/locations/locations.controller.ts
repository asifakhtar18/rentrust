import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { OffsetPaginationQuery } from '../common/dto/pagination.dto';
import { LocationsService } from './locations.service';
import { CreateCityDto, CreateLocalityDto, ResolveGoogleMapsDto } from './dto/location.dto';
import {
  CreateLocalitySuggestionDto,
  ReviewLocalitySuggestionDto,
} from './dto/locality-suggestion.dto';
import { DecideLocalityReviewDto, SubmitLocalityReviewDto } from './dto/locality-review.dto';

@ApiTags('locations')
@Controller({ version: '1' })
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Public()
  @Post('locations/maps/resolve')
  @ApiOperation({ summary: 'Resolve a Google Maps URL to coordinates and a city' })
  async resolveMapsLink(@Body() dto: ResolveGoogleMapsDto) {
    return { data: await this.locations.resolveGoogleMapsLink(dto) };
  }

  @Public()
  @Get('countries')
  @ApiOperation({ summary: 'List countries' })
  async countries() {
    return { data: await this.locations.listCountries() };
  }

  @Public()
  @Get('countries/:countryId/states')
  @ApiOperation({ summary: 'List states in a country' })
  async states(@Param('countryId') countryId: string) {
    return { data: await this.locations.listStates(countryId) };
  }

  @Public()
  @Get('cities')
  @ApiOperation({ summary: 'List active cities' })
  async cities() {
    return { data: await this.locations.listCities({ activeOnly: true }) };
  }

  @Public()
  @Get('localities')
  @ApiOperation({ summary: 'List localities, optionally filtered by city' })
  async localities(@Query('cityId') cityId?: string) {
    return { data: await this.locations.listLocalities(cityId) };
  }

  @Public()
  @Get('locality-suggestions/stats')
  async localitySuggestionStats() {
    return { data: await this.locations.communityStats() };
  }

  @Post('locality-suggestions')
  async suggestLocality(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateLocalitySuggestionDto,
  ) {
    return { data: await this.locations.submitLocalitySuggestion(userId, dto) };
  }

  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @Get('locality-suggestions/admin/queue')
  async localitySuggestionQueue(@Query() query: OffsetPaginationQuery) {
    return { data: await this.locations.listLocalitySuggestions(query) };
  }

  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @Post('locality-suggestions/:id/review')
  async reviewLocalitySuggestion(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: ReviewLocalitySuggestionDto,
  ) {
    return { data: await this.locations.reviewLocalitySuggestion(userId, id, dto) };
  }

  @Post('localities/:id/reviews')
  @ApiOperation({ summary: 'Submit an area experience review for moderation' })
  async submitLocalityReview(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: SubmitLocalityReviewDto,
  ) {
    return { data: await this.locations.submitLocalityReview(userId, id, dto) };
  }

  @Public()
  @Get('localities/:id/reviews')
  @ApiOperation({ summary: 'List published anonymous area reviews' })
  async listLocalityReviews(@Param('id') id: string) {
    return { data: await this.locations.listPublicLocalityReviews(id) };
  }

  @Get('me/locality-reviews')
  @ApiOperation({ summary: "List the current user's own area reviews" })
  async myLocalityReviews(@CurrentUser('id') userId: string) {
    return { data: await this.locations.listMyLocalityReviews(userId) };
  }

  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @Get('locality-reviews/admin/queue')
  @ApiOperation({ summary: 'List area reviews waiting for moderation' })
  async localityReviewQueue() {
    return { data: await this.locations.listLocalityReviewQueue() };
  }

  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @Post('locality-reviews/:id/decision')
  @ApiOperation({ summary: 'Publish or reject an area review' })
  async decideLocalityReview(
    @CurrentUser('id') reviewerId: string,
    @Param('id') id: string,
    @Body() dto: DecideLocalityReviewDto,
  ) {
    return { data: await this.locations.decideLocalityReview(reviewerId, id, dto) };
  }

  @Public()
  @Get('localities/:id')
  @ApiOperation({ summary: 'Locality intelligence: aggregated resident sentiment' })
  async localityIntelligence(@Param('id') id: string) {
    return { data: await this.locations.getLocalityIntelligence(id) };
  }

  @Roles(UserRole.ADMIN)
  @Post('cities')
  @ApiOperation({ summary: 'Create a city (admin)' })
  async createCity(@Body() dto: CreateCityDto) {
    return { data: await this.locations.createCity(dto) };
  }

  @Roles(UserRole.ADMIN)
  @Post('localities')
  @ApiOperation({ summary: 'Create a locality (admin)' })
  async createLocality(@Body() dto: CreateLocalityDto) {
    return { data: await this.locations.createLocality(dto) };
  }
}
