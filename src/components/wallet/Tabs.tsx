import type { TabType } from "@/types/wallet";

interface TabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function Tabs({ activeTab, onTabChange }: TabsProps) {
  return (
    <div className="flex items-center gap-2 mb-6">
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
  );
}
