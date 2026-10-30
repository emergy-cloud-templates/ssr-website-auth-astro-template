// Adapted from /common/legos/preact/auth-forms@1.0.0 (dvk-common 8a62bd5). Owned by this project.
// Origin: ssr-website-auth-astro-template - website/src/components/account/ProfileForm.tsx (ff4d19d). Lego auth-forms.
import { useState } from "preact/hooks";
import { Alert, Button, Input } from "~/components/ui";
import { useFormAction } from "./api";
import { authLabels, type AuthLabels } from "./labels";

export interface ProfileFormProps {
  initialName: string;
  /** Shown read-only. */
  email: string;
  /** API route: POST name. */
  action?: string;
  labels?: Partial<AuthLabels>;
}

export function ProfileForm({ initialName, email, action = "/api/account/update-profile", labels }: ProfileFormProps) {
  const t = authLabels(labels);
  const [saved, setSaved] = useState(false);
  const { loading, error, onSubmit } = useFormAction(action, {
    onStart: () => setSaved(false),
    onSuccess: () => setSaved(true),
  });

  return (
    <form class="space-y-6" onSubmit={onSubmit} noValidate>
      {error && <Alert type="error">{error}</Alert>}
      {saved && <Alert type="success">{t.profileUpdated}</Alert>}
      {/* defaultValue: a value prop would put the old name back on every re-render (saving, saved). */}
      <Input
        id="name"
        name="name"
        type="text"
        label={t.fullName}
        defaultValue={initialName}
        autocomplete="name"
        required
      />
      <Input id="email" type="email" label={t.email} value={email} disabled />
      <div class="flex justify-end">
        <Button type="submit" loading={loading}>
          {t.saveChanges}
        </Button>
      </div>
    </form>
  );
}
