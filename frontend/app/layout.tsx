import type {Metadata} from "next";
import {Geist, Geist_Mono, Inter} from "next/font/google";
import "./globals.css";
import {cn} from "@/app/lib/Utils";
import { AuthProvider } from "@/app/contexts/AuthContext";
import { ThemeProvider } from "@/app/hooks/useTheme";
import { LanguageProvider } from "@/app/hooks/useLanguage";
import { Toaster } from "@/app/components/ui/sonner";
import { TooltipProvider } from "@/app/components/ui/tooltip";
import { themeInitializerScript } from "@/app/scripts/theme";

const inter = Inter({subsets: ["latin"], variable: "--font-sans"});


const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "InterV",
	description: "Nền tảng giả lập phỏng vấn AI thế hệ mới",
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
				geistSans.variable,
				geistMono.variable,
				"font-sans",
				inter.variable,
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
