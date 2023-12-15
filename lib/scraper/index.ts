"use server";

import axios from "axios";
import * as cheerio from "cheerio";
import { extractCurrency, extractPrice, extractReviewsCount } from "../utils";
import { PriceHistoryItem } from "@/types";

export async function scrapeAmazonProduct(url: string) {
	if (!url) return;

	// curl --proxy brd.superproxy.io:22225 --proxy-user
	// brd-customer-hl_97e544f1-zone-unblocker:skf2zd8s3ore -k https://
	// lumtest.com/myip.json

	//Bright data proxy configuration
	const username = String(process.env.BRIGHT_DATA_USERNAME);
	const password = String(process.env.BRIGHT_DATA_PASSWORD);
	const port = 22225;
	const session_id = (1000000 * Math.random()) | 0;

	const options = {
		auth: {
			username: `${username}-session-${session_id}`,
			password,
		},
		host: "brd.superproxy.io",
		port,
		rejectUnauthorized: false,
	};

	try {
		const response = await axios.get(url, options);
		const $ = cheerio.load(response.data);

		const title = $("#productTitle").text().trim();
		const currentPrice = extractPrice($(".priceToPay").first());

		const originalPrice = extractPrice(
			$("#priceblock_ourprice").first(),
			$(".a-price.a-text-price span.a-offscreen").first()
		);

		const outOfStock =
			$("#availability span").text().trim().toLowerCase() ===
			"currently unavailable";

		const image =
			$("#imgBlkFront").attr("data-a-dynamic-image") ||
			$("#landingImage").attr("data-a-dynamic-image") ||
			"{}";

		const imageUrls = Object.keys(JSON.parse(image));

		const currency = extractCurrency($(".a-price-symbol"));
		const discountRate = $(".savingsPercentage")
			.first()
			.text()
			.replace(/[-%]/g, "");

		const reviewsCount = extractReviewsCount(
			$("#acrCustomerReviewText").first()
		);

		const stars = $("#acrPopover span.a-size-base.a-color-base")
			.first()
			.text()
			.trim();

		const recommendPercent = $(".a-histogram-row td.a-text-right")
			.first()
			.text()
			.replace(/\D/g, "");

		const data = {
			url,
			currency: currency || "$",
			image: imageUrls[0],
			title,
			currentPrice: Number(currentPrice) || Number(originalPrice),
			originalPrice: Number(originalPrice) || Number(currentPrice),
			priceHistory: [] as PriceHistoryItem[],
			discountRate: Number(discountRate),
			category: "category",
			reviewsCount: Number(reviewsCount),
			stars: Number(stars),
			recommendPercent: Number(recommendPercent),
			isOutOfStock: outOfStock,
			lowestPrice: Number(currentPrice) || Number(originalPrice),
			highestPrice: Number(originalPrice) || Number(currentPrice),
			averagePrice: Number(currentPrice) || Number(originalPrice),
		};

		return data;
	} catch (error: any) {
		throw new Error(`Failed to scrape product: ${error.message}`);
	}
}
