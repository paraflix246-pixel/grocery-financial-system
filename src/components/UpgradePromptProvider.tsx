import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';

import { UpgradePromptModal } from '@/src/components/UpgradePromptModal';
import {
  closeUpgradePrompt,
  subscribeUpgradePrompt,
  type UpgradePromptPayload,
} from '@/src/utils/upgradePromptController';

type Props = {
  children: ReactNode;
};

export function UpgradePromptProvider({ children }: Props) {
  const router = useRouter();
  const [prompt, setPrompt] = useState<UpgradePromptPayload | null>(null);

  useEffect(() => subscribeUpgradePrompt(setPrompt), []);

  const dismiss = useCallback(() => {
    closeUpgradePrompt();
  }, []);

  const handleUpgrade = useCallback(() => {
    const onUpgrade = prompt?.onUpgrade;
    closeUpgradePrompt();
    if (onUpgrade) {
      onUpgrade();
    } else {
      router.push('/paywall' as never);
    }
  }, [prompt?.onUpgrade, router]);

  return (
    <>
      {children}
      <UpgradePromptModal
        visible={prompt != null}
        featureName={prompt?.featureName ?? ''}
        onUpgrade={handleUpgrade}
        onDismiss={dismiss}
      />
    </>
  );
}
