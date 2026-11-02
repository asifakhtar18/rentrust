import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { isUUID } from 'class-validator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BadRequestAppException } from '../common/errors/app.exception';
import { EngagementService } from './engagement.service';

@ApiTags('engagement')
@Controller({ version: '1' })
export class EngagementController {
  constructor(private readonly engagement: EngagementService) {}

  @ApiBearerAuth()
  @Post('properties/:propertyId/save')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save a property' })
  async save(@CurrentUser('id') userId: string, @Param('propertyId') propertyId: string) {
    await this.engagement.save(userId, propertyId);
    return { data: { saved: true } };
  }

  @ApiBearerAuth()
  @Delete('properties/:propertyId/save')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a saved property' })
  async unsave(@CurrentUser('id') userId: string, @Param('propertyId') propertyId: string) {
    await this.engagement.unsave(userId, propertyId);
    return { data: { saved: false } };
  }

  @ApiBearerAuth()
  @Get('me/saved')
  @ApiOperation({ summary: 'List saved properties with scores' })
  async saved(@CurrentUser('id') userId: string) {
    return { data: await this.engagement.listSaved(userId) };
  }

  @Public()
  @Get('compare')
  @ApiOperation({ summary: 'Compare 2-4 properties by trust score (ids=comma,separated)' })
  async compare(@Query('ids') ids?: string | string[]) {
    const list = (Array.isArray(ids) ? ids : [ids ?? ''])
      .flatMap((value) => value.split(','))
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length === 0) {
      throw new BadRequestAppException('Provide ids as a comma-separated list.');
    }
    if (list.some((id) => !isUUID(id))) {
      throw new BadRequestAppException('Compare between 2 and 4 property ids.');
    }
    return { data: await this.engagement.compare(list) };
  }
}
