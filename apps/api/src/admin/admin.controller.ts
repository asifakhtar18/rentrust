import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OffsetPaginationQuery } from '../common/dto/pagination.dto';
import { AdminService } from './admin.service';
import {
  CreateLandlordDto,
  CreateManagerDto,
  CsvImportDto,
  LinkLandlordDto,
  UpdateScoreWeightsDto,
  UpdateUserRolesDto,
  UpdateUserStatusDto,
} from './dto/admin.dto';

/**
 * Admin API. Everything here is ADMIN-only (RBAC enforced server-side) and
 * namespaced under /api/v1/admin so it is clearly separated from public and
 * owner surfaces.
 */
@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Aggregated dashboard metrics' })
  async dashboard() {
    return { data: await this.admin.dashboard() };
  }

  // Users
  @Get('users')
  @ApiOperation({ summary: 'List users' })
  async users(@Query() q: OffsetPaginationQuery, @Query('search') search?: string) {
    const r = await this.admin.listUsers({ ...q, search });
    return { data: r.items, meta: { total: r.total, page: r.page, pageSize: r.pageSize } };
  }

  @Put('users/:id/roles')
  @ApiOperation({ summary: "Set a user's roles" })
  async setRoles(
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserRolesDto,
  ) {
    const user = await this.admin.setUserRoles(actorId, id, dto.roles);
    return { data: { id: user.id, roles: user.roles } };
  }

  @Put('users/:id/status')
  @ApiOperation({ summary: 'Activate or suspend a user' })
  async setStatus(
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    const user = await this.admin.setUserStatus(actorId, id, dto.status);
    return { data: { id: user.id, status: user.status } };
  }

  // Landlords & managers
  @Get('landlords')
  @ApiOperation({ summary: 'List landlords' })
  async landlords(@Query() q: OffsetPaginationQuery) {
    const r = await this.admin.listLandlords(q);
    return { data: r.items, meta: { total: r.total, page: r.page, pageSize: r.pageSize } };
  }

  @Post('landlords')
  @ApiOperation({ summary: 'Create a landlord' })
  async createLandlord(@Body() dto: CreateLandlordDto) {
    return { data: await this.admin.createLandlord(dto) };
  }

  @Get('managers')
  @ApiOperation({ summary: 'List property managers' })
  async managers(@Query() q: OffsetPaginationQuery) {
    const r = await this.admin.listManagers(q);
    return { data: r.items, meta: { total: r.total, page: r.page, pageSize: r.pageSize } };
  }

  @Post('managers')
  @ApiOperation({ summary: 'Create a property manager' })
  async createManager(@Body() dto: CreateManagerDto) {
    return { data: await this.admin.createManager(dto) };
  }

  @Post('properties/:propertyId/landlords')
  @ApiOperation({ summary: 'Link a landlord to a property' })
  async linkLandlord(@Param('propertyId') propertyId: string, @Body() dto: LinkLandlordDto) {
    return { data: await this.admin.linkLandlord(propertyId, dto) };
  }

  // Reports & analytics
  @Get('reports')
  @ApiOperation({ summary: 'List review reports' })
  async reports(@Query() q: OffsetPaginationQuery) {
    const r = await this.admin.listReports(q);
    return { data: r.items, meta: { total: r.total, page: r.page, pageSize: r.pageSize } };
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Product analytics summary' })
  async analytics() {
    return { data: await this.admin.analyticsSummary() };
  }

  // CSV import
  @Post('properties/import')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Import properties from CSV (supports dryRun)' })
  async importCsv(@CurrentUser('id') actorId: string, @Body() dto: CsvImportDto) {
    return { data: await this.admin.importPropertiesCsv(actorId, dto) };
  }

  // Settings
  @Get('settings/score-configs')
  @ApiOperation({ summary: 'List trust-score configurations' })
  async scoreConfigs() {
    return { data: await this.admin.listScoreConfigs() };
  }

  @Put('settings/score-weights')
  @ApiOperation({ summary: 'Create/activate a trust-score weight configuration' })
  async scoreWeights(@CurrentUser('id') actorId: string, @Body() dto: UpdateScoreWeightsDto) {
    return { data: await this.admin.updateScoreWeights(actorId, dto) };
  }
}
