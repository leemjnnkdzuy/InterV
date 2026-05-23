"use client";

import LandingPage from "@/app/pages/LandingPage";
import {useMetadata} from "@/app/hooks/useMetadata";

export default function BarePage() {
	useMetadata({
		title: "InterV",
		description: "Trải nghiệm luyện phỏng vấn với AI thực tế, nhận phản hồi ngay lập tức và cải thiện kỹ năng của bạn.",
		keywords: "phỏng vấn AI, luyện phỏng vấn, InterV, AI interview practice",
	});

	return <LandingPage />;
}

