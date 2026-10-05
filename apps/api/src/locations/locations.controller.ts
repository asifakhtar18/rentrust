import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { LocationsService } from './locations.service';
import { CreateCityDto, CreateLocalityDto } from './dto/location.dto';

@ApiTags('locations')
@Controller({ version: '1' })
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

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
