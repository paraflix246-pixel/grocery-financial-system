import { handleWelcomeEmailRequest } from '@/src/services/auth/welcomeEmail.server';

export async function POST(request: Request): Promise<Response> {
  return handleWelcomeEmailRequest(request);
}
