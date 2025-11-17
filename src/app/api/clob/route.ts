import { getClob } from "@/lib/clob";
import { OrderType } from "@polymarket/clob-client";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const clob = await getClob();

  const res = await clob.createAndPostOrder(
    {
      tokenID: body.tokenID,
      price: body.price,
      side: body.side,
      size: body.size,
      feeRateBps: 0,
    },
    { tickSize: "0.001", negRisk: false },
    OrderType.GTC
  );

  return NextResponse.json(res);
}
