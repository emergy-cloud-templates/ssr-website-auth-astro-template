// Adapted from /common/legos/preact/auth-forms@1.0.0 (dvk-common 8a62bd5). Owned by this project.
// Origin: recapify.app - website/src/components/auth/GoogleDemoForm.tsx (6ab8a9b). Lego auth-forms.
import { Alert, Button, Input } from "~/components/ui";
import { useFormAction } from "./api";
import { authLabels, type AuthLabels } from "./labels";

export interface OAuthDemoFormProps {
  /** API route: POST email, name, redirectTo -> { redirectTo } (supabase-auth's /api/auth/google-demo). */
  action?: string;
  redirectTo: string;
  labels?: Partial<AuthLabels>;
}

/**
 * The local auth provider's stand-in for Google's consent screen (no Google offline): any email signs in, creating
 * the account the first time. Only rendered by the dev page /auth/google-demo; the route answers 404 with Supabase.
 */
export function OAuthDemoForm({ action = "/api/auth/google-demo", redirectTo, labels }: OAuthDemoFormProps) {
  const t = authLabels(labels);
  const { loading, error, onSubmit } = useFormAction<{ redirectTo: string }>(action, {
    onSuccess: (data) => window.location.assign(data.redirectTo),
  });
  return (
    <form class="space-y-6" onSubmit={onSubmit} noValidate>
      {error && <Alert type="error">{error}</Alert>}
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <Input id="demo-email" name="email" type="email" label={t.demoAccountEmail} autocomplete="email" required />
      <Input id="demo-name" name="name" type="text" label={t.demoName} autocomplete="name" />
      <Button type="submit" loading={loading} fullWidth>
        {t.demoContinue}
      </Button>
    </form>
  );
}
