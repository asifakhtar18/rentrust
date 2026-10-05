import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;

export class RegisterDto {
  @ApiProperty({ example: 'resident@example.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({
    example: 'Str0ngPassphrase',
    description: 'Min 10 chars, with upper, lower, and a digit.',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  @Matches(PASSWORD_RULE, {
    message: 'Password must be at least 10 characters and include upper, lower, and a number.',
  })
  password!: string;

  @ApiPropertyOptional({ example: 'Asha' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  displayName?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'resident@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Str0ngPassphrase' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class RefreshDto {
  @ApiProperty({ description: 'Opaque refresh token issued at login.' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class VerifyEmailDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class RequestPasswordResetDto {
  @ApiProperty({ example: 'resident@example.com' })
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ example: 'N3wStr0ngPass' })
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  @Matches(PASSWORD_RULE, {
    message: 'Password must be at least 10 characters and include upper, lower, and a number.',
  })
  password!: string;
}

export class AuthTokensDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ description: 'Access token lifetime in seconds.' })
  expiresIn!: number;
}
