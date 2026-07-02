import { listUsersAction } from '@/actions/user.actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreateUserForm } from './create-user-form';
import { ToggleUserButton } from './toggle-user-button';

export default async function UsersPage() {
  const users = await listUsersAction();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
        <p className="text-sm text-muted-foreground">Gerencie administradores e operadores do painel</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Novo usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateUserForm />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Papel</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{user.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>{user.role === 'ADMIN' ? 'Admin' : 'Operador'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.isActive ? 'success' : 'destructive'}>{user.isActive ? 'Ativo' : 'Inativo'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ToggleUserButton userId={user.id} isActive={user.isActive} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
