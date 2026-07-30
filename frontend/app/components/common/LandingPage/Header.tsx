"use client";

import React from "react";
import {useRouter} from "next/navigation";
import Image from "next/image";
import {Button} from "@/app/components/ui/button";
import logoSrc from "@/app/assets/logo.svg";
import {useLanguage} from "@/app/hooks/useLanguage";
import {LogIn} from "lucide-react";

export default function Header() {
	const router = useRouter();
	const {t} = useLanguage();
	const [isScrolled, setIsScrolled] = React.useState(false);
	const navItems = [
		{label: t("landing.navTeam"), path: "/team"},
		{label: t("landing.navSolutions"), path: "/solutions"},
		{label: t("landing.navBlog"), path: "/blog"},
		{label: t("landing.navPricing"), path: "/b2b-pricing"},
	];

	React.useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 12);
		};
		handleScroll();
		window.addEventListener("scroll", handleScroll, {passive: true});
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<header
			className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ease-in-out flex items-center justify-between ${
				isScrolled ?
					"translate-y-0 opacity-100 bg-[var(--sidebar)]/65 backdrop-blur-xl border-b border-zinc-800/40 shadow-[0_8px_32px_rgba(0,0,0,0.2)] py-4 px-4 sm:px-12 md:px-36"
				:	"translate-y-0 opacity-100 bg-transparent border-b border-transparent shadow-none py-5 px-4 sm:py-6 sm:px-12 md:px-36"
			}`}
		>
			<div className='flex min-w-0 items-center gap-16'>
				{/* Logo */}
				<button
					type='button'
					onClick={() => router.push("/")}
					className='flex shrink-0 items-center gap-2 sm:gap-3'
					aria-label='InterV'
				>
					<div className='relative flex h-9 w-9 items-center justify-center sm:h-12 sm:w-12'>
						<Image
							src={logoSrc}
							alt='InterV Logo'
							width={48}
							height={48}
							className='brightness-0 invert object-contain'
							priority
						/>
					</div>
					<span className='font-logo text-xl font-bold tracking-normal text-white sm:text-3xl'>
						InterV<span className='text-[var(--chart-1)]'>.</span>
					</span>
				</button>

				{/* Nav Menu */}
				<nav className='hidden md:flex items-center gap-8'>
					{navItems.map((item) => (
						<button
							key={item.path}
							type='button'
							onClick={() => router.push(item.path)}
							className='text-sm font-medium text-zinc-400 hover:text-white transition-colors duration-200'
						>
							{item.label}
						</button>
					))}
				</nav>
			</div>

			{/* Actions */}
			<div className='flex shrink-0 items-center gap-2 sm:gap-6'>
				<button
					type='button'
					onClick={() => router.push("/login")}
					className='hidden text-sm font-medium text-zinc-400 transition-colors duration-200 hover:text-white sm:inline-flex'
				>
					{t("landing.login")}
				</button>
				<button
					type='button'
					onClick={() => router.push("/login")}
					className='flex h-9 w-9 items-center justify-center text-zinc-300 transition-colors hover:text-white sm:hidden'
					aria-label={t("landing.login")}
					title={t("landing.login")}
				>
					<LogIn className='h-5 w-5' aria-hidden='true' />
				</button>
				<Button
					onClick={() => router.push("/register")}
					className='h-9 whitespace-nowrap rounded-full border-none bg-[var(--chart-1)] px-4 py-2 text-xs font-bold text-zinc-950 shadow-[0_0_15px_rgba(187,244,81,0.15)] transition-all duration-300 hover:bg-[var(--chart-2)] sm:h-auto sm:px-5 sm:text-sm'
				>
					{t("landing.joinNow")}
				</Button>
			</div>
		</header>
	);
}
