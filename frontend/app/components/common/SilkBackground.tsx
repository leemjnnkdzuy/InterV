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
			style={{backgroundColor: fadeBottom ? bottomColor : "#17161a"}}
		>
			<div
				className="absolute inset-0 opacity-50 bg-[linear-gradient(155deg,rgba(123,116,129,0.95)_0%,rgba(24,23,29,0.9)_28%,rgba(96,91,103,0.85)_48%,rgba(12,12,15,0.95)_70%,rgba(68,64,73,0.8)_100%)]"
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
					color="#7B7481"
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
