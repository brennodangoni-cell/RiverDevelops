import { GoogleGenAI, Type } from "@google/genai";

export interface ProductAnalysis {
  description: string;
  productType: string;
  suggestedSceneriesProductOnly: string[];
  suggestedSceneriesLifestyle: string[];
}

export async function analyzeProduct(imagesBase64: string[]): Promise<ProductAnalysis> {
  const apiKey = import.meta.env?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  const parts = imagesBase64.map(base64 => {
    const mimeTypeMatch = base64.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
    const data = base64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

    return {
      inlineData: {
        data,
        mimeType,
      }
    };
  });

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: {
      parts: [
        ...parts,
        { text: "Analyze these product images with EXTREME precision for a SORA 2 digital twin. RETURN a JSON with: 1. 'description' (ENGLISH, detailed): Exact physical traits, MICRO-PHYSICS (material behavior), textures/finishes, colors + HEX codes, QUANTITY, and branding placement. 2. 'productType' (PT-BR). 3. 'suggestedSceneriesProductOnly' (PT-BR): 4 commercial scenarios focused on movement. 4. 'suggestedSceneriesLifestyle' (PT-BR): 4 scenarios with physical interaction." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          productType: { type: Type.STRING },
          suggestedSceneriesProductOnly: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestedSceneriesLifestyle: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["description", "productType", "suggestedSceneriesProductOnly", "suggestedSceneriesLifestyle"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse analysis", e);
    return { description: "", productType: "Produto", suggestedSceneriesProductOnly: [], suggestedSceneriesLifestyle: [] };
  }
}

export async function generatePrompts(productDescription: string, options: any, previousPrompts?: string[]): Promise<string[]> {
  const apiKey = import.meta.env?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });

  const promptStyle = `
ACT AS AN ELITE AI VIDEO DIRECTOR & SORA 2 NARRATIVE ARCHITECT.

SORA 2 MASTER SKELETON (HIERARCHICAL PRIORITY):
1. KINETIC FOUNDATION (Movement): Define the camera kit and action immediately. (e.g., 35mm Anamorphic, Fluid Orbit shot).
2. SUBJECT VISUAL ANATOMY: Describe the product as a rigid, physically stable entity. Focus on textures and micro-details.
3. MICRO-PHYSICS: Describe how materials interact (e.g., "soft compression of the sole under the model's weight").
4. VOLUMETRIC LIGHTING: Use technical light descriptions (Rim light, God rays, Bokeh).
5. COLORS: Reinforce colors with HEX CODES (e.g., "Midnight Black #1A1A1A").
6. ATMOSPHERE & FX: Environmental particles, mist, or surreal elements.

DIRECTIVES:
- NO CONCEPTUAL TERMS: Never use words like "comfortable" or "premium". Use visual proofs: "The material deforms 2mm under pressure" (Visual-First).
- SURREALISM: If the user requests impossible scenes, execute them LITERALLY (Dream Engine).
- RIGIDITY: The product must never distort/melt unless explicitly asked.
- FORMAT: Single flowing paragraph of cinematic English.
  `;

  const promptContext = `
    Product Description: ${productDescription}
    
    Video Style Options:
    - Aspect Ratio: ${options.aspectRatio}
    - Mode: ${options.mode === 'lifestyle' ? 'Lifestyle (Someone using the product)' : 'Product Only'}
    ${options.mode === 'lifestyle' ? `
    - Actor Gender: ${options.gender}
    - Actor Skin Tone: ${options.skinTone}
    - Actor Hair Color: ${options.hairColor}
    ` : ''}
    - Time of Day/Lighting: ${options.timeOfDay}
    - Environment/Setting: ${options.environment}
    - Cinematography Style: ${options.style}
    ${options.supportingDescription ? `- Additional Context/User Request: ${options.supportingDescription}` : ''}
    
    Task: Generate 3 HIGH-FIDELITY SORA 2 PROMPTS based on the Director Blueprint above.
    
    Scene 1: [The Hook / Establishing Shot]
    Scene 2: [The Action / Feature]
    Scene 3: [The Climax / Macro]

    CRITICAL RULE: The final prompts MUST be entirely in ENGLISH. Output an array of 3 strings.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: promptContext,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse prompts", e);
    return [];
  }
}

export async function generateMockup(productDescription: string, options: any, promptIndex: number): Promise<string | null> {
  const apiKey = import.meta.env?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });

  const imagePrompt = `TASK: Generate a PROFESSIONAL COMMERCIAL STILL (1K RAW).
GOAL: Create a hyper-realistic representation of the final Sora 2 video scene.
DIRECTOR'S BLUEPRINT: "${productDescription}"
Environment: ${options.environment}, Lighting: ${options.timeOfDay}, Style: ${options.style}.
CLONE MODE: Maintain 100% fidelity to the product's physical traits and branding.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [{ text: imagePrompt }]
      },
      config: {
        // @ts-ignore
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "1K"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  } catch (e) {
    console.error("Mockup failed", e);
  }
  return null;
}
