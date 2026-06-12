"use client";

import {Button} from "@/app/components/ui/button";
import {motion} from "framer-motion";
import {
	Cloud,
	Siren,
	ChatSquare,
	UsersGroupRounded,
	AltArrowRight,
	Star,
	Lightning,
	Bell,
	Heart,
	Global,
} from "@solar-icons/react";
import {useLanguage} from "@/app/hooks/useLanguage";

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
		borderColor: "rgba(255,255,255,0.25)",
		boxShadow: "0 0 15px 1px rgba(168,130,255,0.12)",
		maskFrom: "0deg",
		duration: 120,
		direction: 1,
		items: [
			{
				type: "avatar",
				alt: "Curly Hair Specialist",
				angle: -75,
				icon: "users",
				color: "text-[var(--chart-1)]",
			},
			{
				type: "badge",
				icon: "megaphone",
				color: "text-rose-400",
				angle: 15,
			},
			{
				type: "avatar",
				alt: "Brunette Specialist",
				angle: 100,
				icon: "message",
				color: "text-violet-400",
			},
			{
				type: "badge",
				icon: "star",
				color: "text-amber-400",
				angle: 200,
			},
		],
	},
	{
		size: 400,
		itemRadius: 200,
		borderColor: "rgba(255,255,255,0.20)",
		boxShadow: "0 0 12px 1px rgba(168,130,255,0.08)",
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
			},
			{
				type: "avatar",
				alt: "Red Hair Specialist",
				angle: -20,
				icon: "zap",
				color: "text-[var(--chart-1)]",
			},
			{
				type: "badge",
				icon: "bell",
				color: "text-sky-400",
				angle: 80,
			},
		],
	},
	{
		size: 200,
		itemRadius: 100,
		borderColor: "rgba(255,255,255,0.15)",
		boxShadow: "0 0 10px 1px rgba(168,130,255,0.06)",
		maskFrom: "90deg",
		duration: 70,
		direction: 1,
		items: [
			{
				type: "badge",
				icon: "heart",
				color: "text-rose-400",
				angle: 35,
			},
			{
				type: "avatar",
				alt: "Blonde Specialist",
				angle: 180,
				icon: "globe",
				color: "text-amber-400",
			},
		],
	},
];

export default function Hero() {
	const {t} = useLanguage();

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
				return <Cloud weight="BoldDuotone" className={`w-11 h-11 sm:w-14 sm:h-14 ${color}`} />;
			case "megaphone":
				return <Siren weight="BoldDuotone" className={`w-11 h-11 sm:w-14 sm:h-14 ${color}`} />;
			case "message":
				return <ChatSquare weight="BoldDuotone" className={`w-11 h-11 sm:w-14 sm:h-14 ${color}`} />;
			case "users":
				return <UsersGroupRounded weight="BoldDuotone" className={`w-11 h-11 sm:w-14 sm:h-14 ${color}`} />;
			case "star":
				return <Star weight="BoldDuotone" className={`w-11 h-11 sm:w-14 sm:h-14 ${color}`} />;
			case "zap":
				return <Lightning weight="BoldDuotone" className={`w-11 h-11 sm:w-14 sm:h-14 ${color}`} />;
			case "bell":
				return <Bell weight="BoldDuotone" className={`w-11 h-11 sm:w-14 sm:h-14 ${color}`} />;
			case "heart":
				return <Heart weight="BoldDuotone" className={`w-11 h-11 sm:w-14 sm:h-14 ${color}`} />;
			case "globe":
				return <Global weight="BoldDuotone" className={`w-11 h-11 sm:w-14 sm:h-14 ${color}`} />;
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
							{t("landing.heroTitleLine1")}
						</span>
						<br className='hidden lg:block' />
						<span className='bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent'>
							{t("landing.heroTitleLine2")}{" "}
						</span>
						<span className='bg-gradient-to-r from-[var(--chart-1)] to-[var(--chart-2)] bg-clip-text text-transparent'>
							{t("landing.heroPractice")}
						</span>
						<span className='bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent'>
							{" "}
							{t("landing.heroOr")}{" "}
						</span>
						<span className='bg-gradient-to-r from-[var(--chart-1)] to-[var(--chart-2)] bg-clip-text text-transparent'>
							{t("landing.heroRecruit")}
						</span>
						<br className='hidden lg:block' />
						<span className='hero-shimmer-text'>
							{t("landing.heroTitleLine3")}
						</span>
					</h1>

					<div className='relative flex flex-col items-start gap-4'>
						{/* Start Button */}
						<Button className='rounded-full bg-[var(--chart-1)] hover:bg-[var(--chart-2)] border-none text-zinc-950 font-bold px-6 py-5 h-auto text-sm shadow-[0_4px_25px_rgba(187,244,81,0.2)] flex items-center gap-2 group/btn transition-all duration-300'>
							{t("landing.heroStartFree")}
							<AltArrowRight className='w-4 h-4 text-zinc-700 group-hover/btn:translate-x-1 transition-transform' />
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
													className='absolute z-20 cursor-pointer group'
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
														className="flex items-center justify-center transition-all duration-300"
													>
														<div className="transform group-hover:scale-110 transition-transform duration-300 flex items-center justify-center">
															{renderBadgeIcon(
																item.icon,
																item.color ??
																	"text-white",
															)}
														</div>
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
							<span className='text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)]'>
								50k+
							</span>
							<span className='text-[9px] sm:text-[11px] tracking-wider text-zinc-400 font-bold uppercase mt-1 max-w-[110px] leading-tight'>
								{t("landing.heroInterviewCount")}
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
