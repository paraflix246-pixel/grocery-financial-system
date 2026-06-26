import { handleCheckSignInHintRequest } from '@/src/services/auth/forgotPassword.server';

export async function GET(request: Request): Promise<Response> {
  return handleCheckSignInHintRequest(request);
}

export async function POST(request: Request): Promise<Response> {
  return handleCheckSignInHintRequest(request);
}
