import { useState } from "preact/hooks";

import { useFormAction } from "../../lib/client/useFormAction";
import { PASSWORD_HINT, validatePassword } from "../../lib/validation";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

export function UpdatePasswordForm() {
  const [done, setDone] = useState(false);
  const { loading, error, onSubmit } = useFormAction("/api/auth/update-password", {
    validate: (form) => {
      const password = String(form.get("password") ?? "");
      if (password !== form.get("confirmPassword")) return "Passwords do not match.";
      return validatePassword(password);
    },
    onSuccess: () => setDone(true),
  });

  if (done) {
    return (
      <div class="space-y-6">
        <Alert type="success">Your password has been updated.</Alert>
        <a
          href="/dashboard"
          class="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          Continue to your dashboard
        </a>
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
      <Button type="submit" loading={loading}>
        Update password
      </Button>
    </form>
  );
}
