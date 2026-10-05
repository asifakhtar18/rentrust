import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';

/**
 * Authentication module. JwtModule is registered empty here because secrets and
 * TTLs are resolved per-operation from ConfigService (access vs refresh use
 * different secrets), keeping all config in one typed place.
 */
@Module({
  imports: [UsersModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, TokenService],
  exports: [AuthService, TokenService, PasswordService],
})
export class AuthModule {}
