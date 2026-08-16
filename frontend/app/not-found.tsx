"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, HomeAngle } from "@solar-icons/react";
import { Button } from "@/app/components/ui/button";
import { logo, trong_dong } from "@/app/assets";

export default function NotFound() {
	const router = useRouter();
	return (
		<div className="min-h-screen bg-background text-foreground overflow-hidden relative flex items-center">
			{/* Right Side - Rotating Trống Đồng Background (50% visible) */}
			<div
				className="absolute right-[12.5%] top-1/2 w-[120%] h-[120%] opacity-[0.15] pointer-events-none animate-spin-slow-404"
				style={{ transformOrigin: "center" }}
			>
				<Image
					src={trong_dong}
					alt="Decoration"
					fill
					className="object-contain"
					style={{
						filter: "brightness(0.9) saturate(1.5) hue-rotate(180deg) contrast(1.1) drop-shadow(0 0 25px rgba(138, 228, 255, 0.6))",
					}}
					priority
				/>
			</div>

			{/* Left Side - Content */}
			<div className="relative z-10 px-6 lg:px-20 xl:px-32 py-16 max-w-5xl">
				{/* Logo */}
				<div className="mb-8 flex items-center gap-4">
					<div className="relative w-20 h-20 flex items-center justify-center">
						<Image
							src={logo}
							alt="InterV Logo"
							width={80}
							height={80}
							className="invert dark:invert-0 object-contain"
							priority
						/>
					</div>
					<span className="font-logo font-bold text-5xl tracking-tight text-foreground">
						InterV<span className="text-[var(--chart-1)]">.</span>
					</span>
				</div>

				{/* Title */}
				<h1 className="text-7xl lg:text-5xl font-black mb-4 leading-none text-foreground">
					Không tìm thấy trang !!
				</h1>

				{/* Subtitle */}
				<p className="text-muted-foreground text-xl lg:text-2xl mb-10 leading-relaxed max-w-xl">
					Trang bạn đang tìm kiếm chúng tôi không tìm thấy.
					Bạn có thể đã nhập sai địa chỉ hoặc trang đã bị xóa. Đừng lo, hãy quay lại trang chủ và tiếp tục luyện tập phỏng vấn cùng AI nhé!
				</p>

				{/* Action Buttons */}
				<div className="flex flex-col sm:flex-row gap-4 max-w-md">
					<Button
						className="flex-1 bg-foreground text-background hover:bg-foreground/90 rounded-2xl px-8 font-semibold h-12 text-base shadow-lg transition-all duration-300 cursor-pointer"
						onClick={() => router.push("/")}
					>
						<span className="flex items-center justify-center gap-2 w-full">
							<HomeAngle className="h-5 w-5" />
							Về Trang Chủ
						</span>
					</Button>

					<Button
						asChild
						variant="outline"
						className="flex-1 border-border bg-transparent hover:bg-accent/10 text-foreground rounded-2xl px-8 font-semibold h-12 text-base cursor-pointer"
					>
						<button
							onClick={() => window.history.back()}
							className="flex items-center justify-center gap-2 w-full cursor-pointer"
						>
							<ArrowLeft className="h-5 w-5" />
							Quay Lại
						</button>
					</Button>
				</div>
			</div>
		</div>
	);
}
