import React from "react";
import PracticeHistoryPage from "@/app/pages/PracticeHistoryPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lịch sử luyện tập | InterV",
  description: "Xem lại các buổi luyện phỏng vấn AI và kết quả đánh giá của bạn.",
};

export default function Page() {
  return <PracticeHistoryPage />;
}
