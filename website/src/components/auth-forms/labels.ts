// Adapted from /common/legos/preact/auth-forms@1.0.0 (dvk-common 8a62bd5). Owned by this project.
// Lego auth-forms: every visible string of the forms, in one dictionary. Pass `labels` (a partial) to any form,
// or one full dictionary per language. Validation messages come from validation.ts (shared with the server).
export interface AuthLabels {
  email: string;
  password: string;
  fullName: string;
  confirmPassword: string;
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
  passwordsDoNotMatch: string;
  signIn: string;
  forgotPassword: string;
  createAccount: string;
  checkEmail: string;
  sendResetLink: string;
  resetSent: string;
  updatePassword: string;
  passwordUpdated: string;
  continueAfterUpdate: string;
  saveChanges: string;
  profileUpdated: string;
  changePassword: string;
  passwordChanged: string;
  deleteAccount: string;
  deleteWarning: string;
  deleteIrreversible: string;
  typeToConfirm: (word: string) => string;
  confirmMismatch: (word: string) => string;
  yourPassword: string;
  cancel: string;
  deletePermanently: string;
  continueWithGoogle: string;
  orWithEmail: string;
  /** OAuthDemoForm (local provider's stand-in for Google). */
  demoAccountEmail: string;
  demoName: string;
  demoContinue: string;
}

export const defaultAuthLabels: AuthLabels = {
  email: "Email address",
  password: "Password",
  fullName: "Full name",
  confirmPassword: "Confirm password",
  currentPassword: "Current password",
  newPassword: "New password",
  confirmNewPassword: "Confirm new password",
  passwordsDoNotMatch: "Passwords do not match.",
  signIn: "Sign in",
  forgotPassword: "Forgot your password?",
  createAccount: "Create account",
  checkEmail: "Check your email for a confirmation link to finish creating your account.",
  sendResetLink: "Send reset link",
  resetSent: "If an account exists for this email, you will receive a reset link shortly.",
  updatePassword: "Update password",
  passwordUpdated: "Your password has been updated.",
  continueAfterUpdate: "Continue to your dashboard",
  saveChanges: "Save changes",
  profileUpdated: "Profile updated.",
  changePassword: "Change password",
  passwordChanged: "Password changed.",
  deleteAccount: "Delete account",
  deleteWarning: "Once you delete your account, there is no going back. Please be certain.",
  deleteIrreversible: "This permanently deletes your account. This action cannot be undone.",
  typeToConfirm: (word) => `Type "${word}" to confirm`,
  confirmMismatch: (word) => `Please type ${word} to confirm.`,
  yourPassword: "Your password",
  cancel: "Cancel",
  deletePermanently: "Permanently delete",
  continueWithGoogle: "Continue with Google",
  orWithEmail: "or with your email",
  demoAccountEmail: "Google account email",
  demoName: "Name",
  demoContinue: "Continue",
};

export const authLabels = (labels?: Partial<AuthLabels>): AuthLabels => ({ ...defaultAuthLabels, ...labels });
