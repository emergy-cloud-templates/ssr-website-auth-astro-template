import { useFormAction } from "../../lib/client/useFormAction";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

interface SignInFormProps {
  /** Where to go after signing in (validated again on the server). */
  redirectTo?: string;
  /** Message carried in the URL, e.g. after an expired link. */
  notice?: string;
}

export function SignInForm({ redirectTo, notice }: SignInFormProps) {
  const { loading, error, onSubmit } = useFormAction<{ redirectTo: string }>("/api/auth/signin", {
    onSuccess: (data) => window.location.assign(data.redirectTo),
  });

  return (
    <form class="space-y-6" onSubmit={onSubmit} noValidate>
      {error ? <Alert type="error">{error}</Alert> : notice && <Alert type="info">{notice}</Alert>}
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
      <Input id="email" name="email" type="email" label="Email address" autocomplete="email" required />
      <Input id="password" name="password" type="password" label="Password" autocomplete="current-password" required />
      <div class="text-sm">
        <a href="/auth/reset-password" class="font-medium text-indigo-600 hover:text-indigo-500">
          Forgot your password?
        </a>
      </div>
      <Button type="submit" loading={loading}>
        Sign in
      </Button>
    </form>
  );
}
