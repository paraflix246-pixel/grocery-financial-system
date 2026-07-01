import { useEffect } from 'react';

import { DEFAULT_AVATAR_ID } from '@/src/components/avatars/appAvatars';
import { useAvatar } from '@/src/components/avatars/AvatarProvider';
import { hasProInCurrentScopeFromStores } from '@/src/services/featureGateService';
import { useAppFont } from '@/src/theme/AppFontProvider';
import { useAppTheme } from '@/src/theme/AppThemeProvider';
import { DEFAULT_FONT_ID, getAppFont } from '@/src/theme/appFonts';
import { DEFAULT_THEME_ID, getAppTheme } from '@/src/theme/appThemes';
import { useWorkspaceStore } from '@/src/store/useWorkspaceStore';

/**
 * When a household member leaves Family workspace scope, revert Pro appearance
 * choices (theme, font, avatar) to free-tier defaults.
 */
export function ProAppearanceScopeGuard() {
  const activeScope = useWorkspaceStore((s) => s.activeScope);
  const isCurrentOwner = useWorkspaceStore((s) => s.isCurrentOwner);
  const hasActiveWorkspaceSub = useWorkspaceStore((s) => s.hasActiveWorkspaceSub);
  const isCurrentMember = useWorkspaceStore((s) => s.isCurrentMember);
  const devRoleOverride = useWorkspaceStore((s) => s.devRoleOverride);

  const { themeId, setThemeId } = useAppTheme();
  const { fontId, setFontId } = useAppFont();
  const { avatarId, setAvatarId } = useAvatar();

  const hasPro = hasProInCurrentScopeFromStores();

  useEffect(() => {
    if (hasPro) return;

    const theme = getAppTheme(themeId);
    if (theme.isPremium) {
      void setThemeId(DEFAULT_THEME_ID);
    }

    const font = getAppFont(fontId);
    if (font.isPro) {
      void setFontId(DEFAULT_FONT_ID);
    }

    if (avatarId !== DEFAULT_AVATAR_ID) {
      void setAvatarId(DEFAULT_AVATAR_ID);
    }
  }, [
    hasPro,
    activeScope,
    isCurrentOwner,
    hasActiveWorkspaceSub,
    isCurrentMember,
    devRoleOverride,
    themeId,
    fontId,
    avatarId,
    setThemeId,
    setFontId,
    setAvatarId,
  ]);

  return null;
}
