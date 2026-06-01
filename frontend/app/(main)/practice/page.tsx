import React from "react";
import PracticeProjectPage from "@/app/pages/PracticeProjectPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Luyện phỏng vấn AI | InterV",
  description: "Chuẩn bị tốt nhất cho buổi phỏng vấn của bạn bằng cách luyện tập với AI thực tế.",
};

export default function Page() {
  return <PracticeProjectPage />;
}
