import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

/**
 * Users module. Exposes UsersService to other modules (auth, admin) while
 * keeping persistence details encapsulated.
 */
@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
