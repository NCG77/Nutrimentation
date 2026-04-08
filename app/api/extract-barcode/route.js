import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return Response.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const { base64Data, mimeType } = await req.json();

    if (!base64Data) {
      return Response.json(
        { error: "Missing image data" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Look at this image and extract any barcode or product code numbers visible in it. 
      Return ONLY the numeric barcode code as a plain number with no other text or formatting. 
      If you see a barcode, code, or number, return just the number (e.g., "5901234123457").
      If you cannot find any barcode or code, return "NOT_FOUND".
      
      Important: Return ONLY the number or "NOT_FOUND", nothing else.`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: base64Data,
        },
      },
      {
        text: prompt,
      },
    ]);

    const response = await result.response;
    const extractedCode = response.text().trim();

    return Response.json({ barcode: extractedCode, success: true });
  } catch (error) {
    console.error("Error in /api/extract-barcode:", error);
    return Response.json(
      { error: error.message || "Failed to extract barcode" },
      { status: 500 }
    );
  }
}
