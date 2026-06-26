import {
  handleCheckoutSessionCompleted,
  syncSubscriptionFromStripeObject,
} from '@/src/services/stripe/stripeBilling.server';
import { getStripeClient, isStripeConfigured } from '@/src/services/stripe/stripe.server';
import { isSupabaseAdminConfigured } from '@/src/services/stripe/stripeSupabase.server';

export async function POST(request: Request): Promise<Response> {
  if (!isStripeConfigured() || !isSupabaseAdminConfigured()) {
    return Response.json({ error: 'Stripe webhook is not configured.' }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return Response.json({ error: 'STRIPE_WEBHOOK_SECRET is not configured.' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return Response.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
  }

  const body = await request.text();
  const stripe = getStripeClient();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.warn('[stripe] webhook signature verification failed:', error);
    return Response.json({ error: 'Invalid webhook signature.' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscriptionFromStripeObject(event.data.object);
        break;
      default:
        break;
    }
  } catch (error) {
    console.warn('[stripe] webhook handler failed:', event.type, error);
    return Response.json({ error: 'Webhook handler failed.' }, { status: 500 });
  }

  return Response.json({ received: true });
}
