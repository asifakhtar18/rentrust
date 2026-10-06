import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestUploadUrlDto } from '../verification/dto/verification.dto';
import { ClaimsService } from './claims.service';
import { CreateClaimDto, DecideClaimDto, OwnerResponseDto } from './dto/claim.dto';

@ApiTags('claims')
@Controller({ version: '1' })
export class ClaimsController {
  constructor(private readonly claims: ClaimsService) {}

  @ApiBearerAuth()
  @Post('claims/upload-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a presigned URL to upload a claim document' })
  async uploadUrl(@CurrentUser('id') userId: string, @Body() dto: RequestUploadUrlDto) {
    return { data: await this.claims.requestUploadUrl(userId, dto.contentType, dto.sizeBytes) };
  }

  @ApiBearerAuth()
  @Post('properties/:propertyId/claim')
  @ApiOperation({ summary: 'Request ownership/management of a property' })
  async create(
    @CurrentUser('id') userId: string,
    @Param('propertyId') propertyId: string,
    @Body() dto: CreateClaimDto,
  ) {
    const claim = await this.claims.create(userId, propertyId, dto);
    return { data: { id: claim.id, status: claim.status } };
  }

  @ApiBearerAuth()
  @Get('claims/mine')
  @ApiOperation({ summary: "List the authenticated user's claims" })
  async mine(@CurrentUser('id') userId: string) {
    return { data: await this.claims.listMine(userId) };
  }

  /** Owner/manager posts a public, labelled response to a review. */
  @ApiBearerAuth()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN)
  @Post('reviews/:reviewId/owner-response')
  @ApiOperation({ summary: 'Add or update an official owner response to a review' })
  async respond(
    @CurrentUser('id') userId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: OwnerResponseDto,
  ) {
    const response = await this.claims.respondToReview(userId, reviewId, dto);
    return { data: { reviewId: response.reviewId, respondedAt: response.createdAt } };
  }

  @Public()
  @Get('reviews/:reviewId/owner-response')
  @ApiOperation({ summary: 'Get the official owner response for a review, if any' })
  async publicResponse(@Param('reviewId') reviewId: string) {
    return { data: await this.claims.getPublicResponse(reviewId) };
  }

  // ----- Admin -----

  @Roles(UserRole.ADMIN)
  @Get('claims/admin/queue')
  @ApiOperation({ summary: 'List pending property claims (admin)' })
  async queue() {
    return { data: await this.claims.listPending() };
  }

  @Roles(UserRole.ADMIN)
  @Get('claims/admin/documents/:documentId/download')
  @ApiOperation({ summary: 'Signed download URL for a claim document (admin)' })
  async download(@CurrentUser('id') reviewerId: string, @Param('documentId') documentId: string) {
    return { data: await this.claims.getDocumentDownloadUrl(reviewerId, documentId) };
  }

  @Roles(UserRole.ADMIN)
  @Post('claims/:claimId/decision')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve or reject a property claim (admin)' })
  async decide(
    @CurrentUser('id') reviewerId: string,
    @Param('claimId') claimId: string,
    @Body() dto: DecideClaimDto,
  ) {
    const claim = await this.claims.decide(reviewerId, claimId, dto.decision, dto.rejectionReason);
    return { data: { id: claim.id, status: claim.status } };
  }
}
