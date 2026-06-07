import React from "react";
import ProfilePage from "@/app/pages/ProfilePage";
import { Metadata } from "next";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/app/lib/Auth";
import connectDB from "@/app/lib/ConnectDB";
import User from "@/app/models/User";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  let title = "Thông tin cá nhân | InterV";
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;
    if (accessToken) {
      const payload = verifyAccessToken(accessToken);
      if (payload?.userId) {
        await connectDB();
        const user = await User.findById(payload.userId).select("username").lean();
        if (user?.username) {
          title = `${user.username} | InterV`;
        }
      }
    }
  } catch (error) {
    console.error("Error generating profile page metadata:", error);
  }

  return {
    title,
    description: "Trang cá nhân của ứng viên tại InterV - Nền tảng giả lập phỏng vấn AI thế hệ mới.",
  };
}

export default function Page() {
  return <ProfilePage />;
}
