import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ animation: 'fade' }} />
      <Stack.Screen name="signup" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="join-household" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="signin" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="forgot-password" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="reset-password" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="upgrade" options={{ animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
