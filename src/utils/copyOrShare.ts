import * as Clipboard from 'expo-clipboard';
import { Platform, Share } from 'react-native';

import { showInfoAlert } from '@/src/utils/platformAlert';

type CopyOptions = {
  title?: string;
  message?: string;
};

export async function copyText(text: string, options?: CopyOptions): Promise<boolean> {
  const title = options?.title ?? 'Copied';
  const message = options?.message ?? 'Copied to clipboard.';
  try {
    await Clipboard.setStringAsync(text);
    showInfoAlert(title, message);
    return true;
  } catch (error) {
    showInfoAlert(
      'Copy failed',
      error instanceof Error ? error.message : 'Could not copy. Try selecting the text manually.'
    );
    return false;
  }
}

type ShareOptions = {
  successTitle?: string;
  successMessage?: string;
};

export async function shareText(
  text: string,
  shareTitle: string,
  options?: ShareOptions
): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: shareTitle, text });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
      }
    }
    await copyText(text, {
      title: options?.successTitle ?? 'Copied',
      message: options?.successMessage ?? 'Copied to clipboard.',
    });
    return;
  }

  try {
    const result = await Share.share({ message: text, title: shareTitle });
    if (result.action === Share.sharedAction && options?.successTitle) {
      showInfoAlert(options.successTitle, options.successMessage);
    }
  } catch {
    const copied = await copyText(text, {
      title: options?.successTitle ?? 'Copied',
      message: options?.successMessage ?? 'Copied to clipboard.',
    });
    if (!copied) {
      showInfoAlert('Share failed', 'Could not share. Try again.');
    }
  }
}
