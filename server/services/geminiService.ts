import { GoogleGenAI, Type } from "@google/genai";

// Lazy-initialized Gemini client
let aiInstance: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required but not configured.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

export interface GeneratedSlide {
  t: string;
  d: string;
  code: string;
}

export async function generateSlidesFromInstructions(instructions: string): Promise<GeneratedSlide[]> {
  const ai = getAiClient();

  const systemInstruction = `You are a world-class academic developer and senior technical training expert.
Your job is to analyze the user's lesson content, instructions, or raw code, and generate a highly informative, structured slide deck.

Each slide in the deck must consist of:
1. 't' (Title) - A short, professional, and clear heading for the slide.
2. 'd' (Description) - A detailed, educational explanation of the concepts covered in the slide. Ensure it has depth and uses proper academic tone.
3. 'code' (Code companion) - A relevant code snippet, query, architecture illustration, or script block written in Python, SQL, JAX, or TypeScript that acts as a visual learning aid for the slide.

Generate between 3 to 10 slides, proportional to the breadth of the input instructions. Only return a valid JSON array of slide objects.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: `Please generate a structured slide deck based on the following input or topic requirements:\n\n${instructions}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            t: {
              type: Type.STRING,
              description: "Title of the slide",
            },
            d: {
              type: Type.STRING,
              description: "In-depth, professional educational explanation or key bullets",
            },
            code: {
              type: Type.STRING,
              description: "A companion code snippet, script, database schema, or terminal mock illustration matching this slide",
            },
          },
          required: ["t", "d", "code"],
        },
      },
    },
  });

  const rawText = response.text;
  if (!rawText) {
    throw new Error("Received empty response from generative AI model.");
  }

  try {
    const parsed = JSON.parse(rawText.trim());
    if (!Array.isArray(parsed)) {
      throw new Error("AI output did not compile into a structured array.");
    }
    return parsed as GeneratedSlide[];
  } catch (err: any) {
    console.error("Failed to parse Gemini JSON output:", rawText);
    throw new Error(`Failed to decode AI-generated slide structure: ${err.message}`);
  }
}
