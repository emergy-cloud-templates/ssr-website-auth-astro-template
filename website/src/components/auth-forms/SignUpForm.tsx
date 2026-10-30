// Adapted from /common/legos/preact/auth-forms@1.0.0 (dvk-common 8a62bd5). Owned by this project.
// Origin: ssr-website-auth-astro-template - website/src/components/auth/SignUpForm.tsx (ff4d19d), redirect and Google
// sign-in from recapify.app. Lego auth-forms.
import { useState } from "preact/hooks";
import { Alert, Button, Input } from "~/components/ui";
import { checkNewPassword, useFormAction } from "./api";
import { GoogleButton } from "./GoogleButton";
import { authLabels, type AuthLabels } from "./labels";
import { PASSWORD_HINT, validatePassword } from "./validation";

export interface SignUpFormProps {
  /** API route: POST name, email, password, confirmPassword, redirectTo -> { signedIn, redirectTo }. */
  action?: string;
  /** Where to go after signing up (validated again on the server). */
  redirectTo?: string;
  googleHref?: string;
  /** The password policy (default validation.ts); keep it the same as the server's. */
  passwordRules?: (password: string) => string | null;
  passwordHint?: string;
  labels?: Partial<AuthLabels>;
}

export function SignUpForm({
  action = "/api/auth/signup",
  redirectTo,
  googleHref,
  passwordRules = validatePassword,
  passwordHint = PASSWORD_HINT,
  labels,
}: SignUpFormProps) {
  const t = authLabels(labels);
  const [checkEmail, setCheckEmail] = useState(false);
  const { loading, error, onSubmit } = useFormAction<{ signedIn: boolean; redirectTo: string }>(action, {
    validate: (form) => checkNewPassword(form, "password", t.passwordsDoNotMatch, passwordRules),
    onSuccess: (data) => {
      if (data.signedIn) window.location.assign(data.redirectTo);
      else setCheckEmail(true);
    },
  });

  if (checkEmail) return <Alert type="success">{t.checkEmail}</Alert>;

  return (
    <form class="space-y-6" onSubmit={onSubmit} noValidate>
      {error && <Alert type="error">{error}</Alert>}
      {googleHref && <GoogleButton href={googleHref} labels={labels} />}
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
      <Input id="name" name="name" type="text" label={t.fullName} autocomplete="name" required />
      <Input id="email" name="email" type="email" label={t.email} autocomplete="email" required />
      <Input
        id="password"
        name="password"
        type="password"
        label={t.password}
        autocomplete="new-password"
        hint={passwordHint}
        required
      />
      <Input
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        label={t.confirmPassword}
        autocomplete="new-password"
        required
      />
      <Button type="submit" loading={loading} fullWidth>
        {t.createAccount}
      </Button>
    </form>
  );
}
