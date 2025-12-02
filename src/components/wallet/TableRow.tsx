/* eslint-disable @next/next/no-img-element */
import type { TableRow as TableRowType } from "@/types/wallet";
import { formatNumber } from "@/utils/format";

interface TableRowProps {
  row: TableRowType;
  showPnL?: boolean;
}

export function TableRow({ row, showPnL = false }: TableRowProps) {
  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50">
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
        <a href={row.link} target="_blank" rel="noopener noreferrer">
          {row.title}
        </a>
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">{row.outcome}</td>
      <td className="px-4 py-3 text-sm text-gray-700">
        {formatNumber(row.share)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">
        ${formatNumber(row.price)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">
        ${formatNumber(row.value)}
      </td>
      {showPnL && (
        <td className="px-4 py-3 text-sm">
          <div className="flex flex-col">
            {row.pnl_percent ? (
              <span
                className={
                  row.pnl_percent.startsWith("-")
                    ? "text-red-600"
                    : "text-green-600"
                }
              >
                {row.pnl_percent}
              </span>
            ) : (
              <span className="text-gray-400">—</span>
            )}
            {row.pnl_amount ? (
              <span
                className={`text-xs mt-1 ${
                  row.pnl_amount.startsWith("-")
                    ? "text-red-600"
                    : "text-gray-600"
                }`}
              >
                {formatNumber(row.pnl_amount)}
              </span>
            ) : (
              <span className="text-xs text-gray-400 mt-1">—</span>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}
