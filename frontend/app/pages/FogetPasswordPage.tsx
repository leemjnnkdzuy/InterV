"use client";

import React from "react";
import {Button} from "@/app/components/ui/button";
import {Input} from "@/app/components/ui/input";
import {Home} from "lucide-react";
import {useRouter} from "next/navigation";

export default function FogetPasswordPage() {
	const router = useRouter();

	return (
		<div className='dark min-h-screen relative bg-zinc-950 text-white flex items-center justify-center'>
			{/* corner icons */}
			<button
				onClick={() => router.push("/")}
				className='absolute left-6 top-6 text-zinc-400 hover:text-white'
				aria-label='home'
			>
				<Home className='w-5 h-5' />
			</button>

			{/* Background Ambient Glow (Mesh Gradient Effect for Dark Theme) */}
			<div className='absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden z-0'>
				{/* Soft Gold/Orange/Lime glow in top-left using chart-1 */}
				<div className='absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[var(--chart-1)]/15 blur-[130px]' />

				{/* Soft Violet/Purple glow in the center-top */}
				<div className='absolute -top-60 left-[20%] w-[900px] h-[900px] rounded-full bg-[oklch(0.48_0.18_290)]/20 blur-[160px]' />

				{/* Soft Pink/Magenta ambient glow on the right-middle side */}
				<div className='absolute top-[20%] -right-40 w-[550px] h-[550px] rounded-full bg-[oklch(0.55_0.2_315)]/15 blur-[120px]' />

				{/* Soft Green base ambient glow towards bottom-left using chart-3 */}
				<div className='absolute -bottom-60 left-[10%] w-[800px] h-[800px] rounded-full bg-[var(--chart-3)]/10 blur-[150px]' />
			</div>

			<div className='relative z-10 w-full max-w-md px-8 py-10 rounded-2xl bg-[var(--sidebar)]/65 backdrop-blur-xl border border-zinc-800/40 shadow-[0_8px_32px_rgba(0,0,0,0.2)]'>
				<h1 className='text-3xl font-extrabold text-center'>
					Quên mật khẩu
				</h1>
				<p className='text-sm text-zinc-400 text-center mt-2'>
					Nhập email của bạn để nhận liên kết khôi phục mật khẩu
				</p>

				<form className='flex flex-col gap-4 mt-6'>
					<label className='text-xs text-zinc-400'>
						Email đăng ký
					</label>
					<Input
						type='email'
						placeholder='Nhập email đăng ký...'
						aria-label='email'
					/>
					<Button className='w-full rounded-full bg-[var(--chart-1)] hover:bg-[var(--chart-2)] text-zinc-950 font-bold mt-4 py-2'>
						Gửi liên kết đặt lại
					</Button>
				</form>

				<p className='text-sm text-zinc-400 text-center mt-6'>
					Quay lại{" "}
					<button
						onClick={() => router.push("/login")}
						className='text-white font-bold'
					>
						Đăng nhập
					</button>
				</p>
			</div>
		</div>
	);
}

