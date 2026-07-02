import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return phone;
  const country = digits.slice(0, digits.length - 11);
  const ddd = digits.slice(-11, -9);
  const first = digits.slice(-9, -5);
  const second = digits.slice(-5);
  return `+${country || '55'} (${ddd}) ${first}-${second}`;
}
