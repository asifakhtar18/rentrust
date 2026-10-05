import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to users holding at least one of the given roles. Enforced
 * by RolesGuard. Authorization is always server-side; the frontend never
 * decides access.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
