import { PayOS } from "@payos/node";

let payos: PayOS | null = null;

export function getPayOS(): PayOS {
  if (payos) {
    return payos;
  }

  const clientId = process.env.PAYOS_CLIENT_ID?.trim();
  const apiKey = process.env.PAYOS_API_KEY?.trim();
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY?.trim();
  if (!clientId || !apiKey || !checksumKey) {
    throw new Error(
      "PayOS chưa được cấu hình đầy đủ. Kiểm tra PAYOS_CLIENT_ID, PAYOS_API_KEY và PAYOS_CHECKSUM_KEY."
    );
  }

  payos = new PayOS({ clientId, apiKey, checksumKey });
  return payos;
}
