import Groq from "groq-sdk";

async function searchProductOnline(barcode, productName = null) {
  try {
    const searchQueries = [
      `${barcode} product nutrition facts`,
      productName ? `${productName} nutrition facts` : null,
      `${barcode} ingredients`,
    ].filter(Boolean);

    for (const query of searchQueries) {
      try {
        const searchUrl = `https://www.nutritionix.com/search?q=${encodeURIComponent(query)}`;
        
        const response = await axios.get(searchUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          timeout: 8000,
        });

        if (response.data && response.data.length > 0) {
          return response.data;
        }
      } catch (err) {
        console.log(`Search query "${query}" failed, trying next...`);
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error("Error in searchProductOnline:", error.message);
    return null;
  }
}

async function scrapeProductDetails(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 8000,
    });

    const $ = cheerio.load(response.data);

    const metadata = {
      title: $("title").text(),
      description: $('meta[name="description"]').attr("content") || "",
      ogTitle: $('meta[property="og:title"]').attr("content") || "",
      ogDescription: $('meta[property="og:description"]').attr("content") || "",
      bodyText: $("body").text().substring(0, 5000), // Limit to first 5000 chars
    };

    return metadata;
  } catch (error) {
    console.error("Error scraping URL:", error.message);
    return null;
  }
}

async function extractProductInfoWithAI(barcode, scrapedData) {
  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY not configured");
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const prompt = `You are a nutritional data extraction expert. Based on the following product information found online, extract and structure the data as JSON. Return ONLY a valid JSON object with no markdown formatting.

Barcode: ${barcode}

Product Information:
${JSON.stringify(scrapedData, null, 2)}

Extract and return a JSON object with this exact structure (use null for missing values):
{
  "product_name": "string",
  "brands": "string",
  "categories": "string",
  "code": "${barcode}",
  "image_front_url": "string or null",
  "origin_countries": "string or null",
  "allergens": "string or null",
  "nutriments": {
    "energy-kcal_100g": number or null,
    "fat_100g": number or null,
    "saturated-fat_100g": number or null,
    "carbohydrates_100g": number or null,
    "sugars_100g": number or null,
    "protein_100g": number or null,
    "sodium_100g": number or null,
    "fiber_100g": number or null
  },
  "ingredients_text": "string or null"
}

Important: Only include numbers for nutriment values. If units are mentioned (g, mg, kcal), extract just the numeric value. Return ONLY valid JSON, nothing else.`;

    const result = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 1024,
      response_format: { type: "json_object" },
    });

    const productData = JSON.parse(result.choices[0].message.content);
    return productData;
  } catch (error) {
    console.error("Error extracting product info with AI:", error.message);
    return null;
  }
}

export async function POST(req) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return Response.json(
        { error: "GROQ_API_KEY not configured" },
        { status: 500 }
      );
    }

    const { barcode, productName } = await req.json();

    if (!barcode) {
      return Response.json(
        { error: "Missing barcode" },
        { status: 400 }
      );
    }

    console.log(`Web searching for product: ${barcode}`);

    const searchResults = await searchProductOnline(barcode, productName);

    const searchContext = {
      barcode,
      productName: productName || "Unknown",
      searchResults: searchResults ? JSON.stringify(searchResults).substring(0, 2000) : "No search results found",
      timestamp: new Date().toISOString(),
    };

    const productData = await extractProductInfoWithAI(
      barcode,
      searchContext
    );

    if (!productData || !productData.product_name) {
      return Response.json(
        {
          error: "Unable to find product information online",
          success: false,
          source: "web-search",
        },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      source: "web-search",
      product: productData,
      status: 1,
    });
  } catch (error) {
    console.error("Error in /api/web-search:", error);
    return Response.json(
      {
        error: error.message || "Failed to search for product",
        success: false,
        source: "web-search",
      },
      { status: 500 }
    );
  }
}
