import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Confirmação de Eventos</h1>
          <p className="text-sm text-muted-foreground">Entre para gerenciar seus eventos e convidados</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
