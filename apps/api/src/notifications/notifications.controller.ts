import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "List the current user's in-app notifications" })
  async list(@CurrentUser('id') userId: string, @Query('unreadOnly') unreadOnly?: string) {
    const items = await this.notifications.listForUser(userId, unreadOnly === 'true');
    const unread = await this.notifications.unreadCount(userId);
    return { data: items, meta: { unread } };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications read' })
  async readAll(@CurrentUser('id') userId: string) {
    await this.notifications.markAllRead(userId);
    return { data: { ok: true } };
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark one notification read' })
  async read(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.notifications.markRead(userId, id);
    return { data: { ok: true } };
  }
}
