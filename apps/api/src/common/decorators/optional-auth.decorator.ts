import { SetMetadata } from '@nestjs/common';

export const IS_OPTIONAL_AUTH_KEY = 'isOptionalAuth';

/**
 * Marks a route as working for both anonymous and authenticated callers. The
 * JWT guard attaches the user when a valid token is present but does not reject
 * anonymous requests. Used by public read endpoints that personalise output
 * (e.g. "is this property saved by me?").
 */
export const OptionalAuth = () => SetMetadata(IS_OPTIONAL_AUTH_KEY, true);
