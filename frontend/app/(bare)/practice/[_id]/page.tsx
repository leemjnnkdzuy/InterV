import React from "react";
import PracticePage from "@/app/pages/PracticePage";
import { Metadata } from "next";

type Props = {
  params: Promise<{ _id: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Buổi phỏng vấn giả lập | InterV",
    description: "Thực hiện phỏng vấn đối thoại trực tiếp với AI chuyên gia phỏng vấn của InterV.",
  };
}

export default async function Page({ params }: Props) {
  const { _id } = await params;
  return <PracticePage practiceId={_id} />;
}
