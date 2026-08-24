export type CreditLogAction =
  | "RECHARGE"
  | "AI_INTERVIEW"
  | "AI_INTERVIEW_REFUND"
  | "AI_JD_EXTRACT"
  | "REGISTER_BONUS"
  | "ADMIN_ADJUST"
  | "RECRUITMENT_CAMPAIGN"
  | "RECRUITMENT_REFUND";

export type CreditTransactionStatus =
  | "PENDING"
  | "PAID"
  | "CANCELLED"
  | "EXPIRED";

export interface CreditLogItem {
  id: string;
  credits: number;
  action: CreditLogAction;
  description?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CreditTransactionItem {
  id: string;
  orderCode: number;
  packageId?: string;
  amount: number;
  credits: number;
  status: CreditTransactionStatus;
  createdAt: string;
  paidAt?: string;
  expiresAt?: string;
}

export interface CreditHistoryResponse {
  success: boolean;
  message?: string;
  creditLogs?: CreditLogItem[];
  transactions?: CreditTransactionItem[];
}

export interface CreditPageProps {
  setActiveTab: (tab: string) => void;
  creditLogs: CreditLogItem[];
  transactions: CreditTransactionItem[];
  isLoading: boolean;
}

export interface UsedCreditPageProps {
  setActiveTab: (tab: string) => void;
  creditLogs: CreditLogItem[];
  isLoading: boolean;
}

export interface RechargeCreditPageProps {
  setActiveTab: (tab: string) => void;
  transactions: CreditTransactionItem[];
  isLoading: boolean;
}

export interface RechargePackage {
  id: string;
  amount: number;
  credit: number;
  bonus: number;
  popular?: boolean;
}

export interface RechargeDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onPendingPaymentChange?: (hasPendingPayment: boolean) => void;
  resumePendingPayment?: boolean;
}

export interface CreatePaymentResponse {
  success: boolean;
  paymentUrl?: string;
  orderCode: number;
  amount: number;
  credits: number;
  packageId?: string;
  accountNumber?: string;
  accountName?: string;
  description?: string;
  bin?: string;
  qrCode?: string;
  qrImageUrl?: string;
  checkoutUrl?: string;
  expiredAt: number;
  message?: string;
}

export interface PendingPaymentResponse {
  success: boolean;
  paymentData: CreatePaymentResponse | null;
  message?: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  status: "PENDING" | "PAID" | "CANCELLED" | "EXPIRED";
  providerStatus?: string;
  balance?: number;
  message?: string;
}
