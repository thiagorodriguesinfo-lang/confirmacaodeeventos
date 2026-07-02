'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'PENDING', label: 'Pendente' },
  { value: 'SENT', label: 'Enviado' },
  { value: 'CONFIRMED', label: 'Confirmado' },
  { value: 'DECLINED', label: 'Recusado' },
  { value: 'NO_RESPONSE', label: 'Sem resposta' },
];

export function GuestFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Input
        placeholder="Buscar por nome ou telefone..."
        defaultValue={searchParams.get('search') ?? ''}
        className="max-w-xs"
        onChange={(e) => {
          const value = e.target.value;
          updateParam('search', value);
        }}
      />
      <select
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        defaultValue={searchParams.get('status') ?? ''}
        onChange={(e) => updateParam('status', e.target.value)}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
