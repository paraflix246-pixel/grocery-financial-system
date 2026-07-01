import { Alert, Platform } from 'react-native';
import type { TFunction } from 'i18next';

import { shareText } from '@/src/utils/copyOrShare';

export function confirmSignOut(signOutAndRedirect: () => void | Promise<void>, t: TFunction): void {
  const run = () => {
    void signOutAndRedirect();
  };

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.confirm(`${t('common.logOut')} ${t('common.logOutBody')}`)) {
      run();
    }
    return;
  }

  Alert.alert(t('common.logOut'), t('common.logOutBody'), [
    { text: t('common.cancel'), style: 'cancel' },
    {
      text: t('settings.logout'),
      style: 'destructive',
      onPress: run,
    },
  ]);
}

export async function shareApp(t: TFunction): Promise<void> {
  await shareText(t('settings.shareMessage'), t('settings.shareApp'));
}
