import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clobTokenIds = searchParams.get("clob_token_ids");

  if (!clobTokenIds) {
    return NextResponse.json(
      { error: "clob_token_ids parameter is required" },
      { status: 400 }
    );
  }

  try {
    const url = `https://gamma-api.polymarket.com/markets?clob_token_ids=${clobTokenIds}`;
    const response = await axios.get(url);

    console.log(response.data, "response.data===================");

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error fetching markets:", error);
    return NextResponse.json(
      { error: "Failed to fetch markets" },
      { status: 500 }
    );
  }
}
