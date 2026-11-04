// Adapted from /common/legos/preact/auth-forms@1.0.0 (dvk-common 8a62bd5). Owned by this project.
// Origin: ssr-website-auth-astro-template - website/src/components/auth/SignInForm.tsx (ff4d19d), Google sign-in from
// recapify.app. Lego auth-forms.
import { Alert, Button, Input } from "~/components/ui";
import { useFormAction } from "./api";
import { GoogleButton } from "./GoogleButton";
import { authLabels, type AuthLabels } from "./labels";

export interface SignInFormProps {
  /** API route: POST email, password, redirectTo -> { redirectTo }. */
  action?: string;
  /** Where to go after signing in (validated again on the server). */
  redirectTo?: string;
  /** Message carried in the URL, e.g. after an expired link. */
  notice?: string;
  /** "Continue with Google" link, when Google sign-in is on. */
  googleHref?: string;
  resetHref?: string;
  labels?: Partial<AuthLabels>;
}

export function SignInForm({
  action = "/api/auth/signin",
  redirectTo,
  notice,
  googleHref,
  resetHref = "/auth/reset-password",
  labels,
}: SignInFormProps) {
  const t = authLabels(labels);
  const { loading, error, onSubmit } = useFormAction<{ redirectTo: string }>(action, {
    onSuccess: (data) => window.location.assign(data.redirectTo),
  });

  return (
    <form class="space-y-6" onSubmit={onSubmit} noValidate>
      {error ? <Alert type="error">{error}</Alert> : notice && <Alert type="info">{notice}</Alert>}
      {googleHref && <GoogleButton href={googleHref} labels={labels} />}
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
      <Input id="email" name="email" type="email" label={t.email} autocomplete="email" required />
      <Input
        id="password"
        name="password"
        type="password"
        label={t.password}
        autocomplete="current-password"
        required
      />
      <div class="text-sm">
        <a href={resetHref} class="font-medium text-link hover:text-link-hover">
          {t.forgotPassword}
        </a>
      </div>
      <Button type="submit" loading={loading} fullWidth>
        {t.signIn}
      </Button>
    </form>
  );
}
