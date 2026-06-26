import { handleForgotPasswordRequest } from '@/src/services/auth/forgotPassword.server';

export async function POST(request: Request): Promise<Response> {
  return handleForgotPasswordRequest(request);
}
