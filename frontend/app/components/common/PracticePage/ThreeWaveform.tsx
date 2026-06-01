"use client";

import React, {useEffect, useRef} from "react";
import * as THREE from "three";
import {useTheme} from "@/app/hooks/useTheme";
import fragmentShader from "@/app/assets/shaders/ThreeWaveform.frag.glsl";
import vertexShader from "@/app/assets/shaders/ThreeWaveform.vert.glsl";
import type {ThreeWaveformProps} from "@/app/types";

export default function ThreeWaveform({
	soundLevel,
	isActive,
}: ThreeWaveformProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	const soundLevelRef = useRef(soundLevel);
	const isActiveRef = useRef(isActive);
	const {theme} = useTheme();
	const isDarkRef = useRef(true);

	useEffect(() => {
		const determineTheme = () => {
			if (theme === "dark") return true;
			if (theme === "light") return false;
			if (typeof window !== "undefined") {
				return window.matchMedia("(prefers-color-scheme: dark)")
					.matches;
			}
			return true;
		};
		isDarkRef.current = determineTheme();
	}, [theme]);

	useEffect(() => {
		soundLevelRef.current = soundLevel;
		isActiveRef.current = isActive;
	}, [soundLevel, isActive]);

	useEffect(() => {
		if (!containerRef.current) return;

		const container = containerRef.current;
		let width = container.clientWidth;
		let height = container.clientHeight || 192;

		const scene = new THREE.Scene();
		const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
		camera.position.z = 1;

		const renderer = new THREE.WebGLRenderer({
			antialias: true,
			alpha: true,
			premultipliedAlpha: true,
		});
		renderer.setSize(width, height);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		renderer.setClearColor(0x000000, 0);
		container.appendChild(renderer.domElement);

		const uniforms = {
			uTime: {value: 0},
			uAmplitude: {value: 0.1},
			uResolution: {value: new THREE.Vector2(width, height)},
			uIsDark: {value: isDarkRef.current ? 1.0 : 0.0},
			uPadding: {value: 0.08},
			uEdgeFade: {value: 0.15},
		};

		const geometry = new THREE.PlaneGeometry(2, 2);
		const material = new THREE.ShaderMaterial({
			vertexShader,
			fragmentShader,
			uniforms,
			transparent: true,
			depthWrite: false,
		});

		const mesh = new THREE.Mesh(geometry, material);
		scene.add(mesh);

		let rafId: number;
		let time = 0;
		let currentAmp = 0.05;

		const animate = () => {
			rafId = requestAnimationFrame(animate);
			time += 0.015;

			const targetAmp =
				isActiveRef.current ?
					0.1 + (soundLevelRef.current / 100) * 0.5
				:	0.02;
			currentAmp += (targetAmp - currentAmp) * 0.1;

			uniforms.uTime.value = time;
			uniforms.uAmplitude.value = currentAmp;

			uniforms.uIsDark.value = isDarkRef.current ? 1.0 : 0.0;

			renderer.render(scene, camera);
		};

		animate();

		const handleResize = () => {
			if (!containerRef.current) return;
			width = container.clientWidth;
			height = container.clientHeight || 192;
			renderer.setSize(width, height);
			renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
			uniforms.uResolution.value.set(width, height);
		};
		window.addEventListener("resize", handleResize);

		return () => {
			cancelAnimationFrame(rafId);
			window.removeEventListener("resize", handleResize);
			renderer.dispose();
			geometry.dispose();
			material.dispose();
			if (container.contains(renderer.domElement)) {
				container.removeChild(renderer.domElement);
			}
		};
	}, []);

	return (
		<div
			ref={containerRef}
			className='w-full h-48 mt-auto shrink-0 select-none pointer-events-none relative z-10'
		/>
	);
}
