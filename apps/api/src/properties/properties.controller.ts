import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PropertiesService } from './properties.service';
import {
  AdminListPropertiesQuery,
  CreatePropertyDto,
  ListPropertiesQuery,
  NearbyPropertiesQuery,
  PropertyMapBoundsQuery,
  PropertySimilarityQuery,
  UpdatePropertyDto,
} from './dto/property.dto';
import { CreatePropertyImageDto, PropertyImageUploadDto } from './dto/property-image.dto';
import {
  CreatePropertyContributionDto,
  ReviewPropertyContributionDto,
} from './dto/property-contribution.dto';

@ApiTags('properties')
@Controller({ path: 'properties', version: '1' })
export class PropertiesController {
  constructor(private readonly properties: PropertiesService) {}

  @Post('contributions')
  @ApiOperation({ summary: 'Suggest a property, correction, or photo for staff review' })
  async submitContribution(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePropertyContributionDto,
  ) {
    return { data: await this.properties.submitContribution(userId, dto) };
  }

  @Get('contributions/mine')
  @ApiOperation({ summary: "List the current user's property contributions" })
  async myContributions(@CurrentUser('id') userId: string) {
    return { data: await this.properties.listMyContributions(userId) };
  }

  @Roles(UserRole.ADMIN)
  @Get('contributions/admin/queue')
  @ApiOperation({ summary: 'List pending property contributions for administrators' })
  async contributionQueue() {
    return { data: await this.properties.listContributionQueue() };
  }

  @Roles(UserRole.ADMIN)
  @Post('contributions/:id/review')
  @ApiOperation({ summary: 'Approve or reject a property contribution' })
  async reviewContribution(
    @CurrentUser('id') reviewerId: string,
    @Param('id') id: string,
    @Body() dto: ReviewPropertyContributionDto,
  ) {
    return { data: await this.properties.reviewContribution(reviewerId, id, dto) };
  }

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
  @Get('map')
  @Header('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300')
  @ApiOperation({ summary: 'List active property pins in the visible map bounds' })
  async map(@Query() query: PropertyMapBoundsQuery) {
    const result = await this.properties.mapPins(query);
    return { data: result.items, meta: { truncated: result.truncated, limit: 1_000 } };
  }

  @Public()
  @Get('similar')
  @ApiOperation({ summary: 'Find possible duplicate properties by name and place' })
  async similar(@Query() query: PropertySimilarityQuery) {
    return { data: await this.properties.findSimilar(query) };
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/list')
  @ApiOperation({ summary: 'List properties for the admin catalogue' })
  async adminList(@Query() query: AdminListPropertiesQuery) {
    const page = await this.properties.adminList(query);
    return {
      data: {
        items: page.items.map((property) => ({
          ...this.properties.toPublic(property),
          mergedIntoId: property.mergedIntoId,
          localityName: property.locality
            ? `${property.locality.name}, ${property.locality.city.name}`
            : null,
        })),
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
      },
    };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a property profile with score and relations' })
  async detail(@Param('id') id: string) {
    return { data: await this.properties.getDetail(id) };
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/images/upload-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a presigned URL to upload a property photo (admin)' })
  async imageUploadUrl(@Param('id') id: string, @Body() dto: PropertyImageUploadDto) {
    return {
      data: await this.properties.requestImageUpload(id, dto.contentType, dto.sizeBytes),
    };
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/images')
  @ApiOperation({ summary: 'Add an uploaded property photo (admin)' })
  async addImage(@Param('id') id: string, @Body() dto: CreatePropertyImageDto) {
    const image = await this.properties.addImage(id, dto);
    return { data: { id: image.id, altText: image.altText } };
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a property photo (admin)' })
  async deleteImage(@Param('id') id: string, @Param('imageId') imageId: string) {
    await this.properties.deleteImage(id, imageId);
    return { data: { deleted: true } };
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
