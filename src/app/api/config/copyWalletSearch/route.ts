import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.page_number === undefined || body.page_size === undefined) {
      return NextResponse.json(
        { error: "page_number and page_size are required" },
        { status: 400 }
      );
    }

    const url = "http://192.168.1.26:18080/api/config/copyWalletSearch";
    const response = await axios.post(url, body, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error searching copy wallets:", error);
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        { error: error.message || "Failed to search copy wallets" },
        { status: error.response?.status || 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to search copy wallets" },
      { status: 500 }
    );
  }
}
