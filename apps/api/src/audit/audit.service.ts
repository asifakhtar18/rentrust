import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface AuditEntry {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}

/**
 * Append-only audit trail for sensitive actions (moderation, verification and
 * claim decisions, admin actions, document access). Writes NEVER include
 * secrets, tokens, passwords, or document contents — only identifiers and small
 * structured metadata. Audit failures must not break the primary operation, so
 * errors are logged and swallowed.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: entry.actorId ?? null,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          metadata: entry.metadata ? (entry.metadata as object) : undefined,
          ip: entry.ip,
        },
      });
    } catch (err) {
      this.logger.error({ err, action: entry.action }, 'Failed to write audit log');
    }
  }

  /** Reads the audit trail for an entity, newest first (admin use). */
  listForEntity(entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
