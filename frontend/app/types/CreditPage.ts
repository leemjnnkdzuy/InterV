export type CreditLogAction =
  | "RECHARGE"
  | "AI_INTERVIEW"
  | "AI_INTERVIEW_REFUND"
  | "AI_JD_EXTRACT"
  | "REGISTER_BONUS"
  | "ADMIN_ADJUST";

export type CreditTransactionStatus = "PENDING" | "PAID" | "CANCELLED";

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
  amount: number;
  credits: number;
  status: CreditTransactionStatus;
  createdAt: string;
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
  amount: number;
  credit: number;
  bonus: number;
  popular?: boolean;
}

export interface RechargeDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface CreatePaymentResponse {
  success: boolean;
  paymentUrl: string;
  orderCode: number;
  message?: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  status: string;
  message?: string;
}
