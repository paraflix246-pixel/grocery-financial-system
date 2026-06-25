import { Redirect } from 'expo-router';

/** Legacy URL — tab route is now `shopping-lists`. */
export default function ListsLegacyRedirect() {
  return <Redirect href="/(tabs)/shopping-lists?browse=1" />;
}
