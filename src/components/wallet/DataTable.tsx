import type { TableRow, TabType } from "@/types/wallet";
import { TableRow as TableRowComponent } from "./TableRow";

interface DataTableProps {
  data: TableRow[];
  loading: boolean;
  activeTab: TabType;
}

export function DataTable({ data, loading, activeTab }: DataTableProps) {
  const showPnL = activeTab === "position";
  const colSpan = showPnL ? 7 : 6;

  return (
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
            {showPnL && (
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                PnL
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((row, index) => (
              <TableRowComponent key={index} row={row} showPnL={showPnL} />
            ))
          ) : (
            <tr>
              <td
                colSpan={colSpan}
                className="px-4 py-8 text-center text-sm text-gray-500"
              >
                Không có dữ liệu
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
