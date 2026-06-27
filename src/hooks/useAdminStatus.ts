import { useCallback, useEffect, useState } from 'react';

import { isAdminUser, syncUserProfile } from '@/src/services/admin/adminApiService';
import { isSignedInAccount } from '@/src/services/authService';
import { supabase } from '@/src/services/supabaseClient';

export type AdminStatus = {
  isAdmin: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
};

/**
 * Resolves admin role from /api/profile/sync (profiles.role) and keeps it in sync with auth.
 */
export function useAdminStatus(): AdminStatus {
  const [isAdmin, setIsAdmin] = useState(isAdminUser());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const signedIn = await isSignedInAccount();
      if (!signedIn) {
        setIsAdmin(false);
        return;
      }
      await syncUserProfile();
      setIsAdmin(isAdminUser());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    if (!supabase) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  return { isAdmin, loading, refresh };
}
