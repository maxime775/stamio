import { AuthBrowserGate } from "@/components/AuthBrowserGate";
import { PageShell } from "@/components/PageShell";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <AuthBrowserGate next="signin">
      <PageShell compact>
        <LoginForm />
      </PageShell>
    </AuthBrowserGate>
  );
}
