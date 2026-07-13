import {useEffect, useMemo, useRef} from "react";
import * as THREE from "three";
import vertexShader from "@/app/assets/shaders/MagicRings.vert.glsl";
import fragmentShader from "@/app/assets/shaders/MagicRings.frag.glsl";

interface MagicRingsProps {
	color?: string;
	colorTwo?: string;
	speed?: number;
	ringCount?: number;
	attenuation?: number;
	lineThickness?: number;
	baseRadius?: number;
	radiusStep?: number;
	scaleRate?: number;
	opacity?: number;
	blur?: number;
	noiseAmount?: number;
	rotation?: number;
	ringGap?: number;
	fadeIn?: number;
	fadeOut?: number;
	followMouse?: boolean;
	mouseInfluence?: number;
	hoverScale?: number;
	parallax?: number;
	clickBurst?: boolean;
	horizontalScale?: number;
	centerGapWidth?: number;
	centerGapHeight?: number;
	centerGapSoftness?: number;
}

type MagicRingsRuntimeProps = Required<Omit<MagicRingsProps, "blur">>;

export default function MagicRings({
	color = "#fc42ff",
	colorTwo = "#42fcff",
	speed = 1,
	ringCount = 6,
	attenuation = 10,
	lineThickness = 2,
	baseRadius = 0.35,
	radiusStep = 0.1,
	scaleRate = 0.1,
	opacity = 1,
	blur = 0,
	noiseAmount = 0.1,
	rotation = 0,
	ringGap = 1.5,
	fadeIn = 0.7,
	fadeOut = 0.5,
	followMouse = false,
	mouseInfluence = 0.2,
	hoverScale = 1.2,
	parallax = 0.05,
	clickBurst = false,
	horizontalScale = 1,
	centerGapWidth = 0,
	centerGapHeight = 0,
	centerGapSoftness = 0.06,
}: MagicRingsProps) {
	const mountRef = useRef<HTMLDivElement>(null);
	const propsRef = useRef<MagicRingsRuntimeProps | null>(null);
	const mouseRef = useRef<[number, number]>([0, 0]);
	const smoothMouseRef = useRef<[number, number]>([0, 0]);
	const hoverAmountRef = useRef(0);
	const isHoveredRef = useRef(false);
	const burstRef = useRef(0);

	const currentProps = useMemo<MagicRingsRuntimeProps>(
		() => ({
			color,
			colorTwo,
			speed,
			ringCount,
			attenuation,
			lineThickness,
			baseRadius,
			radiusStep,
			scaleRate,
			opacity,
			noiseAmount,
			rotation,
			ringGap,
			fadeIn,
			fadeOut,
			followMouse,
			mouseInfluence,
			hoverScale,
			parallax,
			clickBurst,
			horizontalScale,
			centerGapWidth,
			centerGapHeight,
			centerGapSoftness,
		}),
		[
			color,
			colorTwo,
			speed,
			ringCount,
			attenuation,
			lineThickness,
			baseRadius,
			radiusStep,
			scaleRate,
			opacity,
			noiseAmount,
			rotation,
			ringGap,
			fadeIn,
			fadeOut,
			followMouse,
			mouseInfluence,
			hoverScale,
			parallax,
			clickBurst,
			horizontalScale,
			centerGapWidth,
			centerGapHeight,
			centerGapSoftness,
		],
	);

	useEffect(() => {
		propsRef.current = currentProps;
	}, [currentProps]);

	useEffect(() => {
		const mount = mountRef.current;
		if (!mount) return;

		let renderer: THREE.WebGLRenderer;
		try {
			renderer = new THREE.WebGLRenderer({alpha: true});
		} catch {
			return;
		}

		if (!renderer.capabilities.isWebGL2) {
			renderer.dispose();
			return;
		}

		renderer.setClearColor(0x000000, 0);
		mount.appendChild(renderer.domElement);

		const scene = new THREE.Scene();
		const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
		camera.position.z = 1;

		const uniforms = {
			uTime: {value: 0},
			uAttenuation: {value: 0},
			uResolution: {value: new THREE.Vector2()},
			uColor: {value: new THREE.Color()},
			uColorTwo: {value: new THREE.Color()},
			uLineThickness: {value: 0},
			uBaseRadius: {value: 0},
			uRadiusStep: {value: 0},
			uScaleRate: {value: 0},
			uRingCount: {value: 0},
			uOpacity: {value: 1},
			uNoiseAmount: {value: 0},
			uRotation: {value: 0},
			uRingGap: {value: 1.6},
			uFadeIn: {value: 0.5},
			uFadeOut: {value: 0.75},
			uMouse: {value: new THREE.Vector2()},
			uMouseInfluence: {value: 0},
			uHoverAmount: {value: 0},
			uHoverScale: {value: 1},
			uParallax: {value: 0},
			uBurst: {value: 0},
			uHorizontalScale: {value: 1},
			uCenterGapWidth: {value: 0},
			uCenterGapHeight: {value: 0},
			uCenterGapSoftness: {value: 0.06},
		};

		const material = new THREE.ShaderMaterial({
			vertexShader,
			fragmentShader,
			uniforms,
			transparent: true,
		});
		const quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
		scene.add(quad);

		const resize = () => {
			const w = mount.clientWidth;
			const h = mount.clientHeight;
			const dpr = Math.min(window.devicePixelRatio, 2);
			renderer.setSize(w, h);
			renderer.setPixelRatio(dpr);
			uniforms.uResolution.value.set(w * dpr, h * dpr);
		};
		resize();
		window.addEventListener("resize", resize);

		const ro = new ResizeObserver(resize);
		ro.observe(mount);

		const onMouseMove = (e: MouseEvent) => {
			const rect = mount.getBoundingClientRect();
			mouseRef.current[0] = (e.clientX - rect.left) / rect.width - 0.5;
			mouseRef.current[1] = -((e.clientY - rect.top) / rect.height - 0.5);
		};
		const onMouseEnter = () => {
			isHoveredRef.current = true;
		};
		const onMouseLeave = () => {
			isHoveredRef.current = false;
			mouseRef.current[0] = 0;
			mouseRef.current[1] = 0;
		};
		const onClick = () => {
			burstRef.current = 1;
		};

		mount.addEventListener("mousemove", onMouseMove);
		mount.addEventListener("mouseenter", onMouseEnter);
		mount.addEventListener("mouseleave", onMouseLeave);
		mount.addEventListener("click", onClick);

		let frameId = 0;
		const animate = (t: number) => {
			frameId = requestAnimationFrame(animate);
			const p = propsRef.current;
			if (!p) return;

			smoothMouseRef.current[0] += (mouseRef.current[0] - smoothMouseRef.current[0]) * 0.08;
			smoothMouseRef.current[1] += (mouseRef.current[1] - smoothMouseRef.current[1]) * 0.08;
			hoverAmountRef.current += ((isHoveredRef.current ? 1 : 0) - hoverAmountRef.current) * 0.08;
			burstRef.current *= 0.95;
			if (burstRef.current < 0.001) burstRef.current = 0;

			uniforms.uTime.value = t * 0.001 * p.speed;
			uniforms.uAttenuation.value = p.attenuation;
			uniforms.uColor.value.set(p.color);
			uniforms.uColorTwo.value.set(p.colorTwo);
			uniforms.uLineThickness.value = p.lineThickness;
			uniforms.uBaseRadius.value = p.baseRadius;
			uniforms.uRadiusStep.value = p.radiusStep;
			uniforms.uScaleRate.value = p.scaleRate;
			uniforms.uRingCount.value = p.ringCount;
			uniforms.uOpacity.value = p.opacity;
			uniforms.uNoiseAmount.value = p.noiseAmount;
			uniforms.uRotation.value = (p.rotation * Math.PI) / 180;
			uniforms.uRingGap.value = p.ringGap;
			uniforms.uFadeIn.value = p.fadeIn;
			uniforms.uFadeOut.value = p.fadeOut;
			uniforms.uMouse.value.set(smoothMouseRef.current[0], smoothMouseRef.current[1]);
			uniforms.uMouseInfluence.value = p.followMouse ? p.mouseInfluence : 0;
			uniforms.uHoverAmount.value = hoverAmountRef.current;
			uniforms.uHoverScale.value = p.hoverScale;
			uniforms.uParallax.value = p.parallax;
			uniforms.uBurst.value = p.clickBurst ? burstRef.current : 0;
			uniforms.uHorizontalScale.value = p.horizontalScale;
			uniforms.uCenterGapWidth.value = p.centerGapWidth;
			uniforms.uCenterGapHeight.value = p.centerGapHeight;
			uniforms.uCenterGapSoftness.value = p.centerGapSoftness;

			renderer.render(scene, camera);
		};
		frameId = requestAnimationFrame(animate);

		return () => {
			cancelAnimationFrame(frameId);
			window.removeEventListener("resize", resize);
			ro.disconnect();
			mount.removeEventListener("mousemove", onMouseMove);
			mount.removeEventListener("mouseenter", onMouseEnter);
			mount.removeEventListener("mouseleave", onMouseLeave);
			mount.removeEventListener("click", onClick);
			if (renderer.domElement.parentNode === mount) {
				mount.removeChild(renderer.domElement);
			}
			renderer.dispose();
			material.dispose();
		};
	}, []);

	return (
		<div
			ref={mountRef}
			style={{
				width: "100%",
				height: "100%",
				filter: blur > 0 ? `blur(${blur}px)` : undefined,
			}}
		/>
	);
}
