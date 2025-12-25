import { Request } from 'express';

export type AuthenticatedUser = Record<string, unknown> & {
  sub: string;
  email?: string;
};

export interface RequestContext extends Request {
  requestId?: string;
  user?: AuthenticatedUser;
  refreshToken?: string;
  effectivePermissions?: Set<string>;
}
