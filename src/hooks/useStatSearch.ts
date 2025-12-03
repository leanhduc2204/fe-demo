import { useState, useEffect, useRef, useCallback } from "react";
import type { TableRow, StatSearchResponse, TabType } from "@/types/wallet";

interface UseStatSearchParams {
  walletId: string | undefined;
  tab: TabType;
  activeTab: TabType;
  pageNumber: number;
  pageSize: number;
}

export function useStatSearch({
  walletId,
  tab,
  activeTab,
  pageNumber,
  pageSize,
}: UseStatSearchParams) {
  const [data, setData] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const dataRef = useRef<TableRow[]>([]);
  const totalPagesRef = useRef<number>(1);

  const fetchData = useCallback(
    async (showLoading = false) => {
      if (!walletId || activeTab !== tab) return;

      const isFirstFetch =
        dataRef.current.length === 0 ||
        pageNumber !== Math.floor((dataRef.current.length - 1) / pageSize);

      if (isFirstFetch || showLoading) {
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
            page_size: pageSize,
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
        if (isFirstFetch || showLoading) {
          setLoading(false);
        }
      }
    },
    [walletId, tab, activeTab, pageNumber, pageSize]
  );

  useEffect(() => {
    // Fetch immediately
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  return { data, loading, totalPages, refresh };
}
