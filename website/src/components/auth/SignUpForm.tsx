import { useState } from "preact/hooks";

import { useFormAction } from "../../lib/client/useFormAction";
import { PASSWORD_HINT, validatePassword } from "../../lib/validation";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

export function SignUpForm() {
  const [checkEmail, setCheckEmail] = useState(false);
  const { loading, error, onSubmit } = useFormAction<{ signedIn: boolean; redirectTo: string }>("/api/auth/signup", {
    validate: (form) => {
      const password = String(form.get("password") ?? "");
      if (password !== form.get("confirmPassword")) return "Passwords do not match.";
      return validatePassword(password);
    },
    onSuccess: (data) => {
      if (data.signedIn) window.location.assign(data.redirectTo);
      else setCheckEmail(true);
    },
  });

  if (checkEmail) {
    return <Alert type="success">Check your email for a confirmation link to finish creating your account.</Alert>;
  }

  return (
    <form class="space-y-6" onSubmit={onSubmit} noValidate>
      {error && <Alert type="error">{error}</Alert>}
      <Input id="name" name="name" type="text" label="Full name" autocomplete="name" required />
      <Input id="email" name="email" type="email" label="Email address" autocomplete="email" required />
      <Input
        id="password"
        name="password"
        type="password"
        label="Password"
        autocomplete="new-password"
        hint={PASSWORD_HINT}
        required
      />
      <Input
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        label="Confirm password"
        autocomplete="new-password"
        required
      />
      <Button type="submit" loading={loading}>
        Create account
      </Button>
    </form>
  );
}
