"use client";

import React from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import Image from "next/image";
import {Button} from "@/app/components/ui/button";
import logoSrc from "@/app/assets/logo.svg";
import {useLanguage} from "@/app/hooks/useLanguage";

export default function Header() {
	const router = useRouter();
	const {t} = useLanguage();
	const [isScrolled, setIsScrolled] = React.useState(false);

	React.useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 1);
		};
		window.addEventListener("scroll", handleScroll, {passive: true});
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<header
			className={`sticky top-0 w-full z-50 transition-all duration-300 ease-in-out flex items-center justify-between ${
				isScrolled ?
					"bg-[var(--sidebar)]/65 backdrop-blur-xl border-b border-zinc-800/40 shadow-[0_8px_32px_rgba(0,0,0,0.2)] py-4 px-12 md:px-36"
				:	"bg-transparent border-b border-transparent py-6 px-12 md:px-36"
			}`}
		>
			<div className='flex items-center gap-16'>
				{/* Logo */}
				<div className='flex items-center gap-3'>
					<div className='relative w-12 h-12 flex items-center justify-center'>
						<Image
							src={logoSrc}
							alt='InterV Logo'
							width={48}
							height={48}
							className='brightness-0 invert object-contain'
							priority
						/>
					</div>
					<span className='font-logo font-bold text-3xl tracking-tight text-white'>
						InterV<span className='text-[var(--chart-1)]'>.</span>
					</span>
				</div>

				{/* Nav Menu */}
				<nav className='hidden md:flex items-center gap-8'>
					<Link
						href='#your-team'
						className='text-sm font-medium text-zinc-400 hover:text-white transition-colors duration-200'
					>
						{t("landing.navTeam")}
					</Link>
					<Link
						href='#solutions'
						className='text-sm font-medium text-zinc-400 hover:text-white transition-colors duration-200'
					>
						{t("landing.navSolutions")}
					</Link>
					<Link
						href='#blog'
						className='text-sm font-medium text-zinc-400 hover:text-white transition-colors duration-200'
					>
						{t("landing.navBlog")}
					</Link>
					<Link
						href='#pricing'
						className='text-sm font-medium text-zinc-400 hover:text-white transition-colors duration-200'
					>
						{t("landing.navPricing")}
					</Link>
				</nav>
			</div>

			{/* Actions */}
			<div className='flex items-center gap-6'>
				<button
					onClick={() => router.push("/login")}
					className='text-sm font-medium text-zinc-400 hover:text-white transition-colors duration-200'
				>
					{t("landing.login")}
				</button>
				<Button
					onClick={() => router.push("/register")}
					className='rounded-full bg-[var(--chart-1)] hover:bg-[var(--chart-2)] text-zinc-950 font-bold px-5 py-2 h-auto border-none transition-all duration-300 shadow-[0_0_15px_rgba(187,244,81,0.15)]'
				>
					{t("landing.joinNow")}
				</Button>
			</div>
		</header>
	);
}
