import { NextResponse } from "next/server";
import axios from "axios";

export async function GET() {
  try {
    const url = "http://192.168.1.26:18080/api/config/currentConfig";
    const response = await axios.get(url);

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error fetching current config:", error);
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        { error: error.message || "Failed to fetch current config" },
        { status: error.response?.status || 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch current config" },
      { status: 500 }
    );
  }
}
