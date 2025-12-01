import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate required fields
    if (
      body.page_number === undefined ||
      body.page_size === undefined ||
      body.wallet_id === undefined ||
      !body.tab
    ) {
      return NextResponse.json(
        {
          error:
            "page_number, page_size, wallet_id, and tab are required fields",
        },
        { status: 400 }
      );
    }

    const url = "http://192.168.1.26:18080/api/wallet/statSearch";
    const response = await axios.post(url, body, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error fetching stat search:", error);
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        { error: error.message || "Failed to fetch stat search" },
        { status: error.response?.status || 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch stat search" },
      { status: 500 }
    );
  }
}
