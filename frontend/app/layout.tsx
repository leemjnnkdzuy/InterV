import type {Metadata} from "next";
import {Geist, Geist_Mono, Inter} from "next/font/google";
import "./globals.css";
import {cn} from "@/app/lib/Utils";
import { AuthProvider } from "@/app/contexts/AuthContext";
import { Toaster } from "@/app/components/ui/sonner";

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
	description: "Nền tảng luyện phỏng vấn AI thông minh",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang='en'
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
			<body className='min-h-full flex flex-col'>
				<AuthProvider>
					{children}
					<Toaster />
				</AuthProvider>
			</body>
		</html>
	);
}
