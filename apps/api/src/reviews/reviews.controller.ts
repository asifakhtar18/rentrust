import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReviewsService } from './reviews.service';
import { ListReviewsQuery, SubmitReviewDto } from './dto/review.dto';

@ApiTags('reviews')
@Controller({ version: '1' })
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Public()
  @Get('properties/:propertyId/reviews')
  @ApiOperation({ summary: 'List published, anonymised reviews for a property' })
  async listForProperty(@Param('propertyId') propertyId: string, @Query() query: ListReviewsQuery) {
    const page = await this.reviews.listPublicForProperty(propertyId, query);
    return {
      data: page.items,
      meta: { nextCursor: page.nextCursor, hasMore: page.hasMore },
    };
  }

  @Public()
  @Get('reviews/:id')
  @ApiOperation({ summary: 'Get a single published review (anonymised)' })
  async getOne(@Param('id') id: string) {
    return { data: await this.reviews.getPublicById(id) };
  }

  @ApiBearerAuth()
  @Post('reviews')
  @ApiOperation({ summary: 'Submit a structured review (goes to moderation)' })
  async submit(@CurrentUser('id') userId: string, @Body() dto: SubmitReviewDto) {
    const review = await this.reviews.submit(userId, dto);
    return { data: { id: review.id, status: review.status } };
  }

  @ApiBearerAuth()
  @Get('me/reviews')
  @ApiOperation({ summary: "List the authenticated user's own reviews (all statuses)" })
  async mine(@CurrentUser('id') userId: string) {
    return { data: await this.reviews.listMine(userId) };
  }

  @ApiBearerAuth()
  @Post('reviews/:id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a saved draft for moderation' })
  async submitDraft(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const review = await this.reviews.submitDraft(userId, id);
    return { data: { id: review.id, status: review.status } };
  }

  @ApiBearerAuth()
  @Delete('reviews/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw your own review' })
  async withdraw(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.reviews.withdraw(userId, id);
    return { data: { withdrawn: true } };
  }
}
