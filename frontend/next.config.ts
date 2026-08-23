import type {NextConfig} from "next";
import {fileURLToPath} from "node:url";

const glslLoader = fileURLToPath(
	new URL("./loaders/glsl-loader.js", import.meta.url),
);

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "img.vietqr.io",
				pathname: "/image/**",
			},
		],
	},
	onDemandEntries: {
		maxInactiveAge: 60 * 1000,
		pagesBufferLength: 4,
	},
	experimental: {
		cpus: 2,
		optimizePackageImports: [
			"@solar-icons/react",
			"lucide-react",
			"react-icons",
			"framer-motion",
			"three",
			"@react-three/fiber",
			"radix-ui",
		],
	},
	serverExternalPackages: ["@grpc/grpc-js", "@grpc/proto-loader"],
	outputFileTracingIncludes: {
		"/api/**/*": ["proto/interv_ai.proto"],
	},
	turbopack: {
		rules: {
			"*.glsl": {
				loaders: [glslLoader],
				as: "*.js",
			},
		},
	},
	webpack: (config) => {
		config.module.rules.push({
			test: /\.glsl$/,
			use: [{loader: glslLoader}],
		});

		return config;
	},
};

export default nextConfig;
