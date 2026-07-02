import type { CreateUserInput, UserRepository } from '@/core/repositories/user.repository';
import { prisma } from './prisma';

export class PrismaUserRepository implements UserRepository {
  create(input: CreateUserInput) {
    return prisma.user.create({ data: input });
  }

  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  async setResetToken(id: string, token: string, expires: Date) {
    await prisma.user.update({ where: { id }, data: { resetToken: token, resetTokenExpires: expires } });
  }

  findByResetToken(token: string) {
    return prisma.user.findFirst({ where: { resetToken: token, resetTokenExpires: { gt: new Date() } } });
  }

  async updatePassword(id: string, passwordHash: string) {
    await prisma.user.update({ where: { id }, data: { passwordHash, resetToken: null, resetTokenExpires: null } });
  }

  async touchLastLogin(id: string) {
    await prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
  }
}
