import type { User, UserRole } from '@prisma/client';

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  role?: UserRole;
}

export interface UserRepository {
  create(input: CreateUserInput): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  setResetToken(id: string, token: string, expires: Date): Promise<void>;
  findByResetToken(token: string): Promise<User | null>;
  updatePassword(id: string, passwordHash: string): Promise<void>;
  touchLastLogin(id: string): Promise<void>;
}
