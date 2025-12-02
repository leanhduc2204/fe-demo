import { useState, useEffect, useRef } from "react";
import type { TableRow, StatSearchResponse, TabType } from "@/types/wallet";

const REFRESH_INTERVAL = 2500;
const PAGE_SIZE = 10;

interface UseStatSearchParams {
  walletId: string | undefined;
  tab: TabType;
  activeTab: TabType;
  pageNumber: number;
}

export function useStatSearch({
  walletId,
  tab,
  activeTab,
  pageNumber,
}: UseStatSearchParams) {
  const [data, setData] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const dataRef = useRef<TableRow[]>([]);
  const totalPagesRef = useRef<number>(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!walletId || activeTab !== tab) return;

      const isFirstFetch =
        dataRef.current.length === 0 ||
        pageNumber !== Math.floor((dataRef.current.length - 1) / PAGE_SIZE);

      if (isFirstFetch) {
        setLoading(true);
      }

      try {
        const response = await fetch("/api/wallet/statSearch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            page_number: pageNumber,
            page_size: PAGE_SIZE,
            wallet_id: Number(walletId),
            tab: tab === "position" ? "POSITIONS" : "ACTIVITIES",
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch ${tab} data`);
        }

        const responseData: StatSearchResponse = await response.json();
        if (responseData.content && Array.isArray(responseData.content)) {
          const mappedData: TableRow[] = responseData.content.map((item) => ({
            icon: item.icon || "",
            link: item.link || "",
            price: item.price || "",
            title: item.title || "",
            outcome: item.outcome || "",
            share: item.share || "",
            value: item.value || "",
            ...(tab === "position" && {
              pnl_percent: item.pnl_percent || "",
              pnl_amount: item.pnl_amount || "",
            }),
          }));

          // Only update state if data has changed
          const dataChanged =
            JSON.stringify(dataRef.current) !== JSON.stringify(mappedData);
          const pagesChanged =
            totalPagesRef.current !== (responseData.total_pages || 1);

          if (dataChanged || pagesChanged) {
            dataRef.current = mappedData;
            totalPagesRef.current = responseData.total_pages || 1;
            setData(mappedData);
            setTotalPages(responseData.total_pages || 1);
          }
        }
      } catch (err) {
        console.error(`Error fetching ${tab} data:`, err);
      } finally {
        if (isFirstFetch) {
          setLoading(false);
        }
      }
    };

    // Fetch immediately
    fetchData();

    // Set up interval to fetch every 2.5 seconds (only when tab is active)
    if (activeTab === tab) {
      intervalRef.current = setInterval(() => {
        fetchData();
      }, REFRESH_INTERVAL);
    }

    // Cleanup interval on unmount or dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [walletId, tab, activeTab, pageNumber]);

  return { data, loading, totalPages };
}

