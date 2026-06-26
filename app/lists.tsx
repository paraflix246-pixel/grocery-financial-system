import { Redirect } from 'expo-router';

/** Legacy URL — send users to the dashboard home tab. */
export default function ListsLegacyRedirect() {
  return <Redirect href="/(tabs)" />;
}
