"use client";

import Silk from "@/app/components/Silk";

interface SilkBackgroundProps {
	fadeBottom?: boolean;
	bottomColor?: string;
}

export default function SilkBackground({
	fadeBottom = false,
	bottomColor = "var(--sidebar)",
}: SilkBackgroundProps) {
	return (
		<div
			className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0"
			style={{backgroundColor: fadeBottom ? bottomColor : "var(--silk-canvas-bg)"}}
		>
			<div
				className="absolute inset-0 opacity-50 bg-[linear-gradient(155deg,color-mix(in_oklab,var(--silk-tint)_80%,transparent)_0%,color-mix(in_oklab,var(--silk-canvas-bg)_90%,transparent)_28%,color-mix(in_oklab,var(--silk-tint)_65%,transparent)_48%,color-mix(in_oklab,var(--silk-canvas-bg)_95%,transparent)_70%,color-mix(in_oklab,var(--silk-tint)_55%,transparent)_100%)]"
				style={
					fadeBottom ?
						{
							maskImage:
								"linear-gradient(to bottom, black 0%, black 56%, rgba(0,0,0,0.72) 68%, rgba(0,0,0,0.28) 82%, rgba(0,0,0,0) 100%)",
							WebkitMaskImage:
								"linear-gradient(to bottom, black 0%, black 56%, rgba(0,0,0,0.72) 68%, rgba(0,0,0,0.28) 82%, rgba(0,0,0,0) 100%)",
						}
					:	undefined
				}
			>
				<Silk
					speed={5}
					scale={1}
					color="var(--silk-color)"
					noiseIntensity={1.5}
					rotation={0}
				/>
			</div>
			{fadeBottom ? (
				<div
					className="absolute inset-x-0 bottom-0 h-[44%]"
					style={{
						background: `linear-gradient(to bottom, transparent 0%, ${bottomColor} 76%, ${bottomColor} 100%)`,
					}}
				/>
			) : null}
		</div>
	);
}
