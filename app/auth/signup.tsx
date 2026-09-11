import { AuthBrowserGate } from "@/components/AuthBrowserGate";
import { PageShell } from "@/components/PageShell";
import { SignupForm } from "@/components/SignupForm";

export default function SignupPage() {
  return (
    <AuthBrowserGate next="signup">
      <PageShell compact>
        <SignupForm />
      </PageShell>
    </AuthBrowserGate>
  );
}
