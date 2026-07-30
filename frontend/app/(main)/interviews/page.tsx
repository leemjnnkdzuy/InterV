import type { Metadata } from "next";

import UserInterviewsPage from "@/app/pages/UserInterviewsPage";

export const metadata: Metadata = {
  title: "Buổi phỏng vấn | InterV",
  description:
    "Theo dõi và tham gia các buổi phỏng vấn do nhà tuyển dụng gửi đến bạn.",
};

export default function Page() {
  return <UserInterviewsPage />;
}
