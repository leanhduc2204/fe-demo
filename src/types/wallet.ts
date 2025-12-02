export interface WalletDetail {
  id: number;
  wallet_address: string;
  link: string;
  pnl: string;
  bid_balance: string;
  start_at: string | null;
  end_at: string | null;
}

export interface TableRow {
  icon: string;
  title: string;
  link: string;
  outcome: string;
  share: string;
  value: string;
  price: string;
  pnl_percent?: string;
  pnl_amount?: string;
}

export interface StatSearchResponse {
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
    pnl_percent?: string;
    pnl_amount?: string;
    [key: string]: unknown;
  }>;
}

export type TabType = "position" | "activity";
