import type { WalletDetail } from "@/types/wallet";

interface WalletInfoProps {
  walletDetail: WalletDetail;
}

export function WalletInfo({ walletDetail }: WalletInfoProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Wallet Info</h2>
      <div className="space-y-4">
        <div className="flex items-start gap-2 flex-wrap">
          <label className="text-sm font-medium text-gray-500 block">
            Address:
          </label>
          <a
            href={walletDetail.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-mono break-all min-w-0 flex-1"
          >
            {walletDetail.wallet_address}
          </a>
        </div>

        <div className="flex items-start gap-2">
          <label className="text-sm font-medium text-gray-500 block">
            PnL:
          </label>
          <p className="text-sm text-gray-900">{walletDetail.pnl}</p>
        </div>

        <div className="flex items-start gap-2">
          <label className="text-sm font-medium text-gray-500 block">
            Position Balance:
          </label>
          <p className="text-sm text-gray-900">{walletDetail.bid_balance}</p>
        </div>

        <div className="flex items-start gap-2">
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
  );
}
