import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const walletId = searchParams.get("walletId");

    if (!walletId) {
      return NextResponse.json(
        { error: "walletId parameter is required" },
        { status: 400 }
      );
    }

    const url = `http://polymarketcopytrading.0xtris.xyz/botServer/api/wallet/info?walletId=${walletId}`;
    const response = await axios.get(url);

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error fetching wallet info:", error);
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        { error: error.message || "Failed to fetch wallet info" },
        { status: error.response?.status || 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch wallet info" },
      { status: 500 }
    );
  }
}
