"use client";

import React from "react";
// images replaced with icons — Image import removed
import {Button} from "@/app/components/ui/button";
import {motion} from "framer-motion";
import {
	Cloud,
	Megaphone,
	MessageSquare,
	Users,
	ChevronRight,
	Star,
	Zap,
	Bell,
	Heart,
	Globe,
} from "lucide-react";

interface OrbitItem {
	type: "avatar" | "badge";
	src?: string;
	alt?: string;
	icon?:
		| "cloud"
		| "megaphone"
		| "message"
		| "users"
		| "star"
		| "zap"
		| "bell"
		| "heart"
		| "globe";
	color?: string;
	angle: number;
	glow: string;
}

interface OrbitRingConfig {
	size: number;
	itemRadius: number;
	borderColor: string;
	boxShadow: string;
	maskFrom: string;
	duration: number;
	direction: 1 | -1;
	items: OrbitItem[];
}

const orbitRings: OrbitRingConfig[] = [
	{
		size: 600,
		itemRadius: 300,
		borderColor: "rgba(255,255,255,0.4)",
		boxShadow: "0 0 15px 1px rgba(168,130,255,0.06)",
		maskFrom: "0deg",
		duration: 120,
		direction: 1,
		items: [
			{
				type: "avatar",
				alt: "Curly Hair Specialist",
				angle: -75,
				icon: "users",
				color: "text-white",
				glow: "shadow-[0_8px_30px_rgba(255,255,255,0.02)] border-white/10 bg-zinc-900/80",
			},
			{
				type: "badge",
				icon: "megaphone",
				color: "text-rose-400",
				angle: 15,
				glow: "shadow-[0_10px_25px_rgba(244,63,94,0.12)] border-rose-500/20 bg-zinc-900/80 backdrop-blur-md",
			},
			{
				type: "avatar",
				alt: "Brunette Specialist",
				angle: 100,
				icon: "message",
				color: "text-violet-400",
				glow: "shadow-[0_8px_30px_rgba(255,255,255,0.02)] border-white/10 bg-zinc-900/80",
			},
			{
				type: "badge",
				icon: "star",
				color: "text-amber-400",
				angle: 200,
				glow: "shadow-[0_10px_25px_rgba(245,158,11,0.12)] border-amber-500/20 bg-zinc-900/80 backdrop-blur-md",
			},
		],
	},
	{
		size: 400,
		itemRadius: 200,
		borderColor: "rgba(255,255,255,0.35)",
		boxShadow: "0 0 12px 1px rgba(168,130,255,0.05)",
		maskFrom: "45deg",
		duration: 90,
		direction: -1,
		items: [
			{
				type: "avatar",
				alt: "Glasses Specialist",
				angle: -160,
				icon: "cloud",
				color: "text-sky-400",
				glow: "shadow-[0_8px_30px_rgba(255,255,255,0.02)] border-white/10 bg-zinc-900/80",
			},
			{
				type: "avatar",
				alt: "Red Hair Specialist",
				angle: -20,
				icon: "zap",
				color: "text-rose-400",
				glow: "shadow-[0_8px_30px_rgba(255,255,255,0.02)] border-white/10 bg-zinc-900/80",
			},
		],
	},
	{
		size: 200,
		itemRadius: 100,
		borderColor: "rgba(255,255,255,0.30)",
		boxShadow: "0 0 10px 1px rgba(168,130,255,0.04)",
		maskFrom: "90deg",
		duration: 70,
		direction: 1,
		items: [
			{
				type: "badge",
				icon: "bell",
				color: "text-sky-400",
				angle: -110,
				glow: "shadow-[0_10px_25px_rgba(56,189,248,0.12)] border-sky-500/20 bg-zinc-900/80 backdrop-blur-md",
			},
			{
				type: "badge",
				icon: "heart",
				color: "text-violet-400",
				angle: 35,
				glow: "shadow-[0_10px_25px_rgba(139,92,246,0.12)] border-violet-500/20 bg-zinc-900/80 backdrop-blur-md",
			},
			{
				type: "avatar",
				alt: "Blonde Specialist",
				angle: 135,
				icon: "globe",
				color: "text-amber-400",
				glow: "shadow-[0_8px_30px_rgba(255,255,255,0.02)] border-white/10 bg-zinc-900/80",
			},
		],
	},
];

export default function Hero() {
	const renderBadgeIcon = (
		icon?:
			| "cloud"
			| "megaphone"
			| "message"
			| "users"
			| "star"
			| "zap"
			| "bell"
			| "heart"
			| "globe",
		color?: string,
	) => {
		switch (icon) {
			case "cloud":
				return <Cloud className={`w-5 h-5 ${color}`} />;
			case "megaphone":
				return <Megaphone className={`w-5 h-5 ${color}`} />;
			case "message":
				return <MessageSquare className={`w-5 h-5 ${color}`} />;
			case "users":
				return <Users className={`w-5 h-5 ${color}`} />;
			case "star":
				return <Star className={`w-5 h-5 ${color}`} />;
			case "zap":
				return <Zap className={`w-5 h-5 ${color}`} />;
			case "bell":
				return <Bell className={`w-5 h-5 ${color}`} />;
			case "heart":
				return <Heart className={`w-5 h-5 ${color}`} />;
			case "globe":
				return <Globe className={`w-5 h-5 ${color}`} />;
			default:
				return null;
		}
	};

	return (
		<section className='w-full px-12 md:px-36 pt-16 md:pt-20 lg:pt-24 pb-16 flex flex-col flex-1 justify-between relative z-10'>
			<div className='grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center py-8 lg:py-12'>
				{/* Left Column: Heading, Button */}
				<div className='lg:col-span-7 flex flex-col items-start gap-8 z-20'>
					<h1 className='text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.02em] leading-[1.1] max-w-4xl'>
						<span className='bg-gradient-to-r from-white via-white to-zinc-300 bg-clip-text text-transparent'>
							Phỏng vấn AI Thế hệ Mới
						</span>
						<br className='hidden lg:block' />
						<span className='bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent'>
							cho Cả Hai Phía –{" "}
						</span>
						<span className='bg-gradient-to-r from-[var(--chart-1)] to-[var(--chart-2)] bg-clip-text text-transparent'>
							Luyện tập
						</span>
						<span className='bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent'>
							{" "}
							hoặc{" "}
						</span>
						<span className='bg-gradient-to-r from-[var(--chart-1)] to-[var(--chart-2)] bg-clip-text text-transparent'>
							Tuyển dụng
						</span>
						<span className='bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent'>
							,
						</span>
						<br className='hidden lg:block' />
						<span className='hero-shimmer-text'>
							Chỉ Với Một Cú Nhấp Chuột!
						</span>
					</h1>

					<div className='relative flex flex-col items-start gap-4'>
						{/* Start Button */}
						<Button className='rounded-full bg-[var(--chart-1)] hover:bg-[var(--chart-2)] border-none text-zinc-950 font-bold px-6 py-5 h-auto text-sm shadow-[0_4px_25px_rgba(187,244,81,0.2)] flex items-center gap-2 group/btn transition-all duration-300'>
							Bắt đầu Miễn phí
							<ChevronRight className='w-4 h-4 text-zinc-700 group-hover/btn:translate-x-1 transition-transform' />
						</Button>
					</div>
				</div>

				{/* Right Column: Concentric Network Radar */}
				<div className='lg:col-span-5 flex lg:justify-end justify-center items-center relative select-none'>
					<div className='relative w-[340px] h-[340px] sm:w-[500px] sm:h-[500px] lg:w-[560px] lg:h-[560px] flex items-center justify-center orbit-container'>
						{/* Scaled wrapper for the orbit system */}
						<div
							className='absolute'
							style={{
								width: 560,
								height: 560,
								transform: "scale(var(--orbit-scale, 1))",
							}}
						>
							{/* Rotating orbit rings with items */}
							{orbitRings.map((ring, ringIdx) => {
								const rotateDeg = 360 * ring.direction;
								const half = ring.size / 2;
								const conicMask = `conic-gradient(from ${ring.maskFrom}, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 75%, rgba(0,0,0,1) 100%)`;

								return (
									/* Rotating wrapper — no visual styling, just rotation */
									<motion.div
										key={ringIdx}
										className='absolute'
										style={{
											width: ring.size,
											height: ring.size,
											left: "50%",
											top: "50%",
											marginLeft: -half,
											marginTop: -half,
										}}
										animate={{rotate: rotateDeg}}
										transition={{
											duration: ring.duration,
											repeat: Infinity,
											ease: "linear",
										}}
									>
										{/* Visual ring – border + mask, no children */}
										<div
											className='absolute inset-0 rounded-full pointer-events-none'
											style={{
												border: `2px solid ${ring.borderColor}`,
												boxShadow: ring.boxShadow,
												maskImage: conicMask,
												WebkitMaskImage: conicMask,
											}}
										/>

										{/* Items on this ring – no mask, won't be clipped */}
										{ring.items.map((item, itemIdx) => {
											const angleRad =
												(item.angle * Math.PI) / 180;
											const ix =
												half +
												ring.itemRadius *
													Math.cos(angleRad);
											const iy =
												half +
												ring.itemRadius *
													Math.sin(angleRad);

											return (
												<motion.div
													key={itemIdx}
													className='absolute z-20 cursor-pointer'
													style={{
														left: ix,
														top: iy,
														x: "-50%",
														y: "-50%",
													}}
													animate={{
														rotate: -rotateDeg,
													}}
													transition={{
														duration: ring.duration,
														repeat: Infinity,
														ease: "linear",
													}}
													whileHover={{
														scale: 1.15,
														zIndex: 30,
													}}
												>
													<div
														className={`flex items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-2xl border border-zinc-100 ${item.glow}`}
													>
														{renderBadgeIcon(
															item.icon,
															item.color ??
																"text-white",
														)}
													</div>
												</motion.div>
											);
										})}
									</motion.div>
								);
							})}
						</div>

						{/* Center Core – stays static */}
						<div className='relative z-10 flex flex-col items-center justify-center text-center'>
							<span className='text-4xl sm:text-5xl font-bold tracking-tight text-white'>
								20k+
							</span>
							<span className='text-[10px] sm:text-xs tracking-wider text-zinc-400 font-bold uppercase mt-1'>
								Chuyên gia
							</span>
						</div>
					</div>
				</div>
			</div>

			<style
				dangerouslySetInnerHTML={{
					__html: `
        .orbit-container {
          --orbit-scale: 0.6;
        }
        @media (min-width: 640px) {
          .orbit-container {
            --orbit-scale: 0.85;
          }
        }
        @media (min-width: 1024px) {
          .orbit-container {
            --orbit-scale: 1.0;
          }
        }
      `,
				}}
			/>
		</section>
	);
}
