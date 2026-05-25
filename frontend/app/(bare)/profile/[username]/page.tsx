import React from "react";
import ProfilePage from "@/app/pages/ProfilePage";
import { Metadata } from "next";

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `${username} | InterV`,
    description: `Trang cá nhân của ${username} tại InterV - Nền tảng giả lập phỏng vấn AI thế hệ mới.`,
  };
}

export default async function Page({ params }: Props) {
  const { username } = await params;
  return <ProfilePage targetUsername={username} />;
}
