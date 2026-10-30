// Adapted from /common/legos/preact/auth-forms@1.0.0 (dvk-common 8a62bd5). Owned by this project.
// Origin: ssr-website-auth-astro-template - website/src/components/account/DeleteAccountForm.tsx (ff4d19d). Lego auth-forms.
import { useState } from "preact/hooks";
import { Alert, Button, Input } from "~/components/ui";
import { useFormAction } from "./api";
import { authLabels, type AuthLabels } from "./labels";

export interface DeleteAccountFormProps {
  /** API route: POST confirmation, password; the server checks both again. */
  action?: string;
  /** Where to go once the account is gone. */
  afterDeleteHref?: string;
  /** The word the user must type. */
  confirmWord?: string;
  labels?: Partial<AuthLabels>;
}

export function DeleteAccountForm({
  action = "/api/account/delete",
  afterDeleteHref = "/",
  confirmWord = "DELETE",
  labels,
}: DeleteAccountFormProps) {
  const t = authLabels(labels);
  const [confirming, setConfirming] = useState(false);
  const { loading, error, setError, onSubmit } = useFormAction(action, {
    validate: (form) => (form.get("confirmation") === confirmWord ? null : t.confirmMismatch(confirmWord)),
    onSuccess: () => window.location.assign(afterDeleteHref),
  });

  if (!confirming) {
    return (
      <div class="space-y-4">
        <p class="text-sm text-content-secondary">{t.deleteWarning}</p>
        <Button variant="danger" onClick={() => setConfirming(true)}>
          {t.deleteAccount}
        </Button>
      </div>
    );
  }

  return (
    <form class="space-y-6" onSubmit={onSubmit} noValidate>
      <Alert type="error">{error ?? t.deleteIrreversible}</Alert>
      <Input
        id="confirmation"
        name="confirmation"
        type="text"
        label={t.typeToConfirm(confirmWord)}
        placeholder={confirmWord}
        autocomplete="off"
        required
      />
      <Input
        id="deletePassword"
        name="password"
        type="password"
        label={t.yourPassword}
        autocomplete="current-password"
        required
      />
      <div class="flex justify-end gap-3">
        <Button
          variant="secondary"
          onClick={() => {
            setError(null);
            setConfirming(false);
          }}
        >
          {t.cancel}
        </Button>
        <Button type="submit" variant="danger" loading={loading}>
          {t.deletePermanently}
        </Button>
      </div>
    </form>
  );
}
