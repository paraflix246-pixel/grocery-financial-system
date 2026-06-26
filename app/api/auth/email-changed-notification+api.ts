import { handleEmailChangedNotificationRequest } from '@/src/services/auth/transactionalEmail.server';

export async function POST(request: Request): Promise<Response> {
  return handleEmailChangedNotificationRequest(request);
}
