import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const url =
      "http://polymarketcopytrading.0xtris.xyz/botServer/api/config/updateConfig";
    const response = await axios.post(url, body, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error updating config:", error);
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        { error: error.message || "Failed to update config" },
        { status: error.response?.status || 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update config" },
      { status: 500 }
    );
  }
}
