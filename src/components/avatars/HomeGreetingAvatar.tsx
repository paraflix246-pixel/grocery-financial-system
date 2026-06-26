import { AvatarBadge } from '@/src/components/avatars/AvatarBadge';
import { getAppAvatar, type AppAvatarId } from '@/src/components/avatars/appAvatars';

type Props = {
  avatarId: AppAvatarId;
};

/** Home greeting companion — subtle idle animation every ~4 minutes. */
export function HomeGreetingAvatar({ avatarId }: Props) {
  const preset = getAppAvatar(avatarId);
  return <AvatarBadge preset={preset} size="lg" animate />;
}
