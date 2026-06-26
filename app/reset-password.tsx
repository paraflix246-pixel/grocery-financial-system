import { Redirect } from 'expo-router';

/** Legacy Supabase reset links may still point at /reset-password — forward to onboarding. */
export default function ResetPasswordRedirect() {
  return <Redirect href="/onboarding/reset-password" />;
}
