// Adapted from /common/legos/preact/auth-forms@1.0.0 (dvk-common 8a62bd5). Owned by this project.
// Origin: ssr-website-auth-astro-template - website/src/components/auth/UpdatePasswordForm.tsx (ff4d19d). Lego auth-forms.
import { useState } from "preact/hooks";
import { Alert, Button, Input } from "~/components/ui";
import { checkNewPassword, useFormAction } from "./api";
import { authLabels, type AuthLabels } from "./labels";
import { PASSWORD_HINT, validatePassword } from "./validation";

export interface UpdatePasswordFormProps {
  /** API route (from the reset link's session): POST password, confirmPassword. */
  action?: string;
  /** Where the success screen sends the user. */
  continueHref?: string;
  passwordRules?: (password: string) => string | null;
  passwordHint?: string;
  labels?: Partial<AuthLabels>;
}

export function UpdatePasswordForm({
  action = "/api/auth/update-password",
  continueHref = "/dashboard",
  passwordRules = validatePassword,
  passwordHint = PASSWORD_HINT,
  labels,
}: UpdatePasswordFormProps) {
  const t = authLabels(labels);
  const [done, setDone] = useState(false);
  const { loading, error, onSubmit } = useFormAction(action, {
    validate: (form) => checkNewPassword(form, "password", t.passwordsDoNotMatch, passwordRules),
    onSuccess: () => setDone(true),
  });

  if (done) {
    return (
      <div class="space-y-6">
        <Alert type="success">{t.passwordUpdated}</Alert>
        <Button href={continueHref} fullWidth>
          {t.continueAfterUpdate}
        </Button>
      </div>
    );
  }

  return (
    <form class="space-y-6" onSubmit={onSubmit} noValidate>
      {error && <Alert type="error">{error}</Alert>}
      <Input
        id="password"
        name="password"
        type="password"
        label={t.newPassword}
        autocomplete="new-password"
        hint={passwordHint}
        required
      />
      <Input
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        label={t.confirmNewPassword}
        autocomplete="new-password"
        required
      />
      <Button type="submit" loading={loading} fullWidth>
        {t.updatePassword}
      </Button>
    </form>
  );
}
