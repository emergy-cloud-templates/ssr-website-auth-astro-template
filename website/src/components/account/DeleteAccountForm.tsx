import { useState } from "preact/hooks";

import { useFormAction } from "../../lib/client/useFormAction";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

export function DeleteAccountForm() {
  const [confirming, setConfirming] = useState(false);
  const { loading, error, setError, onSubmit } = useFormAction("/api/account/delete", {
    validate: (form) => (form.get("confirmation") === "DELETE" ? null : "Please type DELETE to confirm."),
    onSuccess: () => window.location.assign("/"),
  });

  if (!confirming) {
    return (
      <div class="space-y-4">
        <p class="text-sm text-gray-600">Once you delete your account, there is no going back. Please be certain.</p>
        <Button variant="danger" block={false} onClick={() => setConfirming(true)}>
          Delete account
        </Button>
      </div>
    );
  }

  return (
    <form class="space-y-6" onSubmit={onSubmit} noValidate>
      <Alert type="error">{error ?? "This permanently deletes your account. This action cannot be undone."}</Alert>
      <Input
        id="confirmation"
        name="confirmation"
        type="text"
        label='Type "DELETE" to confirm'
        placeholder="DELETE"
        autocomplete="off"
        required
      />
      <Input
        id="deletePassword"
        name="password"
        type="password"
        label="Your password"
        autocomplete="current-password"
        required
      />
      <div class="flex justify-end gap-3">
        <Button
          variant="secondary"
          block={false}
          onClick={() => {
            setError(null);
            setConfirming(false);
          }}
        >
          Cancel
        </Button>
        <Button type="submit" variant="danger" loading={loading} block={false}>
          Permanently delete
        </Button>
      </div>
    </form>
  );
}
