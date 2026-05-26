import { LoginContent } from '@/auth/login-content';
import { AppProviders } from '@/app/app-providers';

export default function LoginPage() {
  return (
    <AppProviders>
      <LoginContent />
    </AppProviders>
  );
}
