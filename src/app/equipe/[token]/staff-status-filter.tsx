'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pendente' },
  { value: 'SENT', label: 'Enviado' },
  { value: 'CONFIRMED', label: 'Confirmado' },
  { value: 'DECLINED', label: 'Recusado' },
  { value: 'NO_RESPONSE', label: 'Sem resposta' },
];

export function StaffStatusFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = searchParams.getAll('status');

  function toggle(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.getAll('status');
    params.delete('status');
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    next.forEach((v) => params.append('status', v));
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {STATUS_OPTIONS.map((opt) => (
        <label
          key={opt.value}
          className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs has-[:checked]:border-primary has-[:checked]:bg-primary/5"
        >
          <input type="checkbox" checked={selected.includes(opt.value)} onChange={() => toggle(opt.value)} />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
