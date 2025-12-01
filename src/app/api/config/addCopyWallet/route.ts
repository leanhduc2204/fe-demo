import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.wallet_address) {
      return NextResponse.json(
        { error: "wallet_address is required" },
        { status: 400 }
      );
    }

    const url = "http://192.168.1.26:18080/api/config/addCopyWallet";
    const response = await axios.post(url, body, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error adding copy wallet:", error);
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        { error: error.message || "Failed to add copy wallet" },
        { status: error.response?.status || 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to add copy wallet" },
      { status: 500 }
    );
  }
}
