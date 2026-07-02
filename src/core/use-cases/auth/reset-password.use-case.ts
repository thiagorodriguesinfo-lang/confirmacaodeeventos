import bcrypt from 'bcryptjs';
import type { UserRepository } from '@/core/repositories/user.repository';

export class ResetPasswordUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(token: string, newPassword: string) {
    const user = await this.userRepository.findByResetToken(token);
    if (!user) throw new Error('Token invalido ou expirado');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.userRepository.updatePassword(user.id, passwordHash);
  }
}
