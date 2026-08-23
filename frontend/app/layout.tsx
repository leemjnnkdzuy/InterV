import type {Metadata} from "next";
import {headers} from "next/headers";
import {
	Geist_Mono,
	Lexend_Deca,
} from "next/font/google";
import "./globals.css";
import {cn} from "@/app/lib/Utils";
import {AuthProvider} from "@/app/contexts/AuthContext";
import {ThemeProvider} from "@/app/hooks/useTheme";
import {LanguageProvider} from "@/app/hooks/useLanguage";
import {Toaster} from "@/app/components/ui/sonner";
import {TooltipProvider} from "@/app/components/ui/tooltip";
import {themeInitializerScript} from "@/app/scripts/theme";

const lexendDeca = Lexend_Deca({
	subsets: ["latin", "vietnamese"],
	variable: "--font-sans",
});


const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
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

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const nonce = (await headers()).get("x-nonce") || undefined;

	return (
		<html
			lang='en'
			suppressHydrationWarning
			data-scroll-behavior='smooth'
			className={cn(
				"h-full",
				"antialiased",
				geistMono.variable,
				lexendDeca.variable,
				"font-sans",
			)}
		>
			<head>
				<script
					nonce={nonce}
					suppressHydrationWarning
					dangerouslySetInnerHTML={{
						__html: themeInitializerScript,
					}}
				/>
			</head>
			<body className='min-h-full flex flex-col'>
				<ThemeProvider>
					<LanguageProvider>
						<AuthProvider>
							<TooltipProvider>
								{children}
								<Toaster />
							</TooltipProvider>
						</AuthProvider>
					</LanguageProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
