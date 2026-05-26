import { PayOS } from "@payos/node";

const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID || "MOCK_CLIENT_ID",
  apiKey: process.env.PAYOS_API_KEY || "MOCK_API_KEY",
  checksumKey: process.env.PAYOS_CHECKSUM_KEY || "MOCK_CHECKSUM_KEY",
});

export default payos;
