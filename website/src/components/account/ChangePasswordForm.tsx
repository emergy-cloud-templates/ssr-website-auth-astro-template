import { useState } from "preact/hooks";

import { useFormAction } from "../../lib/client/useFormAction";
import { PASSWORD_HINT, validatePassword } from "../../lib/validation";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

export function ChangePasswordForm() {
  const [changed, setChanged] = useState(false);
  const { loading, error, onSubmit } = useFormAction("/api/account/change-password", {
    onStart: () => setChanged(false),
    validate: (form) => {
      const password = String(form.get("newPassword") ?? "");
      if (password !== form.get("confirmPassword")) return "Passwords do not match.";
      return validatePassword(password);
    },
    onSuccess: (_data, form) => {
      setChanged(true);
      form.reset();
    },
  });

  return (
    <form class="space-y-6" onSubmit={onSubmit} noValidate>
      {error && <Alert type="error">{error}</Alert>}
      {changed && <Alert type="success">Password changed.</Alert>}
      <Input
        id="currentPassword"
        name="currentPassword"
        type="password"
        label="Current password"
        autocomplete="current-password"
        required
      />
      <Input
        id="newPassword"
        name="newPassword"
        type="password"
        label="New password"
        autocomplete="new-password"
        hint={PASSWORD_HINT}
        required
      />
      <Input
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        label="Confirm new password"
        autocomplete="new-password"
        required
      />
      <div class="flex justify-end">
        <Button type="submit" loading={loading} block={false}>
          Change password
        </Button>
      </div>
    </form>
  );
}
