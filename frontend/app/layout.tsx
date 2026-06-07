import type {Metadata} from "next";
import {
	Geist_Mono,
	Inter,
	Merriweather,
	Merriweather_Sans,
} from "next/font/google";
import "./globals.css";
import {cn} from "@/app/lib/Utils";
import {AuthProvider} from "@/app/contexts/AuthContext";
import {ThemeProvider} from "@/app/hooks/useTheme";
import {LanguageProvider} from "@/app/hooks/useLanguage";
import {Toaster} from "@/app/components/ui/sonner";
import {TooltipProvider} from "@/app/components/ui/tooltip";
import {themeInitializerScript} from "@/app/scripts/Theme";

const inter = Inter({subsets: ["latin", "vietnamese"], variable: "--font-sans"});


const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

const merriweatherSans = Merriweather_Sans({
	variable: "--font-logo",
	subsets: ["latin", "vietnamese"],
});

const merriweather = Merriweather({
	variable: "--font-question",
	subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
	title: "InterV",
	description: "Nền tảng giả lập phỏng vấn AI thế hệ mới",
	icons: {
		icon: [
			{
				url: "/icon-dark.png",
				media: "(prefers-color-scheme: light)",
			},
			{
				url: "/icon-light.png",
				media: "(prefers-color-scheme: dark)",
			},
		],
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang='en'
			suppressHydrationWarning
			data-scroll-behavior='smooth'
			className={cn(
				"h-full",
				"antialiased",
				geistMono.variable,
				inter.variable,
				merriweatherSans.variable,
				merriweather.variable,
				"font-sans",
			)}
		>
			<head>
				<script
					dangerouslySetInnerHTML={{
						__html: themeInitializerScript,
					}}
				/>
			</head>
			<body className='min-h-full flex flex-col'>
				<AuthProvider>
					<ThemeProvider>
						<LanguageProvider>
							<TooltipProvider>
								{children}
								<Toaster />
							</TooltipProvider>
						</LanguageProvider>
					</ThemeProvider>
				</AuthProvider>
			</body>
		</html>
	);
}
