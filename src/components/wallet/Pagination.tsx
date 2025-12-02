import type { TabType } from "@/types/wallet";

interface PaginationProps {
  activeTab: TabType;
  pageNumber: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}

export function Pagination({
  activeTab,
  pageNumber,
  totalPages,
  onPrevious,
  onNext,
}: PaginationProps) {
  const isFirstPage = pageNumber === 0;
  const isLastPage = pageNumber >= totalPages - 1;

  return (
    <div className="mt-4 flex items-center justify-between">
      <div className="text-sm text-gray-600">
        Trang {pageNumber + 1} / {totalPages}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={isFirstPage}
          className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
        >
          Trước
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={isLastPage}
          className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
        >
          Sau
        </button>
      </div>
    </div>
  );
}
