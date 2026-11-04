// Adapted from /common/legos/preact/auth-forms@1.0.0 (dvk-common 8a62bd5). Owned by this project.
// Origin: ssr-website-auth-astro-template - website/src/components/account/ChangePasswordForm.tsx (ff4d19d). Lego auth-forms.
import { useState } from "preact/hooks";
import { Alert, Button, Input } from "~/components/ui";
import { checkNewPassword, useFormAction } from "./api";
import { authLabels, type AuthLabels } from "./labels";
import { PASSWORD_HINT, validatePassword } from "./validation";

export interface ChangePasswordFormProps {
  /** API route: POST currentPassword, newPassword, confirmPassword. */
  action?: string;
  passwordRules?: (password: string) => string | null;
  passwordHint?: string;
  labels?: Partial<AuthLabels>;
}

export function ChangePasswordForm({
  action = "/api/account/change-password",
  passwordRules = validatePassword,
  passwordHint = PASSWORD_HINT,
  labels,
}: ChangePasswordFormProps) {
  const t = authLabels(labels);
  const [changed, setChanged] = useState(false);
  const { loading, error, onSubmit } = useFormAction(action, {
    onStart: () => setChanged(false),
    validate: (form) => checkNewPassword(form, "newPassword", t.passwordsDoNotMatch, passwordRules),
    onSuccess: (_data, form) => {
      setChanged(true);
      form.reset();
    },
  });

  return (
    <form class="space-y-6" onSubmit={onSubmit} noValidate>
      {error && <Alert type="error">{error}</Alert>}
      {changed && <Alert type="success">{t.passwordChanged}</Alert>}
      <Input
        id="currentPassword"
        name="currentPassword"
        type="password"
        label={t.currentPassword}
        autocomplete="current-password"
        required
      />
      <Input
        id="newPassword"
        name="newPassword"
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
      <div class="flex justify-end">
        <Button type="submit" loading={loading}>
          {t.changePassword}
        </Button>
      </div>
    </form>
  );
}
