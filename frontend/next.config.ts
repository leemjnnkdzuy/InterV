import type {NextConfig} from "next";
import {fileURLToPath} from "node:url";

const glslLoader = fileURLToPath(
	new URL("./loaders/glsl-loader.js", import.meta.url),
);

const nextConfig: NextConfig = {
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
