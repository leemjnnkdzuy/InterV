import React from "react";
import PracticeProjectPage from "@/app/pages/PracticeProjectPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lịch sử luyện tập | InterV",
  description: "Xem lại các buổi luyện phỏng vấn AI và kết quả đánh giá của bạn.",
};

export default function Page() {
  return <PracticeProjectPage />;
}
