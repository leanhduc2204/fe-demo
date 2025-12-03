import axios from "axios";
import https from "https";

// Tạo axios instance với cấu hình để xử lý SSL certificate
// Mặc định trong development sẽ bỏ qua certificate verification để tránh lỗi
// Trong production sẽ yêu cầu certificate verification để đảm bảo an toàn
// Có thể override bằng environment variable:
// - NODE_TLS_REJECT_UNAUTHORIZED=0: bỏ qua verification
// - NODE_TLS_REJECT_UNAUTHORIZED=1: yêu cầu verification (mặc định trong production)
// - ALLOW_INSECURE_HTTPS=true: bỏ qua verification (chỉ dùng cho development)
const isProduction = process.env.NODE_ENV === "production";
const allowInsecure =
  process.env.ALLOW_INSECURE_HTTPS === "true" ||
  process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0";

// Trong development, mặc định cho phép bỏ qua certificate verification
// Trong production, mặc định yêu cầu certificate verification
const rejectUnauthorized = isProduction && !allowInsecure;

const httpsAgent = new https.Agent({
  rejectUnauthorized,
});

export const axiosInstance = axios.create({
  httpsAgent,
  timeout: 30000, // 30 seconds timeout
});
