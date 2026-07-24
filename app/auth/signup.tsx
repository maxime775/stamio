import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { SignupForm } from "@/components/SignupForm";
import { SignupPhoneVerification } from "@/components/SignupPhoneVerification";

export default function SignupPage() {
  const [phoneVerificationToken, setPhoneVerificationToken] = useState<string | null>(null);
  return (
    <PageShell compact>
      {phoneVerificationToken ? (
        <SignupForm phoneVerificationToken={phoneVerificationToken} />
      ) : (
        <SignupPhoneVerification onContinue={(_phone, token) => setPhoneVerificationToken(token)} />
      )}
    </PageShell>
  );
}
