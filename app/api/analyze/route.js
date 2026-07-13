import Groq from "groq-sdk";

export async function POST(req) {
  try {
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.trim() === "") {
      return Response.json(
        { error: "GROQ_API_KEY not configured" },
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

    const apiKey = process.env.GROQ_API_KEY.trim();
    
    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
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

    const analysis = JSON.parse(completion.choices[0].message.content);

    return Response.json({ analysis, success: true });
  } catch (error) {
    console.error("Error in /api/analyze:", error);
    return Response.json(
      { error: error.message || "Failed to analyze product" },
      { status: 500 }
    );
  }
}
