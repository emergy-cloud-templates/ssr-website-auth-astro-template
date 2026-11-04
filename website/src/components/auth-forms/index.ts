// Adapted from /common/legos/preact/auth-forms@1.0.0 (dvk-common 8a62bd5). Owned by this project.
// Lego auth-forms: the barrel. Import from "~/components/auth-forms".
export { SignInForm } from "./SignInForm";
export type { SignInFormProps } from "./SignInForm";
export { SignUpForm } from "./SignUpForm";
export type { SignUpFormProps } from "./SignUpForm";
export { ResetPasswordForm } from "./ResetPasswordForm";
export type { ResetPasswordFormProps } from "./ResetPasswordForm";
export { UpdatePasswordForm } from "./UpdatePasswordForm";
export type { UpdatePasswordFormProps } from "./UpdatePasswordForm";
export { ProfileForm } from "./ProfileForm";
export type { ProfileFormProps } from "./ProfileForm";
export { ChangePasswordForm } from "./ChangePasswordForm";
export type { ChangePasswordFormProps } from "./ChangePasswordForm";
export { DeleteAccountForm } from "./DeleteAccountForm";
export type { DeleteAccountFormProps } from "./DeleteAccountForm";
export { GoogleButton } from "./GoogleButton";
export { OAuthDemoForm } from "./OAuthDemoForm";
export type { OAuthDemoFormProps } from "./OAuthDemoForm";
export { authLabels, defaultAuthLabels } from "./labels";
export type { AuthLabels } from "./labels";
export { postForm, useFormAction } from "./api";
export type { ApiResult } from "./api";
export {
  LIMITS,
  PASSWORD_HINT,
  normalizeEmail,
  safeRedirectPath,
  sanitizeName,
  validateEmail,
  validateName,
  validatePassword,
} from "./validation";
