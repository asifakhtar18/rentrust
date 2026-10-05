import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PropertiesService } from './properties.service';
import {
  CreatePropertyDto,
  ListPropertiesQuery,
  NearbyPropertiesQuery,
  UpdatePropertyDto,
} from './dto/property.dto';

@ApiTags('properties')
@Controller({ path: 'properties', version: '1' })
export class PropertiesController {
  constructor(private readonly properties: PropertiesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List properties (cursor paginated)' })
  async list(@Query() query: ListPropertiesQuery) {
    const page = await this.properties.list(query);
    return {
      data: page.items.map((p) => this.properties.toPublic(p)),
      meta: { nextCursor: page.nextCursor, hasMore: page.hasMore },
    };
  }

  @Public()
  @Get('nearby')
  @ApiOperation({ summary: 'Find properties within a radius (PostGIS)' })
  async nearby(@Query() query: NearbyPropertiesQuery) {
    const rows = await this.properties.nearby(query);
    return {
      data: rows.map((p) => ({
        ...this.properties.toPublic(p),
        distanceMeters: Math.round(p.distanceMeters),
      })),
    };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a property profile with score and relations' })
  async detail(@Param('id') id: string) {
    return { data: await this.properties.getDetail(id) };
  }

  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a property (admin)' })
  async create(@Body() dto: CreatePropertyDto) {
    const property = await this.properties.create(dto);
    return { data: this.properties.toPublic(property) };
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a property (admin)' })
  async update(@Param('id') id: string, @Body() dto: UpdatePropertyDto) {
    const property = await this.properties.update(id, dto);
    return { data: this.properties.toPublic(property) };
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a property (admin)' })
  async remove(@Param('id') id: string) {
    await this.properties.softDelete(id);
    return { data: { deleted: true } };
  }
}
