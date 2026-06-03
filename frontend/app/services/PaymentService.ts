import api from "@/app/lib/Client";
import type { CreatePaymentResponse, VerifyPaymentResponse } from "@/app/types";

export const paymentService = {
  createPayment: async (amount: number): Promise<CreatePaymentResponse> => {
    const response = await api.post("/payment/create", { amount });
    return response.data;
  },

  verifyPayment: async (orderCode: number, mock: boolean): Promise<VerifyPaymentResponse> => {
    const response = await api.post("/payment/verify", { orderCode, mock });
    return response.data;
  },
};
