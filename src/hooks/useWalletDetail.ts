import { useState, useEffect, useRef } from "react";
import type { WalletDetail } from "@/types/wallet";

const REFRESH_INTERVAL = 2500;

export function useWalletDetail(walletId: string | undefined) {
  const [walletDetail, setWalletDetail] = useState<WalletDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const walletDetailRef = useRef<WalletDetail | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchWalletDetail = async () => {
      if (!walletId) return;

      const isFirstFetch = walletDetailRef.current === null;
      if (isFirstFetch) {
        setLoading(true);
        setError(null);
      }

      try {
        const response = await fetch(`/api/wallet/info?walletId=${walletId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch wallet detail");
        }

        const data = await response.json();

        // Only update state if data has changed
        const dataChanged =
          JSON.stringify(walletDetailRef.current) !== JSON.stringify(data);
        if (dataChanged) {
          walletDetailRef.current = data;
          setWalletDetail(data);
        }
      } catch (err) {
        console.error("Error fetching wallet detail:", err);
        if (isFirstFetch) {
          setError(
            err instanceof Error ? err.message : "Có lỗi xảy ra khi tải dữ liệu"
          );
        }
      } finally {
        if (isFirstFetch) {
          setLoading(false);
        }
      }
    };

    // Fetch immediately
    fetchWalletDetail();

    // Set up interval to fetch every 2.5 seconds
    intervalRef.current = setInterval(() => {
      fetchWalletDetail();
    }, REFRESH_INTERVAL);

    // Cleanup interval on unmount or id change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [walletId]);

  return { walletDetail, loading, error };
}
