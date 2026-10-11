import type { PublicUser } from "../app/auth/auth.service.js";

declare global {
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}

export {};
