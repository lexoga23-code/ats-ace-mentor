import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface SubscriptionData {
  isPro: boolean;
  subscriptionEnd: string | null;
  reviewRequested: boolean;
}

interface SubscriptionContextType {
  checkSubscription: () => Promise<SubscriptionData | null>;
  checkPaidStatus: (analysisId: string | null) => Promise<boolean>;
  isPro: boolean;
  loading: boolean;
  invalidateCache: () => void;
}

const CACHE_DURATION_MS = 60000; // 60 seconds

const SubscriptionContext = createContext<SubscriptionContextType>({
  checkSubscription: async () => null,
  checkPaidStatus: async () => false,
  isPro: false,
  loading: false,
  invalidateCache: () => {},
});

export const useSubscription = () => useContext(SubscriptionContext);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [cachedData, setCachedData] = useState<SubscriptionData | null>(null);
  const [cacheTimestamp, setCacheTimestamp] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const invalidateCache = useCallback(() => {
    setCachedData(null);
    setCacheTimestamp(0);
  }, []);

  const checkSubscription = useCallback(async (): Promise<SubscriptionData | null> => {
    if (!user) return null;

    // Return cached data if still valid
    const now = Date.now();
    if (cachedData && now - cacheTimestamp < CACHE_DURATION_MS) {
      return cachedData;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;

      const subData: SubscriptionData = {
        isPro: data?.isPro ?? false,
        subscriptionEnd: data?.subscriptionEnd ?? null,
        reviewRequested: data?.reviewRequested ?? false,
      };

      setCachedData(subData);
      setCacheTimestamp(now);
      return subData;
    } catch (err) {
      console.error("Error checking subscription:", err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, cachedData, cacheTimestamp]);

  const checkPaidStatus = useCallback(async (analysisId: string | null): Promise<boolean> => {
    if (!user) return false;

    // Security: require analysisId
    if (!analysisId) return false;

    // Check if this specific analysis is paid
    const { data } = await supabase
      .from("user_analyses")
      .select("is_paid")
      .eq("id", analysisId)
      .eq("user_id", user.id)
      .single();

    if (data?.is_paid) return true;

    // Also check Pro status (uses cache)
    const subData = await checkSubscription();
    return subData?.isPro ?? false;
  }, [user, checkSubscription]);

  return (
    <SubscriptionContext.Provider
      value={{
        checkSubscription,
        checkPaidStatus,
        isPro: cachedData?.isPro ?? false,
        loading,
        invalidateCache,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};
