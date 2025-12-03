"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useWalletDetail } from "@/hooks/useWalletDetail";
import { useStatSearch } from "@/hooks/useStatSearch";
import { WalletInfo } from "@/components/wallet/WalletInfo";
import { Tabs } from "@/components/wallet/Tabs";
import { DataTable } from "@/components/wallet/DataTable";
import { Pagination } from "@/components/wallet/Pagination";
import type { TabType } from "@/types/wallet";

export default function WalletDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [activeTab, setActiveTab] = useState<TabType>("position");
  const [positionPageNumber, setPositionPageNumber] = useState(0);
  const [activityPageNumber, setActivityPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(100);

  const { walletDetail, loading, error } = useWalletDetail(id);

  const {
    data: positionData,
    loading: loadingPosition,
    totalPages: positionTotalPages,
    refresh: refreshPosition,
  } = useStatSearch({
    walletId: id,
    tab: "position",
    activeTab,
    pageNumber: positionPageNumber,
    pageSize,
  });

  const {
    data: activityData,
    loading: loadingActivity,
    totalPages: activityTotalPages,
    refresh: refreshActivity,
  } = useStatSearch({
    walletId: id,
    tab: "activity",
    activeTab,
    pageNumber: activityPageNumber,
    pageSize,
  });

  const handlePreviousPage = () => {
    if (activeTab === "position") {
      setPositionPageNumber((prev) => (prev > 0 ? prev - 1 : 0));
    } else {
      setActivityPageNumber((prev) => (prev > 0 ? prev - 1 : 0));
    }
  };

  const handleNextPage = () => {
    if (activeTab === "position") {
      setPositionPageNumber((prev) =>
        prev < positionTotalPages - 1 ? prev + 1 : prev
      );
    } else {
      setActivityPageNumber((prev) =>
        prev < activityTotalPages - 1 ? prev + 1 : prev
      );
    }
  };

  const currentPageNumber =
    activeTab === "position" ? positionPageNumber : activityPageNumber;
  const currentTotalPages =
    activeTab === "position" ? positionTotalPages : activityTotalPages;
  const currentData = activeTab === "position" ? positionData : activityData;
  const currentLoading =
    activeTab === "position" ? loadingPosition : loadingActivity;
  const handleRefresh =
    activeTab === "position" ? refreshPosition : refreshActivity;

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    // Reset page number to 0 when page size changes
    setPositionPageNumber(0);
    setActivityPageNumber(0);
  };

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
            <WalletInfo walletDetail={walletDetail} />

            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              <Tabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onRefresh={handleRefresh}
                isLoading={currentLoading}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
              />
              <DataTable
                data={currentData}
                loading={currentLoading}
                activeTab={activeTab}
              />
              <Pagination
                activeTab={activeTab}
                pageNumber={currentPageNumber}
                totalPages={currentTotalPages}
                onPrevious={handlePreviousPage}
                onNext={handleNextPage}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
