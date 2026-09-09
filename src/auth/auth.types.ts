import type { Request } from 'express';

export type UserRole = 'CUSTOMER' | 'STAFF' | 'ADMIN';

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export type AuthenticatedRequest = Request & { user: SessionUser };
