import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';

/**
 * Global audit module. Many domains (verification, moderation, claims, admin)
 * write to the audit trail, so AuditService is provided once and exported
 * globally.
 */
@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
