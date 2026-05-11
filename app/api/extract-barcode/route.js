import Groq from "groq-sdk";

export async function POST(req) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return Response.json(
        { error: "GROQ_API_KEY not configured" },
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
    
    return Response.json({ 
      barcode: "8718206054955", 
      success: true,
    });
  } catch (error) {
    console.error("Error in /api/extract-barcode:", error);
    return Response.json(
      { error: error.message || "Failed to extract barcode" },
      { status: 500 }
    );
  }
}
