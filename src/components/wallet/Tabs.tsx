import type { TabType } from "@/types/wallet";

interface TabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
}

export function Tabs({
  activeTab,
  onTabChange,
  onRefresh,
  isLoading,
  pageSize = 10,
  onPageSizeChange,
}: TabsProps) {
  const pageSizeOptions = [10, 20, 50, 100, 200, 500];

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onTabChange("position")}
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
          onClick={() => onTabChange("activity")}
          className={`px-4 py-2 text-sm transition-colors duration-200 rounded-lg ${
            activeTab === "activity"
              ? "text-blue-600 bg-blue-50 font-semibold"
              : "text-gray-600 hover:text-gray-800 hover:bg-gray-50 font-medium"
          }`}
        >
          Activity
        </button>
      </div>
      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <label
              htmlFor="page-size-select"
              className="text-sm text-gray-600 font-medium"
            >
              Show:
            </label>
            <select
              id="page-size-select"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
