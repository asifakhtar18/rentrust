import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { isUUID } from 'class-validator';
import { Public } from '../common/decorators/public.decorator';
import { ErrorCode } from '../common/errors/error-codes';
import { NotFoundAppException } from '../common/errors/app.exception';
import { LandlordsService } from './landlords.service';

@ApiTags('landlords')
@Controller({ path: 'landlords', version: '1' })
export class LandlordsController {
  constructor(private readonly landlords: LandlordsService) {}

  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'Get a landlord profile based on published, residency-verified reviews',
  })
  async getProfile(@Param('id') id: string) {
    if (!isUUID(id)) throw new NotFoundAppException('Landlord not found', ErrorCode.NOT_FOUND);
    return { data: await this.landlords.getProfile(id) };
  }
}
