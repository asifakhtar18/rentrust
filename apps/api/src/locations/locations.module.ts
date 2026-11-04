import { Module } from '@nestjs/common';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  controllers: [LocationsController],
  imports: [NotificationsModule],
  providers: [LocationsService],
  exports: [LocationsService],
})
export class LocationsModule {}
