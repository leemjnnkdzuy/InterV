import api from "@/app/lib/Client";
import type {
  CreatePaymentResponse,
  PendingPaymentResponse,
  VerifyPaymentResponse,
} from "@/app/types";

export const paymentService = {
  createPayment: async (packageId: string): Promise<CreatePaymentResponse> => {
    const response = await api.post<CreatePaymentResponse>("/payment/create", {
      packageId,
    });
    return response.data;
  },

  getPendingPayment: async (): Promise<PendingPaymentResponse> => {
    const response = await api.get<PendingPaymentResponse>("/payment/pending");
    return response.data;
  },

  checkPaymentStatus: async (orderCode: number): Promise<VerifyPaymentResponse> => {
    const response = await api.get<VerifyPaymentResponse>(
      `/payment/check-status?orderCode=${encodeURIComponent(orderCode)}`
    );
    return response.data;
  },

  cancelPayment: async (orderCode: number): Promise<VerifyPaymentResponse> => {
    const response = await api.post<VerifyPaymentResponse>("/payment/cancel", {
      orderCode,
    });
    return response.data;
  },

  verifyPayment: async (orderCode: number): Promise<VerifyPaymentResponse> => {
    const response = await api.post<VerifyPaymentResponse>("/payment/verify", {
      orderCode,
    });
    return response.data;
  },
};
