import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini with server-side API key (not exposed to client)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    // Validate API key exists
    if (!process.env.GEMINI_API_KEY) {
      return Response.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const { product, prompt } = await req.json();

    if (!product || !prompt) {
      return Response.json(
        { error: "Missing product or prompt" },
        { status: 400 }
      );
    }

    // Initialize model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Call Gemini API
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from Gemini response");
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return Response.json({ analysis, success: true });
  } catch (error) {
    console.error("Error in /api/analyze:", error);
    return Response.json(
      { error: error.message || "Failed to analyze product" },
      { status: 500 }
    );
  }
}
