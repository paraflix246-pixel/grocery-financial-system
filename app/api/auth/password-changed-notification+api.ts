import { handlePasswordChangedNotificationRequest } from '@/src/services/auth/transactionalEmail.server';

export async function POST(request: Request): Promise<Response> {
  return handlePasswordChangedNotificationRequest(request);
}
