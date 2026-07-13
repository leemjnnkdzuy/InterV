"use client";

import {Button} from "@/app/components/ui/button";
import {AltArrowRight} from "@solar-icons/react";
import {useLanguage} from "@/app/hooks/useLanguage";

export default function Hero() {
	const {t} = useLanguage();

	return (
		<section className='w-full min-h-[108svh] px-6 sm:px-12 md:px-36 pt-28 md:pt-32 lg:pt-36 pb-24 flex items-center justify-center relative z-10 overflow-hidden'>
			<div className='relative z-10 mx-auto flex w-full max-w-7xl min-h-[620px] items-center justify-center py-8 lg:py-10'>
				<div className='relative z-20 flex w-full max-w-[800px] flex-col items-center text-center'>
					<h1 className='max-w-[800px] text-[34px] sm:text-[46px] lg:text-[58px] font-extrabold leading-[1.08]'>
						<span className='bg-gradient-to-r from-white via-white to-zinc-300 bg-clip-text text-transparent'>
							{t("landing.heroTitleLine1")}
						</span>
						<br />
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
						<br />
						<span className='hero-shimmer-text'>
							{t("landing.heroTitleLine3")}
						</span>
					</h1>

					<div className='relative mt-7 flex flex-col items-center gap-4 sm:mt-8'>
						<Button className='rounded-full bg-[var(--chart-1)] hover:bg-[var(--chart-2)] border-none text-zinc-950 font-bold px-6 py-4 h-auto text-sm shadow-[0_4px_28px_rgba(187,244,81,0.28)] flex items-center gap-2 group/btn transition-all duration-300 sm:px-7 sm:py-5'>
							{t("landing.heroStartFree")}
							<AltArrowRight className='w-4 h-4 text-zinc-700 group-hover/btn:translate-x-1 transition-transform' />
						</Button>
					</div>
				</div>
			</div>
		</section>
	);
}
