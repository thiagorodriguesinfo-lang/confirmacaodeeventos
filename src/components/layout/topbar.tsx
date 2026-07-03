import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';
import { MobileNav } from './mobile-nav';

export async function Topbar() {
  const session = await getServerSession(authOptions);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <MobileNav />
      <div className="flex items-center gap-3">
        <ThemeToggle />
        {session?.user && <UserMenu name={session.user.name ?? ''} email={session.user.email ?? ''} role={session.user.role} />}
      </div>
    </header>
  );
}
