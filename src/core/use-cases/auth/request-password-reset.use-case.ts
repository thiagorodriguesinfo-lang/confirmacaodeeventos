import crypto from 'crypto';
import type { UserRepository } from '@/core/repositories/user.repository';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

export class RequestPasswordResetUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(email: string): Promise<string | null> {
    const user = await this.userRepository.findByEmail(email.toLowerCase());
    if (!user) return null; // nao revela se o e-mail existe (evita enumeracao de usuarios)

    const token = crypto.randomBytes(32).toString('hex');
    await this.userRepository.setResetToken(user.id, token, new Date(Date.now() + TOKEN_TTL_MS));
    return token;
  }
}
