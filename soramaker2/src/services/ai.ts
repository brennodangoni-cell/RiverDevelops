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
        { text: "Analise estas imagens de produto em detalhes físicos extremos para construção de gêmeos digitais. Retorne um JSON estruturado. IMPORTANTE: O 'productType' e os cenários DEVEM estar em Português do Brasil (PT-BR). FOCO VISUAL: Identifique texturas exatas (matte, gloss, granulado), materiais (polímero, couro, tecido linen), e cores com nomes descritivos e seus códigos HEX. Extraia traços de 'micro-física' (como o material se comporta: se comprime, se é rígido, se reflete luz). Forneça duas listas de cenários: 1) 'suggestedSceneriesProductOnly': 3 a 4 cenários de estúdio, minimalistas, 3D ou fundos infinitos focados 100% no produto. 2) 'suggestedSceneriesLifestyle': 3 a 4 cenários cinematográficos e reais onde o produto estaria inserido ou sendo usado. A 'description' interna deve ser em inglês técnico detalhando a física e visual do produto." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING, description: "Highly precise technical and visual description of the product's shape, color (with HEX), texture, materials physics (micro-physics), and branding." },
          productType: { type: Type.STRING, description: "A short category name (e.g., 'Sneakers', 'Skincare Bottle', 'Electronics') in PT-BR." },
          suggestedSceneriesProductOnly: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Array of 3-4 studio, minimalist, or 3D environment descriptions."
          },
          suggestedSceneriesLifestyle: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Array of 3-4 cinematic, real-world environment descriptions."
          }
        },
        required: ["description", "productType", "suggestedSceneriesProductOnly", "suggestedSceneriesLifestyle"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse analysis", e);
    return { description: "", productType: "Product", suggestedSceneriesProductOnly: [], suggestedSceneriesLifestyle: [] };
  }
}

export async function generatePrompts(productDescription: string, options: any, previousPrompts?: string[]): Promise<string[]> {
  const apiKey = import.meta.env?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });

  const sora2MasterSkeleton = `
SORA 2 – VISUAL NARRATIVE & PHYSICS DIRECTOR BLUEPRINT
Deterministic Video Generation Specification [v2.0 - Hyper-Realism Priority]

=====================================================================
1. KINETIC FOUNDATION (PRIMARY PRIORITY: MOVEMENT)
=====================================================================
CAMERA_MOTION: [Describe the complex camera path: orbit, dolly, crane, tracking, or handheld. Define speed & stabilization.]
PRIMARY_ACTION: [What is the main movement in the scene? Focus on the fluidity and speed of the subject or environment.]
MICRO_PHYSICS: [MATERIAL INTERACTION: Describe subtle surface reactions—compression of footbed, fabric swaying, liquid surface tension, or micro-vibrations reacting to motion.]

=====================================================================
2. SUBJECT VISUAL ANATOMY (SUBJECT CONTINUITY)
=====================================================================
VISUAL_IDENTITY: [IDENTICAL MATCH: ${productDescription}. Describe shape, silhouette, and branding.]
MATERIAL_SURFACE: [Describe specific textures: matte, brushed metal, pebbled leather, translucent glass. Mention weight perception.]
COLOR_SYSTEM: [MUST PAIR VERBAL + HEX: e.g., "Deep Emerald Green #047857". Ensure high contrast or specific palette matching.]

=====================================================================
3. LIGHTING & VOLUMETRIC DESIGN
=====================================================================
LIGHT_ARCHITECT: [Source, Direction, Elevation. Focus on Volumetric Light, God-rays, or Neon Glow. Describe how light hits the textures.]
REFLECTIONS_GLARE: [Ray-tracing accuracy: how light bounces off the subject's materials.]

=====================================================================
4. ATMOSPHERIC ENVIRONMENT
=====================================================================
SCENE_SETTING: [Environment type, depth layers, air particles (dust/mist/bokeh), and peripheral elements.]
SPATIAL_CONSISTENCY: [Anchor the product physically in the space. No floating unless specified.]

=====================================================================
5. OPTICAL SPECIFICATIONS
=====================================================================
LENS_SYSTEM: [Specific Lens (e.g., 35mm Anamorphic, 100mm Macro). Aperture (f/1.8). Depth of field intensity.]
IMAGE_PROPERTIES: [Rec.2020 Color, Film Grain, Noise Control, High Sharpness. NO CGI artifacts.]

=====================================================================
6. TEMPORAL & NEGATIVE CONSTRAINTS
=====================================================================
CONTINUITY_LOCK: [Absolute product persistence. No morphing, no teleportation, no distorted geometry. Earth-normal gravity.]
FORBIDDEN: [No text overlays, no watermarks, no CGI aesthetic, no unrealistic transformations.]
`;

  let taskDescription = `
    Task: Create a cohesive 3-part commercial video sequence for OpenAI's Sora 2. 
    The goal is to generate 3 different prompts (10 seconds each) that can be stitched together into a seamless 30-second commercial.
    
    Structure the 3 prompts as follows:
    1. [The Hook / Establishing Shot]: Wide or medium-wide shot. Introduce the atmosphere and reveal the product.
    2. [The Action / Feature]: Medium or tracking shot. Show the product's motion or the user's interaction (lifestyle).
    3. [The Climax / Detail]: Extreme close-up or macro shot. Focus on texture, micro-physics, and branding.
  `;

  if (previousPrompts && previousPrompts.length > 0) {
    taskDescription = `
    Task: CONTINUE the commercial video sequence for OpenAI's Sora 2.
    Here are the previous scenes already generated:
    ${previousPrompts.map((p, i) => `Scene ${i + 1}: ${p}`).join('\n')}

    Generate the NEXT 3 scenes following the previously established narrative to maintain continuity.
    
    Structure:
    1. [Alternative Angle]: Different perspective or environmental reaction.
    2. [Dynamic Transition]: Fast-paced stylized shot.
    3. [Majestic Outro]: Final shot with space for branding.
    `;
  }

  const promptContext = `
    Product Analysis: ${productDescription}
    
    User Selection:
    - Aspect Ratio: ${options.aspectRatio}
    - Mode: ${options.mode === 'lifestyle' ? 'Lifestyle' : 'Product Only'}
    - Lighting: ${options.timeOfDay}
    - Environment: ${options.environment}
    - Style: ${options.style}
    ${options.supportingDescription ? `- Additional Context: ${options.supportingDescription}` : ''}
    
    ${taskDescription}

    CRITICAL ENGINEERING RULES FOR SORA 2:
    1. VISUAL OVER CONCEPTUAL: Never use conceptual words like "comfortable" or "safe". Translate them: "comfortable" -> "soft compression of the sole", "safe" -> "deep ridge texture for maximum grip".
    2. MOTION FIRST: Start with the camera and subject movement description.
    3. REINFORCE COLORS: Always pair color names with HEX codes (e.g., "Matte Black #000000").
    4. MICRO-PHYSICS: Describe how materials react to weight, touch, or movement (wrinkling, stretching, compressing).
    5. HIERARCHY: Fill out the SORA 2 VISUAL NARRATIVE & PHYSICS DIRECTOR BLUEPRINT for each scene.

    SKELETON TEMPLATE:
    ${sora2MasterSkeleton}

    FINAL OUTPUT: Return a JSON array of 3 strings (the filled skeletons) in English.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: promptContext,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
          description: "A detailed Sora 2 visual narrative director's blueprint."
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

export async function generateMockup(productDescription: string, options: any, promptIndex: number, fullDirectorBlueprint?: string): Promise<string | null> {
  const apiKey = import.meta.env?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });

  // Extract the specific vision for this mockup
  const directorVision = fullDirectorBlueprint ? `
    Visual Direction from Studio:
    ${fullDirectorBlueprint}
    ` : '';

  const imagePrompt = `A professional product photography concept sheet for a premium commercial.
    Layout: A cinematic 1K commercial still. Focus on high-end production value.
    Product: ${productDescription}. 
    ${directorVision}
    CRITICAL: Maintain absolute physical and color consistency. The material textures (micro-physics) must be visible.
    Setting: ${options.environment}, ${options.timeOfDay}.
    Style: ${options.style}. Ultra-realistic, raw photography, 8k resolution, sharp focus, shot on professional lenses, photorealistic commercial photography. NO AI artifacts, strictly realistic material physics.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [{ text: imagePrompt }]
      },
      config: {
        // @ts-ignore
        imageConfig: {
          aspectRatio: options.aspectRatio === '9:16' ? "9:16" : "16:9",
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
    console.error("Failed to generate mockup", e);
  }
  return null;
}
