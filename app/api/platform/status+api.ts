import { getPublicPlatformStatus } from '@/src/services/admin/admin.server';
import { isSupabaseAdminConfigured } from '@/src/services/stripe/stripeSupabase.server';

export async function GET(): Promise<Response> {
  if (!isSupabaseAdminConfigured()) {
    return Response.json({
      maintenanceMode: false,
      maintenanceMessage: '',
      disableLogins: false,
      newSignupsPaused: false,
      receiptScanningPaused: false,
      priceComparePaused: false,
      activeMessages: [],
    });
  }

  try {
    const status = await getPublicPlatformStatus();
    return Response.json(status);
  } catch (error) {
    console.warn('[platform/status] failed:', error);
    return Response.json({
      maintenanceMode: false,
      maintenanceMessage: '',
      disableLogins: false,
      newSignupsPaused: false,
      receiptScanningPaused: false,
      priceComparePaused: false,
      activeMessages: [],
    });
  }
}
