import { ClobClient } from "@polymarket/clob-client";

const host = "https://clob.polymarket.com";

export const clobClient = new ClobClient(host, 137);

// Chỉ chạy 1 lần
let ready = false;

export async function getClob() {
  if (!ready) {
    await clobClient.createOrDeriveApiKey();
    ready = true;
  }
  return clobClient;
}
