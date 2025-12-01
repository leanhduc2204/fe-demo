/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ClobClient, OrderType, Side } from "@polymarket/clob-client";
import { Wallet } from "@ethersproject/wallet";
import { isAddress } from "ethers";
import axios from "axios";
import { useRouter } from "next/navigation";

const host = "https://clob.polymarket.com";
const signatureType = 2;

interface CopyHistory {
  type: string;
  market_title: string;
  market_image: string;
  option: string;
  share_price: number;
  share_amount: number;
  total_price: number;
  copy_from: string;
  copy_link: string;
  tx_hash: string;
  tx_link: string;
}

enum PaperOrderType {
  MARKET = "MARKET",
  WITH_SLIPPAGE = "WITH_SLIPPAGE",
}

interface CopyWalletItem {
  id: number;
  wallet_address: string;
  tag?: string;
  enabled: boolean;
  start_at?: string;
  end_at?: string;
  pnl?: string;
}

interface CopyWalletSearchResponse {
  page_number: number;
  page_size: number;
  page_elements: number;
  total_pages: number;
  total_elements: number;
  content: CopyWalletItem[];
}

export default function Home() {
  const router = useRouter();
  const [signerPk, setSignerPk] = useState("");
  const [funderWallet, setFunderWallet] = useState("");
  const [key, setKey] = useState("");
  const [secret, setSecret] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [funderWalletError, setFunderWalletError] = useState("");
  const [showSignerPk, setShowSignerPk] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [copyWallets, setCopyWallets] = useState([""]);
  const [copyWalletErrors, setCopyWalletErrors] = useState<{
    [key: number]: string;
  }>({});
  const [ratio, setRatio] = useState("");
  const [minSize, setMinSize] = useState("");
  const [marketOrder, setMarketOrder] = useState(false);
  const [slippage, setSlippage] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [paperRatio, setPaperRatio] = useState("");
  const [paperSlippage, setPaperSlippage] = useState("");
  const [paperMarketOrder, setPaperMarketOrder] = useState(false);
  const [paperCopyWallets, setPaperCopyWallets] = useState<
    Array<{
      id: number;
      wallet: string;
      tag: string;
      startAt: string;
      endAt: string;
      pnl: string;
    }>
  >([]);
  const [showAddWalletPopup, setShowAddWalletPopup] = useState(false);
  const [newWalletAddress, setNewWalletAddress] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [walletToDelete, setWalletToDelete] = useState<{
    id: number;
    wallet: string;
  } | null>(null);
  const [copyHistory, setCopyHistory] = useState<CopyHistory[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [paperConfigError, setPaperConfigError] = useState("");
  const [activeTab, setActiveTab] = useState<"live" | "paper">("live");
  const [activeTabPaper, setActiveTabPaper] = useState<"config" | "activity">(
    "config"
  );
  const clobClientRef = useRef<ClobClient | null>(null);
  const clobClientParamsRef = useRef<string>("");
  const isRunningRef = useRef<boolean>(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [walletFilterAddress, setWalletFilterAddress] = useState("");
  const [walletFilterEnabled, setWalletFilterEnabled] = useState<
    boolean | null
  >(null);
  const [walletPageNumber, setWalletPageNumber] = useState(0);
  const [walletPageSize, setWalletPageSize] = useState(10);
  const [walletTotalPages, setWalletTotalPages] = useState(1);
  const [walletTotalElements, setWalletTotalElements] = useState(0);

  // Khởi tạo ClobClient một lần và tạo lại khi tham số thay đổi
  useEffect(() => {
    // Kiểm tra xem có đủ thông tin để tạo ClobClient không
    if (!signerPk || !key || !secret || !passphrase || !funderWallet) {
      clobClientRef.current = null;
      return;
    }

    // Tạo key để so sánh với lần trước
    const currentParams = `${signerPk}-${key}-${secret}-${passphrase}-${funderWallet}`;

    // Nếu tham số không thay đổi, giữ nguyên instance hiện tại
    if (
      clobClientParamsRef.current === currentParams &&
      clobClientRef.current
    ) {
      return;
    }

    // Cập nhật ref với tham số mới và tạo instance mới
    clobClientParamsRef.current = currentParams;

    try {
      const signer = new Wallet(signerPk);
      clobClientRef.current = new ClobClient(
        host,
        137,
        signer,
        {
          key: key,
          secret: secret,
          passphrase: passphrase,
        },
        signatureType,
        funderWallet
      );
      console.log("ClobClient đã được khởi tạo lại với tham số mới");
    } catch (error) {
      console.error("Error creating ClobClient:", error);
      clobClientRef.current = null;
    }
  }, [signerPk, key, secret, passphrase, funderWallet]);

  // Fetch current config from API
  useEffect(() => {
    const fetchCurrentConfig = async () => {
      if (activeTab === "paper" && activeTabPaper === "config") {
        setLoadingConfig(true);
        try {
          const response = await fetch("/api/config/currentConfig");
          if (!response.ok) {
            throw new Error("Failed to fetch config");
          }
          const data = await response.json();
          console.log("Current config:", data);

          // Update state with fetched data if available
          if (data.default_ratio !== undefined) {
            setPaperRatio(data.default_ratio.toString());
          }
          if (data.default_slippage !== undefined) {
            setPaperSlippage(data.default_slippage.toString());
          }
          if (data.order_type !== undefined) {
            setPaperMarketOrder(
              data.order_type === PaperOrderType.MARKET ? true : false
            );
          }
        } catch (error) {
          console.error("Error fetching current config:", error);
        } finally {
          setLoadingConfig(false);
        }
      }
    };

    fetchCurrentConfig();
  }, [activeTab, activeTabPaper]);

  // Fetch copy wallets from API
  const fetchCopyWallets = useCallback(async () => {
    if (activeTab === "paper" && activeTabPaper === "config") {
      try {
        const requestBody: {
          page_number: number;
          page_size: number;
          addresses?: string[];
          enabled?: boolean;
        } = {
          page_number: walletPageNumber,
          page_size: walletPageSize,
        };

        if (walletFilterAddress.trim()) {
          requestBody.addresses = [walletFilterAddress.trim()];
        }

        if (walletFilterEnabled !== null) {
          requestBody.enabled = walletFilterEnabled;
        }

        const response = await fetch("/api/config/copyWalletSearch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch copy wallets");
        }

        const data = await response.json();
        console.log("Copy wallets:", data);

        // Map response data to paperCopyWallets format
        const searchData = data as CopyWalletSearchResponse;
        if (searchData.content && Array.isArray(searchData.content)) {
          const mappedWallets = searchData.content.map(
            (item: CopyWalletItem) => ({
              id: item.id,
              wallet: item.wallet_address,
              tag: item.tag || "",
              startAt: item.start_at
                ? new Date(item.start_at).toLocaleString("vi-VN")
                : "",
              endAt: item.end_at
                ? new Date(item.end_at).toLocaleString("vi-VN")
                : "",
              pnl: item.pnl || "",
            })
          );
          setPaperCopyWallets(mappedWallets);
          setWalletTotalPages(searchData.total_pages);
          setWalletTotalElements(searchData.total_elements);
        }
      } catch (error) {
        console.error("Error fetching copy wallets:", error);
      }
    }
  }, [
    activeTab,
    activeTabPaper,
    walletPageNumber,
    walletPageSize,
    walletFilterAddress,
    walletFilterEnabled,
  ]);

  useEffect(() => {
    fetchCopyWallets();
  }, [fetchCopyWallets]);

  async function getCertKey() {
    const signer = new Wallet(signerPk);
    const creds = await new ClobClient(
      host,
      137,
      signer
    ).createOrDeriveApiKey();
    console.log(creds);
    setKey(creds.key);
    setSecret(creds.secret);
    setPassphrase(creds.passphrase);
  }

  function validateAddress(address: string): boolean {
    if (!address.startsWith("0x") || address.length !== 42) {
      return false;
    }
    return isAddress(address);
  }

  const handleFunderWalletBlur = (value: string) => {
    const trimmedValue = value.trim();
    if (trimmedValue) {
      if (!validateAddress(trimmedValue)) {
        setFunderWalletError("Địa chỉ ví không hợp lệ");
      } else {
        setFunderWalletError("");
      }
    } else {
      setFunderWalletError("");
    }
  };

  const handleGetInfo = () => {
    if (!signerPk.trim()) {
      setError("Vui lòng nhập đầy đủ Signer PK");
      return;
    }
    getCertKey();
    setError("");
  };

  const handleAddCopyWallet = () => {
    setCopyWallets([...copyWallets, ""]);
  };

  const handleCopyWalletChange = (index: number, value: string) => {
    const newWallets = [...copyWallets];
    newWallets[index] = value;
    setCopyWallets(newWallets);
    // Xóa lỗi khi người dùng bắt đầu nhập lại
    if (copyWalletErrors[index]) {
      const newErrors = { ...copyWalletErrors };
      delete newErrors[index];
      setCopyWalletErrors(newErrors);
    }
  };

  const handleCopyWalletBlur = (index: number, value: string) => {
    // Hàm này được gọi khi người dùng blur (bấm ra ngoài) khỏi input

    const trimmedValue = value.trim();
    const newErrors = { ...copyWalletErrors };

    // Xóa lỗi cũ của dòng này
    delete newErrors[index];

    // Kiểm tra nếu có giá trị
    if (trimmedValue) {
      // Validate địa chỉ
      if (!validateAddress(trimmedValue)) {
        newErrors[index] = "Địa chỉ ví không hợp lệ";
        setCopyWalletErrors(newErrors);
        return;
      }

      // Kiểm tra trùng lặp với các dòng khác
      // Tạo mảng tạm thời với giá trị mới để so sánh
      const tempWallets = [...copyWallets];
      tempWallets[index] = trimmedValue;

      const duplicateIndex = tempWallets.findIndex(
        (wallet, i) =>
          i !== index &&
          wallet.trim().toLowerCase() === trimmedValue.toLowerCase() &&
          wallet.trim() !== ""
      );

      if (duplicateIndex !== -1) {
        newErrors[index] = `Địa chỉ ví này đã được sử dụng ở dòng ${
          duplicateIndex + 1
        }`;
        setCopyWalletErrors(newErrors);
      } else {
        // Xử lý khi có giá trị hợp lệ
        setCopyWalletErrors(newErrors);
      }

      return;
    }

    setCopyWalletErrors(newErrors);
  };

  const handleRemoveCopyWallet = (index: number) => {
    if (copyWallets.length > 1) {
      const newWallets = copyWallets.filter((_, i) => i !== index);
      setCopyWallets(newWallets);
      // Xóa lỗi của dòng bị xóa và cập nhật index của các lỗi khác
      const newErrors: { [key: number]: string } = {};
      Object.keys(copyWalletErrors).forEach((key) => {
        const errorIndex = parseInt(key);
        if (errorIndex < index) {
          newErrors[errorIndex] = copyWalletErrors[errorIndex];
        } else if (errorIndex > index) {
          newErrors[errorIndex - 1] = copyWalletErrors[errorIndex];
        }
      });
      setCopyWalletErrors(newErrors);
    }
  };

  async function fetchAndCopyTrades(
    walletAddress: string,
    lastFetchedTimestamp: number
  ) {
    const url = `https://data-api.polymarket.com/trades?user=${walletAddress}&limit=50`;
    const response = await axios.get(url);
    if (response.data == null || response.data.length == 0) {
      return;
    }
    if (lastFetchedTimestamp === undefined) {
      lastFetchedTimestamp = response.data[0].timestamp;

      return {
        walletAddress: walletAddress,
        lastFetchedTimestamp: lastFetchedTimestamp,
      };
    }
    let newLastFetchedTimestamp = lastFetchedTimestamp;
    const copyTasks = [];
    for (const trade of response.data) {
      if (trade.timestamp > lastFetchedTimestamp) {
        copyTasks.push(
          doCopyTrade(
            trade.asset,
            trade.side === "BUY" ? 0 : 1,
            trade.size,
            trade.price,
            trade.title,
            trade.icon,
            walletAddress,
            trade.transactionHash
          )
        );
      }
      if (trade.timestamp > newLastFetchedTimestamp) {
        newLastFetchedTimestamp = trade.timestamp;
      }
    }
    const result = await Promise.all(copyTasks);

    result.forEach((item) => {
      if (item) {
        setCopyHistory((prev) => [item, ...prev]);
      }
    });

    return {
      walletAddress: walletAddress,
      lastFetchedTimestamp: newLastFetchedTimestamp,
    };
  }

  async function doCopyTrade(
    assetId: string,
    side: number,
    size: number,
    price: number,
    title: string,
    icon: string,
    copyFrom: string,
    txHash: string
  ) {
    const outComePrice = calculatePrice(side, price);
    const orderSide = side === 0 ? Side.BUY : Side.SELL;
    let orderSize = 0;
    if (orderSide === Side.BUY) {
      orderSize = calculateSize(size);
    } else {
      orderSize = size;
    }
    if (orderSize <= 0) {
      console.log("Invalid order size: ", size, " for Topic: ", title);
      return;
    }
    const res = await clobClientRef.current?.createAndPostOrder(
      {
        tokenID: assetId,
        price: outComePrice,
        side: orderSide,
        size: orderSize,
        feeRateBps: 0,
      },
      { tickSize: "0.01", negRisk: false },
      OrderType.GTC
    );

    // Gọi API route để lấy market info
    const apiResponse = await fetch(`/api/markets?clob_token_ids=${assetId}`);
    if (!apiResponse.ok) {
      console.error("API error:", await apiResponse.text());
      return undefined;
    }

    const marketData = await apiResponse.json();
    if (marketData == null || marketData.length == 0) {
      console.log("Market not found for topic: ", title);
      return undefined;
    }
    const market = marketData[0];
    const clobTokenIds = JSON.parse(market.clobTokenIds).map(String);
    const outComeIndex = clobTokenIds.indexOf(assetId);
    const outComeName = JSON.parse(market.outcomes).map(String)[outComeIndex];
    if (res == null || !res.success) {
      return undefined;
    }
    let finalPrice = 0.0;
    if (side === 0) {
      // BUY
      finalPrice = Number(res.makingAmount) / Number(res.takingAmount);
    } else {
      // SELL
      finalPrice = Number(res.takingAmount) / Number(res.makingAmount);
    }
    return {
      type: orderSide.toString(),
      market_title: title,
      market_image: icon,
      option: outComeName,
      share_price: finalPrice,
      share_amount: orderSize,
      total_price: finalPrice * orderSize,
      copy_from: copyFrom,
      copy_link: `https://polygonscan.com/tx/${txHash}`,
      tx_hash: res.transactionsHashes[0],
      tx_link: `https://polygonscan.com/tx/${res.transactionsHashes[0]}`,
    };
  }

  async function sleep(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function fetchJob() {
    const walletFetchedTimestampMap: Record<string, number> = {};
    while (isRunningRef.current) {
      // Kiểm tra lại trạng thái trước mỗi lần lặp
      if (!isRunningRef.current) {
        break;
      }

      const fetchTasks = [];
      for (const walletAddress of copyWallets) {
        // Kiểm tra lại trạng thái trước khi thêm task
        if (!isRunningRef.current) {
          break;
        }
        fetchTasks.push(
          fetchAndCopyTrades(
            walletAddress,
            walletFetchedTimestampMap[walletAddress]
          )
        );
      }

      // Nếu đã dừng, không cần chờ kết quả
      if (!isRunningRef.current) {
        break;
      }

      const results = await Promise.all(fetchTasks);
      results.forEach((item) => {
        if (item) {
          walletFetchedTimestampMap[item.walletAddress] =
            item.lastFetchedTimestamp;
        }
      });

      // Kiểm tra lại trước khi sleep
      if (!isRunningRef.current) {
        break;
      }

      await sleep(100);
    }
    console.log("fetchJob đã dừng");
  }

  const handleStart = () => {
    setErrorMessage("");
    if (
      copyWallets.length === 0 ||
      ratio === "" ||
      minSize === "" ||
      (!marketOrder && slippage === "") ||
      !signerPk ||
      !key ||
      !secret ||
      !passphrase
    ) {
      setErrorMessage("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    const newRunningState = !isRunning;

    // Cập nhật ref trước để fetchJob có thể kiểm tra ngay
    isRunningRef.current = newRunningState;
    setIsRunning(newRunningState);

    // Nếu đang start, chạy ngay lập tức lần đầu
    if (newRunningState) {
      fetchJob();
    } else {
      // Nếu đang stop, ref đã được set thành false ở trên
      console.log("Đã dừng fetchJob");
    }
  };

  function calculateSize(copySize: number): number {
    const size = copySize * parseFloat(ratio);
    if (size >= parseFloat(minSize)) {
      return size;
    }
    if (parseFloat(minSize) >= parseFloat(minSize)) {
      return parseFloat(minSize);
    }
    return 0;
  }

  function calculatePrice(orderSide: number, copyPrice: number): number {
    if (marketOrder) {
      if (orderSide == 0) {
        // BUY
        return 0.99;
      } else {
        // SELL
        return 0.01;
      }
    }
    if (orderSide == 0) {
      return copyPrice * (1 + parseFloat(slippage) / 100);
    } else {
      return copyPrice * (1 - parseFloat(slippage) / 100);
    }
  }

  return (
    <div className="min-h-screen flex justify-center p-4 bg-white">
      <div className="w-full max-w-7xl flex flex-col gap-6">
        {/* Tabs Component */}
        <div className="border-b border-gray-200">
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => setActiveTab("live")}
              className={`px-6 py-3 text-lg transition-colors duration-200 ${
                activeTab === "live"
                  ? "text-black border-b-2 border-blue-600 font-semibold"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50 font-medium"
              }`}
            >
              Live Trading
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("paper")}
              className={`px-6 py-3 text-lg transition-colors duration-200 ${
                activeTab === "paper"
                  ? "text-black border-b-2 border-blue-600 font-semibold"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50 font-medium"
              }`}
            >
              Paper Trading
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "live" && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Box Info */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 w-full">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">
                  Info
                </h2>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label
                        htmlFor="signer-pk"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Signer PK
                      </label>
                      <div className="relative group">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-gray-400 cursor-help hover:text-gray-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                          <div className="bg-gray-800 text-white text-xs rounded py-2 px-3 w-48 shadow-lg">
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                              <div className="border-4 border-transparent border-t-gray-800"></div>
                            </div>
                            Private Key của ví dùng để đăng nhập Polymarket
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type={showSignerPk ? "text" : "password"}
                        id="signer-pk"
                        value={signerPk}
                        onChange={(e) => setSignerPk(e.target.value)}
                        className={`w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 ${
                          isRunning ? "bg-gray-100" : ""
                        }`}
                        placeholder="Nhập Signer PK"
                        disabled={isRunning}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignerPk(!showSignerPk)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                      >
                        {showSignerPk ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                            />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label
                        htmlFor="funder-wallet"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Funder Wallet
                      </label>
                      <div className="relative group">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-gray-400 cursor-help hover:text-gray-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                          <div className="bg-gray-800 text-white text-xs rounded py-2 px-3 w-48 shadow-lg">
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                              <div className="border-4 border-transparent border-t-gray-800"></div>
                            </div>
                            Địa chỉ ví Polymarket của user (COpy trong trang
                            profile của Polymarket)
                          </div>
                        </div>
                      </div>
                    </div>
                    <input
                      type="text"
                      id="funder-wallet"
                      value={funderWallet}
                      onChange={(e) => {
                        setFunderWallet(e.target.value);
                        // Xóa lỗi khi người dùng bắt đầu nhập lại
                        if (funderWalletError) {
                          setFunderWalletError("");
                        }
                      }}
                      onBlur={(e) => handleFunderWalletBlur(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 text-gray-700 ${
                        funderWalletError
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                          : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                      } ${isRunning ? "bg-gray-100" : ""}`}
                      placeholder="Nhập Funder Wallet"
                      disabled={isRunning}
                    />
                    {funderWalletError && (
                      <p className="mt-1 text-sm text-red-600">
                        {funderWalletError}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Box API Info */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 w-full">
                <div className="flex items-center gap-2 mb-6">
                  <h2 className="text-xl font-semibold text-gray-800">
                    API Info
                  </h2>
                  <div className="relative group">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-gray-400 cursor-help hover:text-gray-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="bg-gray-800 text-white text-xs rounded py-2 px-3 w-48 shadow-lg">
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                          <div className="border-4 border-transparent border-t-gray-800"></div>
                        </div>
                        Hoàn thành các trường Signer PK và Funder Wallet để lấy
                        thông tin
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="key"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Key
                    </label>
                    <input
                      type="text"
                      id="key"
                      value={key}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-700 cursor-not-allowed"
                      placeholder=""
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="secret"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Secret
                    </label>
                    <div className="relative">
                      <input
                        type={showSecret ? "text" : "password"}
                        id="secret"
                        value={secret}
                        disabled
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-700 cursor-not-allowed"
                        placeholder=""
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                      >
                        {showSecret ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                            />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="passphrase"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Passphrase
                    </label>
                    <div className="relative">
                      <input
                        type={showPassphrase ? "text" : "password"}
                        id="passphrase"
                        value={passphrase}
                        disabled
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-700 cursor-not-allowed"
                        placeholder=""
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassphrase(!showPassphrase)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                      >
                        {showPassphrase ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                            />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleGetInfo}
                    className="w-full mt-6 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 font-medium"
                  >
                    Get Info
                  </button>
                </div>
              </div>
            </div>

            {/* Box Copy Config */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 w-full">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                Copy Config
              </h2>

              <div className="space-y-4">
                {copyWallets.map((wallet, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <label
                          htmlFor={`copy-wallet-${index}`}
                          className="block text-sm font-medium text-gray-700"
                        >
                          Copy wallets
                        </label>
                        <div className="relative group">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 text-gray-400 cursor-help hover:text-gray-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                            <div className="bg-gray-800 text-white text-xs rounded py-2 px-3 w-48 shadow-lg">
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                <div className="border-4 border-transparent border-t-gray-800"></div>
                              </div>
                              List các Polymarket cần copy
                            </div>
                          </div>
                        </div>
                      </div>
                      <input
                        type="text"
                        id={`copy-wallet-${index}`}
                        value={wallet}
                        onChange={(e) =>
                          handleCopyWalletChange(index, e.target.value)
                        }
                        onBlur={(e) =>
                          handleCopyWalletBlur(index, e.target.value)
                        }
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 text-gray-700 ${
                          copyWalletErrors[index]
                            ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                            : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                        }`}
                        placeholder="Nhập Copy wallets"
                        disabled={isRunning}
                      />
                      {copyWalletErrors[index] && (
                        <p className="mt-1 text-sm text-red-600">
                          {copyWalletErrors[index]}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 mt-7">
                      {copyWallets.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCopyWallet(index)}
                          className="flex items-center justify-center w-10 h-10 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200 font-medium text-xl"
                          title="Xóa dòng"
                          disabled={isRunning}
                        >
                          -
                        </button>
                      )}
                      {index === copyWallets.length - 1 && (
                        <button
                          type="button"
                          onClick={handleAddCopyWallet}
                          className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 font-medium text-xl"
                          title="Thêm dòng"
                          disabled={isRunning}
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label
                      htmlFor="ratio"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Ratio
                    </label>
                    <div className="relative group">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-gray-400 cursor-help hover:text-gray-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                        <div className="bg-gray-800 text-white text-xs rounded py-2 px-3 w-48 shadow-lg">
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                            <div className="border-4 border-transparent border-t-gray-800"></div>
                          </div>
                          tỉ lệ so với lệnh cần copy (VD: copy_size =
                          target_size * Ratio)
                        </div>
                      </div>
                    </div>
                  </div>
                  <input
                    type="number"
                    id="ratio"
                    value={ratio}
                    onChange={(e) => setRatio(e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 ${
                      isRunning ? "bg-gray-100" : ""
                    }`}
                    placeholder="Nhập Ratio"
                    disabled={isRunning}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label
                      htmlFor="min-size"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Min Size
                    </label>
                    <div className="relative group">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-gray-400 cursor-help hover:text-gray-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                        <div className="bg-gray-800 text-white text-xs rounded py-2 px-3 w-48 shadow-lg">
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                            <div className="border-4 border-transparent border-t-gray-800"></div>
                          </div>
                          Size lệnh nhỏ nhất user có thể BID (Nên = 5)
                        </div>
                      </div>
                    </div>
                  </div>
                  <input
                    type="number"
                    id="min-size"
                    value={minSize}
                    onChange={(e) => setMinSize(e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 ${
                      isRunning ? "bg-gray-100" : ""
                    }`}
                    placeholder="Nhập Min Size"
                    disabled={isRunning}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="market-order"
                    checked={marketOrder}
                    onChange={(e) => {
                      setMarketOrder(e.target.checked);
                      if (e.target.checked) {
                        setSlippage("");
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="market-order"
                    className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2"
                  >
                    Market order
                    <div className="relative group">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-gray-400 cursor-help hover:text-gray-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                        <div className="bg-gray-800 text-white text-xs rounded py-2 px-3 w-48 shadow-lg">
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                            <div className="border-4 border-transparent border-t-gray-800"></div>
                          </div>
                          Luôn mua với giá market (Nếu ticked trường slippage sẽ
                          vô hiệu hoá)
                        </div>
                      </div>
                    </div>
                  </label>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label
                      htmlFor="slippage"
                      className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2"
                    >
                      Slippage
                      <div className="relative group">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-gray-400 cursor-help hover:text-gray-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                          <div className="bg-gray-800 text-white text-xs rounded py-2 px-3 w-48 shadow-lg">
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                              <div className="border-4 border-transparent border-t-gray-800"></div>
                            </div>
                            % trượt giá so với lệnh copy có thể chấp nhận (Bị vô
                            hiệu khi market order tickede)
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>
                  <input
                    type="number"
                    id="slippage"
                    value={slippage}
                    onChange={(e) => setSlippage(e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 ${
                      marketOrder ? "bg-gray-100" : ""
                    } ${isRunning ? "bg-gray-100" : ""}`}
                    placeholder={marketOrder ? "" : "Nhập Slippage"}
                    disabled={marketOrder || isRunning}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleStart}
                  className={`w-full mt-6 text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200 font-medium ${
                    isRunning
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {isRunning ? "Stop" : "Start"}
                </button>
                {errorMessage && (
                  <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
                )}
              </div>
            </div>

            {/* Copy History Table */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 w-full">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                Copy History
              </h2>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse table-fixed">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-20">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-48">
                        Market
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-32">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-20">
                        Copy from
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-20">
                        TX hash
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {copyHistory.length > 0 ? (
                      copyHistory.map((item, index) => (
                        <tr
                          key={index}
                          className="border-b border-gray-200 hover:bg-gray-50"
                        >
                          {/* Type Column */}
                          <td
                            className={`px-4 py-3 text-sm text-gray-700 ${
                              item.type === "SELL"
                                ? "text-red-500"
                                : "text-green-500"
                            }`}
                          >
                            {item.type}
                          </td>

                          {/* Market Column */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={item.market_image}
                                alt={item.market_title}
                                className="w-10 h-10 rounded object-cover"
                              />
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-700">
                                    {item.market_title}
                                  </span>
                                </div>
                                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded w-fit">
                                  {item.option} {item.share_price.toFixed(2)} $
                                </span>
                                <span className="text-xs text-gray-500">
                                  {item.share_amount.toFixed(2)} shares
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Amount Column */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col gap-1">
                                <span className="text-sm font-medium text-gray-700">
                                  {item.total_price.toFixed(2)} $
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Copy from Column */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm text-gray-700">
                                {item.copy_from.slice(0, 4)}...
                                {item.copy_from.slice(-4)}
                              </span>
                              <a
                                href={item.copy_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 underline"
                              >
                                Xem chi tiết
                              </a>
                            </div>
                          </td>

                          {/* TX hash Column */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm text-gray-700">
                                {item.tx_hash.slice(0, 4)}...
                                {item.tx_hash.slice(-4)}
                              </span>
                              <a
                                href={item.tx_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 underline"
                              >
                                Xem chi tiết
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-b border-gray-200">
                        <td
                          colSpan={5}
                          className="px-4 py-3 text-sm text-gray-500 text-center"
                        >
                          Không có dữ liệu
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "paper" && (
          <div className="flex flex-col gap-6">
            {/* Tabs Paper Trading */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTabPaper("config")}
                className={`px-4 py-2 text-sm transition-colors duration-200 rounded-lg ${
                  activeTabPaper === "config"
                    ? "text-blue-600 bg-blue-50 font-semibold"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-50 font-medium"
                }`}
              >
                Config
              </button>
              <button
                type="button"
                onClick={() => setActiveTabPaper("activity")}
                className={`px-4 py-2 text-sm transition-colors duration-200 rounded-lg ${
                  activeTabPaper === "activity"
                    ? "text-blue-600 bg-blue-50 font-semibold"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-50 font-medium"
                }`}
              >
                Activity
              </button>
            </div>

            {/* Box System Config */}
            {activeTabPaper === "config" && (
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 w-full">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">
                  System Config
                </h2>

                {loadingConfig && (
                  <div className="mb-4 text-sm text-gray-500">
                    Đang tải cấu hình...
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label
                        htmlFor="paper-ratio"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Ratio
                      </label>
                    </div>
                    <input
                      type="number"
                      id="paper-ratio"
                      value={paperRatio}
                      onChange={(e) => setPaperRatio(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                      placeholder="Nhập Ratio"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label
                        htmlFor="paper-slippage"
                        className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2"
                      >
                        Slippage
                      </label>
                    </div>
                    <input
                      type="number"
                      id="paper-slippage"
                      value={paperSlippage}
                      onChange={(e) => setPaperSlippage(e.target.value)}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700`}
                      placeholder="Nhập Slippage"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="paper-market-order"
                      checked={paperMarketOrder}
                      onChange={(e) => {
                        setPaperMarketOrder(e.target.checked);
                        if (e.target.checked) {
                          setPaperSlippage("");
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label
                      htmlFor="paper-market-order"
                      className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2"
                    >
                      Market order
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      // Validate required fields
                      setPaperConfigError("");

                      if (!paperRatio || paperRatio.trim() === "") {
                        setPaperConfigError("Vui lòng nhập Ratio");
                        return;
                      }

                      if (!paperSlippage || paperSlippage.trim() === "") {
                        setPaperConfigError("Vui lòng nhập Slippage");
                        return;
                      }

                      // Validate numeric values
                      const ratioValue = parseFloat(paperRatio);
                      const slippageValue = parseFloat(paperSlippage);

                      if (isNaN(ratioValue)) {
                        setPaperConfigError("Ratio phải là số hợp lệ");
                        return;
                      }

                      if (isNaN(slippageValue)) {
                        setPaperConfigError("Slippage phải là số hợp lệ");
                        return;
                      }

                      try {
                        const response = await fetch(
                          "/api/config/updateConfig",
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              default_ratio: ratioValue,
                              default_slippage: slippageValue,
                              order_type: paperMarketOrder
                                ? "MARKET"
                                : "WITH_SLIPPAGE",
                            }),
                          }
                        );

                        if (!response.ok) {
                          throw new Error("Failed to update config");
                        }

                        const data = await response.json();
                        console.log("Config updated successfully:", data);
                        setPaperConfigError("");
                        // Có thể thêm thông báo thành công ở đây
                      } catch (error) {
                        console.error("Error updating config:", error);
                        setPaperConfigError(
                          "Có lỗi xảy ra khi cập nhật cấu hình"
                        );
                      }
                    }}
                    className="w-full mt-6 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 font-medium"
                  >
                    Save
                  </button>
                  {paperConfigError && (
                    <p className="mt-2 text-sm text-red-600">
                      {paperConfigError}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Copy Wallets Table */}
            {activeTabPaper === "config" && (
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 w-full">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">
                  Copy Wallets
                </h2>

                {/* Filter Section */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label
                        htmlFor="filter-address"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Filter by Address
                      </label>
                      <input
                        type="text"
                        id="filter-address"
                        value={walletFilterAddress}
                        onChange={(e) => setWalletFilterAddress(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                        placeholder="Nhập địa chỉ wallet"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="filter-enabled"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Filter by Status
                      </label>
                      <select
                        id="filter-enabled"
                        value={
                          walletFilterEnabled === null
                            ? ""
                            : walletFilterEnabled
                            ? "true"
                            : "false"
                        }
                        onChange={(e) => {
                          if (e.target.value === "") {
                            setWalletFilterEnabled(null);
                          } else {
                            setWalletFilterEnabled(e.target.value === "true");
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                      >
                        <option value="">Tất cả</option>
                        <option value="true">Enabled</option>
                        <option value="false">Disabled</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="page-size"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Items per page
                      </label>
                      <select
                        id="page-size"
                        value={walletPageSize}
                        onChange={(e) => {
                          setWalletPageSize(Number(e.target.value));
                          setWalletPageNumber(0); // Reset to first page
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                      >
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={fetchCopyWallets}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 font-medium text-sm"
                    >
                      Search
                    </button>
                    <div className="text-sm text-gray-600">
                      Tổng: {walletTotalElements} wallets
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          ID
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Wallet
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Tag
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Start at
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          End at
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          PnL
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {paperCopyWallets.length > 0 ? (
                        paperCopyWallets.map((item) => (
                          <tr
                            key={item.id}
                            className="border-b border-gray-200 hover:bg-gray-50"
                          >
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {item.id}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 cursor-pointer hover:text-blue-600 hover:underline transition-colors duration-200">
                              <a
                                href={`/wallet/${item.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {item.wallet}
                              </a>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {item.tag}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {item.startAt}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {item.endAt}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {item.pnl}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setWalletToDelete({
                                    id: item.id,
                                    wallet: item.wallet,
                                  });
                                  setShowDeleteConfirm(true);
                                }}
                                className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
                              >
                                Xóa
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr className="border-b border-gray-200">
                          <td
                            colSpan={7}
                            className="px-4 py-3 text-sm text-gray-500 text-center"
                          >
                            Không có dữ liệu
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {walletTotalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (walletPageNumber > 0) {
                            setWalletPageNumber(walletPageNumber - 1);
                          }
                        }}
                        disabled={walletPageNumber === 0}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">
                          Page {walletPageNumber + 1} of {walletTotalPages}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (walletPageNumber < walletTotalPages - 1) {
                            setWalletPageNumber(walletPageNumber + 1);
                          }
                        }}
                        disabled={walletPageNumber >= walletTotalPages - 1}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowAddWalletPopup(true)}
                  className="mt-4 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 font-medium"
                >
                  ADD WALLET
                </button>
              </div>
            )}

            {/* Delete Confirm Popup */}
            {showDeleteConfirm && walletToDelete && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Xác nhận xóa
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Bạn có chắc chắn muốn xóa wallet{" "}
                    <span className="font-medium text-gray-800">
                      {walletToDelete.wallet}
                    </span>{" "}
                    không?
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setWalletToDelete(null);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaperCopyWallets(
                          paperCopyWallets.filter(
                            (wallet) => wallet.id !== walletToDelete.id
                          )
                        );
                        setShowDeleteConfirm(false);
                        setWalletToDelete(null);
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Add Wallet Popup */}
            {showAddWalletPopup && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Add Wallet
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="new-wallet"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Wallet
                      </label>
                      <input
                        type="text"
                        id="new-wallet"
                        value={newWalletAddress}
                        onChange={(e) => setNewWalletAddress(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                        placeholder="Nhập địa chỉ wallet"
                      />
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddWalletPopup(false);
                          setNewWalletAddress("");
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!newWalletAddress.trim()) {
                            return;
                          }

                          // Validate wallet address
                          if (!validateAddress(newWalletAddress.trim())) {
                            alert("Địa chỉ ví không hợp lệ");
                            return;
                          }

                          try {
                            const response = await fetch(
                              "/api/config/addCopyWallet",
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                  wallet_address: newWalletAddress.trim(),
                                  tag: "", // Optional, có thể thêm input cho tag sau
                                }),
                              }
                            );

                            if (!response.ok) {
                              const errorData = await response.json();
                              throw new Error(
                                errorData.error || "Failed to add wallet"
                              );
                            }

                            const data = await response.json();
                            console.log("Wallet added successfully:", data);

                            // Refresh the wallet list using copyWalletSearch
                            const searchResponse = await fetch(
                              "/api/config/copyWalletSearch",
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                  page_number: 0,
                                  page_size: 10,
                                }),
                              }
                            );

                            if (searchResponse.ok) {
                              const searchData =
                                (await searchResponse.json()) as CopyWalletSearchResponse;
                              if (
                                searchData.content &&
                                Array.isArray(searchData.content)
                              ) {
                                const mappedWallets = searchData.content.map(
                                  (item: CopyWalletItem) => ({
                                    id: item.id,
                                    wallet: item.wallet_address,
                                    tag: item.tag || "",
                                    startAt: item.start_at
                                      ? new Date(item.start_at).toLocaleString(
                                          "vi-VN"
                                        )
                                      : "",
                                    endAt: item.end_at
                                      ? new Date(item.end_at).toLocaleString(
                                          "vi-VN"
                                        )
                                      : "",
                                    pnl: item.pnl || "",
                                  })
                                );
                                setPaperCopyWallets(mappedWallets);
                              }
                            }

                            setNewWalletAddress("");
                            setShowAddWalletPopup(false);
                          } catch (error) {
                            console.error("Error adding wallet:", error);
                            alert(
                              error instanceof Error
                                ? error.message
                                : "Có lỗi xảy ra khi thêm wallet"
                            );
                          }
                        }}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
