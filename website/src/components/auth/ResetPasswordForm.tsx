import { useState } from "preact/hooks";

import { useFormAction } from "../../lib/client/useFormAction";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

export function ResetPasswordForm() {
  const [sent, setSent] = useState(false);
  const { loading, error, onSubmit } = useFormAction("/api/auth/reset-password", {
    onSuccess: () => setSent(true),
  });

  if (sent) {
    return <Alert type="success">If an account exists for this email, you will receive a reset link shortly.</Alert>;
  }

  return (
    <form class="space-y-6" onSubmit={onSubmit} noValidate>
      {error && <Alert type="error">{error}</Alert>}
      <Input id="email" name="email" type="email" label="Email address" autocomplete="email" required />
      <Button type="submit" loading={loading}>
        Send reset link
      </Button>
    </form>
  );
}
