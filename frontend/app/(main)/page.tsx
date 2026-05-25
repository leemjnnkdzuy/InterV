"use client";

import { useAuthContext } from "@/app/contexts/AuthContext";
import HomePage from "@/app/pages/HomePage";
import LandingPage from "@/app/pages/LandingPage";
import { useMetadata } from "@/app/hooks/useMetadata";

export default function RootPage() {
  const { isAuthenticated, loading } = useAuthContext();

  useMetadata({
    title: "InterV - Nền tảng luyện phỏng vấn AI thông minh",
    description: "Trải nghiệm luyện phỏng vấn với AI thực tế, nhận phản hồi ngay lập tức và cải thiện kỹ năng của bạn.",
    keywords: "phỏng vấn AI, luyện phỏng vấn, InterV, AI interview practice",
  });

  if (loading) return null;

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return <HomePage />;
}
