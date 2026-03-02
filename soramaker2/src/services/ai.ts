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
        { text: "Analyze these product images with EXTREME precision for a SORA 2 digital twin. RETURN a JSON with: 1. 'description' (ENGLISH, detailed): Exact physical traits, colors + HEX, branding. 2. 'productType' (PT-BR). 3. 'suggestedSceneriesProductOnly' (PT-BR): 4 scenarios (2 realistic, 2 ABSTRACT/SURREAL). 4. 'suggestedSceneriesLifestyle' (PT-BR): 4 scenarios (2 realistic, 2 DREAMLIKE/SURREAL)." }
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
- PHYSICS ANNIHILATION (SURREALISM): If the user requests walking on clouds, fire, or space, EXECUTE LITERALLY. Forbid adding "platforms", "glass floors", or "roads". The feet MUST interact DIRECTLY with the impossible medium (e.g. sinking slightly into the volumetric vapor of a cloud).
- NO RATIONALIZATION: Stop trying to make it "plausible". Zero logic, maximum visual impact.
- RIGIDITY: The product must never distort/melt unless explicitly asked.
- FORMAT: Single flowing paragraph of cinematic English.
  `;

  const promptContext = `
[STRICT DIRECTOR MANDATE]
LEAVE NO CHOICE BEHIND. Every parameter below must be the SOUL of the scene.

[USER INTENT - HIGHEST PRIORITY]
${options.supportingDescription ? `CRITICAL USER OVERRIDE: ${options.supportingDescription}` : 'Generate a premium scene.'}
If the user request is surreal or impossible, EXECUTE LITERALLY. No metaphors.

TARGET CONFIGURATION:
- Aspect Ratio: ${options.aspectRatio}
- Mode: ${options.mode === 'lifestyle' ? 'LIFESTYLE (Actor Interaction Required)' : 'PRODUCT ONLY (Studio/Abstract)'}
- Lighting/Time: ${options.timeOfDay} (STRICT ADHERENCE)
- Environment: ${options.environment} (STRICT ADHERENCE)
- Cinematography Style: ${options.style} (STRICT ADHERENCE)

${options.mode === 'lifestyle' ? `
ACTOR SPECIFICATION (NON-NEGOTIABLE):
- Gender: ${options.gender}
- Skin Tone: ${options.skinTone} 
- Hair: ${options.hairColor}
` : ''}

PRODUCT DATA:
${productDescription}

[SCENE GOALS]
Scene 1: Reveal the product in a majestic environment.
Scene 2: Show the core benefit and product DNA in action.
Scene 3: Extreme macro. Focus on textures and perfectly legible branding.

[DIRECTOR BLUEPRINT]
${promptStyle}

CRITICAL: The output MUST be an array of 3 SINGLE paragraphs in ENGLISH.
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

  const focusInstructions = [
    "Establishing shot. Environment focus.",
    "Action shot. Usage focus.",
    "Macro shot. Detail focus."
  ];

  const imagePrompt = `TASK: TECHNICAL PRODUCT RECONSTRUCTION (COLLAGE).
GOAL: Create a professional commercial concept sheet (16:9 Collage).

[CRITICAL - SOURCE OF TRUTH]
THE ATTACHED PHOTOS ARE THE ONLY REFERENCE FOR PRODUCT SHAPE, COLORS, AND BRANDING. 
- CLONE MODE: Absolute adherence to reference photos. 
- ZERO HALLUCINATION: Do not add details or colors not present in the photos.
- IDENTITY LOCK: The product must be an exact clone of the references.

[SCENE CONTEXT - FOR ENVIRONMENT ONLY]
ENVIRONMENT: ${options.environment}
LIGHTING: ${options.timeOfDay}
STYLE: ${options.style}
${options.mode === 'lifestyle' ? `- TALENT: ${options.gender}, ${options.skinTone}, ${options.hairColor}` : ''}

[LAYOUT]
- MAIN HERO SHOT (LEFT, 60%): ${focusInstructions[promptIndex] || "Hero product focus."}
- DETAIL ANGLES (RIGHT STACK, 40%): 3 microscopic views focusing on materials and branding.

CRITICAL: Perfect symmetry. The product MUST be identical to the photos.`;

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
