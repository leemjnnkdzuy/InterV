import { useEffect } from "react";
import type { MetadataProps } from "@/app/types";

export function useMetadata({
	title,
	description,
	keywords,
	ogTitle,
	ogDescription,
}: MetadataProps) {
	useEffect(() => {
		const updateMetadata = () => {
			if (title) {
				document.title = title;
			}
			const updateMetaTag = (name: string, content: string, isProperty = false) => {
				const selector = isProperty
					? `meta[property="${name}"]`
					: `meta[name="${name}"]`;
				let element = document.querySelector(selector);
				if (content) {
					if (!element) {
						element = document.createElement("meta");
						if (isProperty) {
							element.setAttribute("property", name);
						} else {
							element.setAttribute("name", name);
						}
						document.head.appendChild(element);
					}
					element.setAttribute("content", content);
				} else if (element) {
					element.remove();
				}
			};

			if (description !== undefined) {
				updateMetaTag("description", description);
			}

			if (keywords !== undefined) {
				updateMetaTag("keywords", keywords);
			}

			if (ogTitle !== undefined) {
				updateMetaTag("og:title", ogTitle, true);
			}

			if (ogDescription !== undefined) {
				updateMetaTag("og:description", ogDescription, true);
			}
		};

		updateMetadata();

		const timeoutId = setTimeout(updateMetadata, 0);
		return () => clearTimeout(timeoutId);
	}, [title, description, keywords, ogTitle, ogDescription]);
}
