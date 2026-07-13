import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function analyzeForPersonalization(product, userPrefs) {
  try {
    const prefContext = userPrefs?.dietTypes?.length > 0 
      ? `User's dietary focus: ${userPrefs.dietTypes.join(', ')}.`
      : '';
    
    const healthContext = userPrefs?.customHealthProblems?.trim()
      ? `User's health concerns: ${userPrefs.customHealthProblems}.`
      : '';

    const prompt = `Analyze this product specifically for personalization. ${prefContext} ${healthContext}

Product: ${product.name} by ${product.brand}
Nutritional Info: Calories: ${product.nutriments?.['energy-kcal_100g'] || 0}, Protein: ${product.nutriments?.['protein_100g'] || 0}g, Sugar: ${product.nutriments?.['sugars_100g'] || 0}g, Fat: ${product.nutriments?.['fat_100g'] || 0}g, Sodium: ${product.nutriments?.['sodium_100g'] || 0}mg
Warnings: ${product.warnings?.join(', ') || 'None'}

Return ONLY valid JSON:
{
  "suitable": true/false,
  "compatibility_score": 0-100,
  "reasoning": "brief explanation of fit for user's preferences",
  "recommendations": ["specific recommendation 1", "recommendation 2"],
  "alternatives": ["better product 1", "better product 2"]
}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: "json_object" },
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error("Error in personalization model:", error);
    return null;
  }
}

async function analyzeFromFoodFacts(product) {
  try {
    const prompt = `You are a nutrition expert analyzing food facts database information.

Product: ${product.name}
Brand: ${product.brand}
Category: ${product.categories || 'Unknown'}
Nutrition per 100g:
- Energy: ${product.nutriments?.['energy-kcal_100g'] || 'N/A'} kcal
- Protein: ${product.nutriments?.['protein_100g'] || 'N/A'}g
- Fat: ${product.nutriments?.['fat_100g'] || 'N/A'}g
- Carbs: ${product.nutriments?.['carbohydrates_100g'] || 'N/A'}g
- Sugar: ${product.nutriments?.['sugars_100g'] || 'N/A'}g
- Sodium: ${product.nutriments?.['sodium_100g'] || 'N/A'}mg
- Fiber: ${product.nutriments?.['fiber_100g'] || 'N/A'}g

Provide a balanced analysis of the nutritional profile from the food database perspective.

Return ONLY valid JSON:
{
  "nutritional_quality": "excellent/good/moderate/poor",
  "quality_score": 0-100,
  "highlights": ["highlight 1", "highlight 2"],
  "concerns": ["concern 1", "concern 2"],
  "best_for": "description of who would benefit from this product",
  "nutrition_summary": "2-3 sentences about overall nutrition profile"
}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: "json_object" },
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error("Error in food facts model:", error);
    return null;
  }
}

async function analyzeWebSearchResults(product, searchData) {
  try {
    const searchContext = searchData 
      ? `Additional online sources: ${JSON.stringify(searchData).substring(0, 1000)}`
      : 'No online search data available';

    const prompt = `Analyze this product based on both official database and web search findings.

Product: ${product.name} by ${product.brand}
Database Source: Open Food Facts
${searchContext}

Provide insights from web search and cross-referenced sources.

Return ONLY valid JSON:
{
  "web_verified": true/false,
  "data_consistency": "high/medium/low",
  "additional_insights": ["insight 1", "insight 2"],
  "consumer_feedback_themes": ["theme 1", "theme 2"],
  "sourcing_notes": "any notable information about the product",
  "availability": "common/specialized/hard to find"
}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: "json_object" },
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error("Error in web search model:", error);
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

    const { product, userPrefs, searchData } = await req.json();

    if (!product) {
      return Response.json(
        { error: "Missing product data" },
        { status: 400 }
      );
    }

    const [personalizationAnalysis, foodFactsAnalysis, webSearchAnalysis] = await Promise.all([
      analyzeForPersonalization(product, userPrefs),
      analyzeFromFoodFacts(product),
      analyzeWebSearchResults(product, searchData),
    ]);

    const combinedAnalysis = {
      product: {
        name: product.name,
        brand: product.brand,
        barcode: product.barcode,
        category: product.category,
      },
      models: {
        personalization: personalizationAnalysis,
        foodFacts: foodFactsAnalysis,
        webSearch: webSearchAnalysis,
      },
      combined_recommendation: generateCombinedRecommendation(
        personalizationAnalysis,
        foodFactsAnalysis,
        webSearchAnalysis
      ),
      timestamp: new Date().toISOString(),
    };

    return Response.json({ analysis: combinedAnalysis, success: true });
  } catch (error) {
    console.error("Error in /api/multi-analyze:", error);
    return Response.json(
      { error: error.message || "Failed to analyze product" },
      { status: 500 }
    );
  }
}

function generateCombinedRecommendation(personalization, foodFacts, webSearch) {
  const scores = [];
  
  if (personalization?.compatibility_score) scores.push(personalization.compatibility_score);
  if (foodFacts?.quality_score) scores.push(foodFacts.quality_score);
  
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : 50;

  let recommendation = "Neutral - More information needed";
  if (avgScore >= 75) recommendation = "Highly Recommended";
  else if (avgScore >= 60) recommendation = "Good Choice";
  else if (avgScore >= 40) recommendation = "Consider Alternatives";
  else recommendation = "Not Recommended";

  return {
    overall_score: avgScore,
    recommendation,
    rationale: [
      personalization?.reasoning || "No personalization data",
      foodFacts?.nutrition_summary || "No food facts data",
      webSearch?.additional_insights?.[0] || "No web search data",
    ].filter(Boolean),
  };
}
