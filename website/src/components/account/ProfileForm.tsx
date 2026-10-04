import { useState } from "preact/hooks";

import { useFormAction } from "../../lib/client/useFormAction";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

interface ProfileFormProps {
  initialName: string;
  email: string;
}

export function ProfileForm({ initialName, email }: ProfileFormProps) {
  const [saved, setSaved] = useState(false);
  const { loading, error, onSubmit } = useFormAction("/api/account/update-profile", {
    onStart: () => setSaved(false),
    onSuccess: () => setSaved(true),
  });

  return (
    <form class="space-y-6" onSubmit={onSubmit} noValidate>
      {error && <Alert type="error">{error}</Alert>}
      {saved && <Alert type="success">Profile updated.</Alert>}
      <Input id="name" name="name" type="text" label="Full name" value={initialName} autocomplete="name" required />
      <Input id="email" type="email" label="Email address" value={email} disabled />
      <div class="flex justify-end">
        <Button type="submit" loading={loading} block={false}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
