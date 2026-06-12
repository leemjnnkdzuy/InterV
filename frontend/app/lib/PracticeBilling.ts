export const CREDIT_VND_RATE = 100;
export const QUESTION_CREDIT_COST = 10;
export const JD_UPLOAD_CREDIT_COST = 10;

export interface PracticeQuoteInput {
  duration: number;
  hasUploadedJdFile: boolean;
  balanceCredits?: number;
}

export interface PracticeQuoteBreakdownItem {
  key: "aiQuestions" | "jdUpload";
  label: string;
  credits: number;
}

export interface PracticeQuote {
  totalCredits: number;
  vndEquivalent: number;
  balanceCredits: number;
  remainingCredits: number;
  canAfford: boolean;
  breakdown: PracticeQuoteBreakdownItem[];
}

export function calculatePracticeQuote({
  duration,
  hasUploadedJdFile,
  balanceCredits = 0,
}: PracticeQuoteInput): PracticeQuote {
  const safeDuration = Math.max(1, Math.min(25, Math.trunc(duration || 1)));
  const questionCredits = safeDuration * QUESTION_CREDIT_COST;
  const jdCredits = hasUploadedJdFile ? JD_UPLOAD_CREDIT_COST : 0;
  const totalCredits = questionCredits + jdCredits;
  const remainingCredits = balanceCredits - totalCredits;

  const breakdown: PracticeQuoteBreakdownItem[] = [
    {
      key: "aiQuestions",
      label: `Bộ câu hỏi AI (${safeDuration} câu)`,
      credits: questionCredits,
    },
  ];

  if (hasUploadedJdFile) {
    breakdown.push({
      key: "jdUpload",
      label: "Xử lý JD upload",
      credits: jdCredits,
    });
  }

  return {
    totalCredits,
    vndEquivalent: totalCredits * CREDIT_VND_RATE,
    balanceCredits,
    remainingCredits,
    canAfford: remainingCredits >= 0,
    breakdown,
  };
}
