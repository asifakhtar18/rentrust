import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { FastifyRequest } from 'fastify';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { BadRequestAppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { VerificationService } from './verification.service';
import {
  CreateVerificationDto,
  DecideVerificationDto,
  RequestUploadUrlDto,
} from './dto/verification.dto';

@ApiTags('verification')
@ApiBearerAuth()
@Controller({ path: 'verifications', version: '1' })
export class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Post('upload-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a presigned URL to upload a verification document' })
  async uploadUrl(@CurrentUser('id') userId: string, @Body() dto: RequestUploadUrlDto) {
    return { data: await this.verification.requestUploadUrl(userId, dto) };
  }

  @Post('upload-image')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Upload an image document (compressed + EXIF-stripped server-side)',
  })
  async uploadImage(@CurrentUser('id') userId: string, @Req() req: FastifyRequest) {
    const mp = req as FastifyRequest & {
      file?: () => Promise<{ toBuffer: () => Promise<Buffer>; mimetype: string } | undefined>;
    };
    if (typeof mp.file !== 'function') {
      throw new BadRequestAppException('Expected a multipart file upload.');
    }
    const file = await mp.file();
    if (!file) {
      throw new BadRequestAppException('No file provided.');
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestAppException(
        'Only JPEG, PNG, or WebP images can be uploaded here.',
        ErrorCode.INVALID_FILE_TYPE,
      );
    }
    const buffer = await file.toBuffer();
    const ref = await this.verification.uploadCompressedImage(userId, buffer, file.mimetype);
    return { data: ref };
  }

  @Post()
  @ApiOperation({ summary: 'Create a verification request with uploaded documents' })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateVerificationDto) {
    const request = await this.verification.create(userId, dto);
    return { data: { id: request.id, status: request.status } };
  }

  @Get('mine')
  @ApiOperation({ summary: "List the authenticated user's verification requests" })
  async mine(@CurrentUser('id') userId: string) {
    return { data: await this.verification.listMine(userId) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get the status of your verification request (no document URLs)' })
  async getOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return { data: await this.verification.getMyRequest(userId, id) };
  }

  // ----- Moderator / admin -----

  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @Get('admin/queue')
  @ApiOperation({ summary: 'List pending verification requests (moderator/admin)' })
  async queue() {
    return { data: await this.verification.listPending() };
  }

  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @Get('admin/documents/:documentId/download')
  @ApiOperation({
    summary: 'Get a short-lived signed download URL for a document (moderator/admin)',
  })
  async download(@CurrentUser('id') reviewerId: string, @Param('documentId') documentId: string) {
    return { data: await this.verification.getDocumentDownloadUrl(reviewerId, documentId) };
  }

  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @Post(':id/decision')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve or reject a verification request (moderator/admin)' })
  async decide(
    @CurrentUser('id') reviewerId: string,
    @Param('id') id: string,
    @Body() dto: DecideVerificationDto,
  ) {
    const request = await this.verification.decide(
      reviewerId,
      id,
      dto.decision,
      dto.rejectionReason,
    );
    return { data: { id: request.id, status: request.status } };
  }
}
