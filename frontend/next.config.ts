import type {NextConfig} from "next";
import {fileURLToPath} from "node:url";

const glslLoader = fileURLToPath(
	new URL("./loaders/glsl-loader.js", import.meta.url),
);

const nextConfig: NextConfig = {
	experimental: {
		cpus: 2,
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
