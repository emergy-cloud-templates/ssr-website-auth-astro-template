// Adapted from /common/legos/preact/auth-forms@1.0.0 (dvk-common 8a62bd5). Owned by this project.
// Origin: ssr-website-auth-astro-template - website/src/components/auth/ResetPasswordForm.tsx (ff4d19d). Lego auth-forms.
import { useState } from "preact/hooks";
import { Alert, Button, Input } from "~/components/ui";
import { useFormAction } from "./api";
import { authLabels, type AuthLabels } from "./labels";

export interface ResetPasswordFormProps {
  /** API route: POST email -> 200 whether or not the account exists (no account enumeration). */
  action?: string;
  labels?: Partial<AuthLabels>;
}

export function ResetPasswordForm({ action = "/api/auth/reset-password", labels }: ResetPasswordFormProps) {
  const t = authLabels(labels);
  const [sent, setSent] = useState(false);
  const { loading, error, onSubmit } = useFormAction(action, { onSuccess: () => setSent(true) });

  if (sent) return <Alert type="success">{t.resetSent}</Alert>;

  return (
    <form class="space-y-6" onSubmit={onSubmit} noValidate>
      {error && <Alert type="error">{error}</Alert>}
      <Input id="email" name="email" type="email" label={t.email} autocomplete="email" required />
      <Button type="submit" loading={loading} fullWidth>
        {t.sendResetLink}
      </Button>
    </form>
  );
}
