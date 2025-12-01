/* eslint-disable @next/next/no-img-element */
"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";

interface WalletDetail {
  id: number;
  wallet_address: string;
  link: string;
  pnl: string;
  bid_balance: string;
  start_at: string | null;
  end_at: string | null;
}

interface TableRow {
  icon: string;
  title: string;
  link: string;
  outcome: string;
  share: string;
  value: string;
  price: string;
}

interface StatSearchResponse {
  page_number: number;
  page_size: number;
  page_elements: number;
  total_pages: number;
  total_elements: number;
  content: Array<{
    icon?: string;
    title?: string;
    link?: string;
    outcome?: string;
    share?: string;
    value?: string;
    price?: string;
    [key: string]: unknown;
  }>;
}

// Helper function to format numbers: round to 4 decimals, remove trailing zeros
const formatNumber = (value: string | number): string => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return value.toString();

  // Round to 4 decimal places
  const rounded = Math.round(num * 10000) / 10000;

  // Convert to string with 4 decimal places
  const formatted = rounded.toFixed(4);

  // Remove trailing zeros
  return parseFloat(formatted).toString();
};

export default function WalletDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [walletDetail, setWalletDetail] = useState<WalletDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"position" | "activity">(
    "position"
  );
  const [positionData, setPositionData] = useState<TableRow[]>([]);
  const [activityData, setActivityData] = useState<TableRow[]>([]);
  const [loadingPosition, setLoadingPosition] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [positionPageNumber, setPositionPageNumber] = useState(0);
  const [activityPageNumber, setActivityPageNumber] = useState(0);
  const [positionTotalPages, setPositionTotalPages] = useState(1);
  const [activityTotalPages, setActivityTotalPages] = useState(1);
  const pageSize = 10;
  const walletInfoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const positionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activityIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const walletDetailRef = useRef<WalletDetail | null>(null);
  const positionDataRef = useRef<TableRow[]>([]);
  const activityDataRef = useRef<TableRow[]>([]);
  const positionTotalPagesRef = useRef<number>(1);
  const activityTotalPagesRef = useRef<number>(1);

  useEffect(() => {
    const fetchWalletDetail = async () => {
      if (!id) return;

      const isFirstFetch = walletDetailRef.current === null;
      if (isFirstFetch) {
        setLoading(true);
        setError(null);
      }

      try {
        const response = await fetch(`/api/wallet/info?walletId=${id}`);

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
    walletInfoIntervalRef.current = setInterval(() => {
      fetchWalletDetail();
    }, 2500);

    // Cleanup interval on unmount or id change
    return () => {
      if (walletInfoIntervalRef.current) {
        clearInterval(walletInfoIntervalRef.current);
        walletInfoIntervalRef.current = null;
      }
    };
  }, [id]);

  // Fetch Position data
  useEffect(() => {
    const fetchPositionData = async () => {
      if (!id || activeTab !== "position") return;

      const isFirstFetch =
        positionDataRef.current.length === 0 ||
        positionPageNumber !==
          Math.floor((positionDataRef.current.length - 1) / pageSize);

      if (isFirstFetch) {
        setLoadingPosition(true);
      }

      try {
        const response = await fetch("/api/wallet/statSearch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            page_number: positionPageNumber,
            page_size: pageSize,
            wallet_id: Number(id),
            tab: "POSITIONS",
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch position data");
        }

        const data: StatSearchResponse = await response.json();
        if (data.content && Array.isArray(data.content)) {
          const mappedData: TableRow[] = data.content.map((item) => ({
            icon: item.icon || "",
            link: item.link || "",
            price: item.price || "",
            title: item.title || "",
            outcome: item.outcome || "",
            share: item.share || "",
            value: item.value || "",
          }));

          // Only update state if data has changed
          const dataChanged =
            JSON.stringify(positionDataRef.current) !==
            JSON.stringify(mappedData);
          const pagesChanged =
            positionTotalPagesRef.current !== (data.total_pages || 1);

          if (dataChanged || pagesChanged) {
            positionDataRef.current = mappedData;
            positionTotalPagesRef.current = data.total_pages || 1;
            setPositionData(mappedData);
            setPositionTotalPages(data.total_pages || 1);
          }
        }
      } catch (err) {
        console.error("Error fetching position data:", err);
      } finally {
        if (isFirstFetch) {
          setLoadingPosition(false);
        }
      }
    };

    // Fetch immediately
    fetchPositionData();

    // Set up interval to fetch every 2.5 seconds (only when tab is active)
    if (activeTab === "position") {
      positionIntervalRef.current = setInterval(() => {
        fetchPositionData();
      }, 2500);
    }

    // Cleanup interval on unmount or dependencies change
    return () => {
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
        positionIntervalRef.current = null;
      }
    };
  }, [id, activeTab, positionPageNumber, pageSize]);

  // Fetch Activity data
  useEffect(() => {
    const fetchActivityData = async () => {
      if (!id || activeTab !== "activity") return;

      const isFirstFetch =
        activityDataRef.current.length === 0 ||
        activityPageNumber !==
          Math.floor((activityDataRef.current.length - 1) / pageSize);

      if (isFirstFetch) {
        setLoadingActivity(true);
      }

      try {
        const response = await fetch("/api/wallet/statSearch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            page_number: activityPageNumber,
            page_size: pageSize,
            wallet_id: Number(id),
            tab: "ACTIVITIES",
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch activity data");
        }

        const data: StatSearchResponse = await response.json();
        if (data.content && Array.isArray(data.content)) {
          const mappedData: TableRow[] = data.content.map((item) => ({
            icon: item.icon || "",
            link: item.link || "",
            price: item.price || "",
            title: item.title || "",
            outcome: item.outcome || "",
            share: item.share || "",
            value: item.value || "",
          }));

          // Only update state if data has changed
          const dataChanged =
            JSON.stringify(activityDataRef.current) !==
            JSON.stringify(mappedData);
          const pagesChanged =
            activityTotalPagesRef.current !== (data.total_pages || 1);

          if (dataChanged || pagesChanged) {
            activityDataRef.current = mappedData;
            activityTotalPagesRef.current = data.total_pages || 1;
            setActivityData(mappedData);
            setActivityTotalPages(data.total_pages || 1);
          }
        }
      } catch (err) {
        console.error("Error fetching activity data:", err);
      } finally {
        if (isFirstFetch) {
          setLoadingActivity(false);
        }
      }
    };

    // Fetch immediately
    fetchActivityData();

    // Set up interval to fetch every 2.5 seconds (only when tab is active)
    if (activeTab === "activity") {
      activityIntervalRef.current = setInterval(() => {
        fetchActivityData();
      }, 2500);
    }

    // Cleanup interval on unmount or dependencies change
    return () => {
      if (activityIntervalRef.current) {
        clearInterval(activityIntervalRef.current);
        activityIntervalRef.current = null;
      }
    };
  }, [id, activeTab, activityPageNumber, pageSize]);

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="w-full max-w-7xl mx-auto">
        {loading && (
          <div className="text-center py-8">
            <p className="text-gray-600">Đang tải...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {walletDetail && !loading && (
          <div className="space-y-6">
            {/* Wallet Info Box */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Wallet Info
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-500 block">
                    Address:
                  </label>
                  <a
                    href={walletDetail.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-mono"
                  >
                    {walletDetail.wallet_address}
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-500 block">
                    PnL:
                  </label>
                  <p className="text-sm text-gray-900">{walletDetail.pnl}</p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-500 block">
                    Position Balance:
                  </label>
                  <p className="text-sm text-gray-900">
                    {walletDetail.bid_balance}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-500 block">
                    Start At:
                  </label>
                  <p className="text-sm text-gray-900">
                    {walletDetail.start_at
                      ? new Date(walletDetail.start_at).toLocaleString("vi-VN")
                      : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Table with Tabs */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              {/* Tabs */}
              <div className="flex items-center gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => setActiveTab("position")}
                  className={`px-4 py-2 text-sm transition-colors duration-200 rounded-lg ${
                    activeTab === "position"
                      ? "text-blue-600 bg-blue-50 font-semibold"
                      : "text-gray-600 hover:text-gray-800 hover:bg-gray-50 font-medium"
                  }`}
                >
                  Position
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("activity")}
                  className={`px-4 py-2 text-sm transition-colors duration-200 rounded-lg ${
                    activeTab === "activity"
                      ? "text-blue-600 bg-blue-50 font-semibold"
                      : "text-gray-600 hover:text-gray-800 hover:bg-gray-50 font-medium"
                  }`}
                >
                  Activity
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Image
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Title
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Out_come
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Share
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Price $
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Value $
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTab === "position" ? (
                      loadingPosition ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-8 text-center text-sm text-gray-500"
                          >
                            Đang tải...
                          </td>
                        </tr>
                      ) : positionData.length > 0 ? (
                        positionData.map((row, index) => (
                          <tr
                            key={index}
                            className="border-b border-gray-200 hover:bg-gray-50"
                          >
                            <td className="px-4 py-3">
                              {row.icon && (
                                <img
                                  src={row.icon}
                                  alt={row.title}
                                  className="w-12 h-12 rounded object-cover"
                                />
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 cursor-pointer hover:text-blue-600 hover:underline transition-colors duration-200">
                              <a
                                href={row.link}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {row.title}
                              </a>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {row.outcome}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {formatNumber(row.share)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              ${formatNumber(row.price)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              ${formatNumber(row.value)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-8 text-center text-sm text-gray-500"
                          >
                            Không có dữ liệu
                          </td>
                        </tr>
                      )
                    ) : loadingActivity ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-sm text-gray-500"
                        >
                          Đang tải...
                        </td>
                      </tr>
                    ) : activityData.length > 0 ? (
                      activityData.map((row, index) => (
                        <tr
                          key={index}
                          className="border-b border-gray-200 hover:bg-gray-50"
                        >
                          <td className="px-4 py-3">
                            {row.icon && (
                              <img
                                src={row.icon}
                                alt={row.title}
                                className="w-12 h-12 rounded object-cover"
                              />
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 cursor-pointer hover:text-blue-600 hover:underline transition-colors duration-200">
                            <a
                              href={row.link}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {row.title}
                            </a>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {row.outcome}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {formatNumber(row.share)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            ${formatNumber(row.price)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            ${formatNumber(row.value)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-sm text-gray-500"
                        >
                          Không có dữ liệu
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Trang{" "}
                  {activeTab === "position"
                    ? positionPageNumber + 1
                    : activityPageNumber + 1}{" "}
                  /{" "}
                  {activeTab === "position"
                    ? positionTotalPages
                    : activityTotalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTab === "position") {
                        setPositionPageNumber((prev) =>
                          prev > 0 ? prev - 1 : 0
                        );
                      } else {
                        setActivityPageNumber((prev) =>
                          prev > 0 ? prev - 1 : 0
                        );
                      }
                    }}
                    disabled={
                      activeTab === "position"
                        ? positionPageNumber === 0
                        : activityPageNumber === 0
                    }
                    className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTab === "position") {
                        setPositionPageNumber((prev) =>
                          prev < positionTotalPages - 1 ? prev + 1 : prev
                        );
                      } else {
                        setActivityPageNumber((prev) =>
                          prev < activityTotalPages - 1 ? prev + 1 : prev
                        );
                      }
                    }}
                    disabled={
                      activeTab === "position"
                        ? positionPageNumber >= positionTotalPages - 1
                        : activityPageNumber >= activityTotalPages - 1
                    }
                    className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
                  >
                    Sau
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
