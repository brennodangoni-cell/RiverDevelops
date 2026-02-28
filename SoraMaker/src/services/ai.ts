import { GoogleGenAI, Type } from "@google/genai";

export interface ProductAnalysis {
  description: string;
  productType: string;
  suggestedSceneriesProductOnly: string[];
  suggestedSceneriesLifestyle: string[];
}

export async function analyzeProduct(imagesBase64: string[]): Promise<ProductAnalysis> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
        { text: "Analise estas imagens de produto em detalhes extremos. Retorne um JSON estruturado. IMPORTANTE: O 'productType' e os cenários DEVEM estar em Português do Brasil (PT-BR). Forneça duas listas de cenários: 1) 'suggestedSceneriesProductOnly': 3 a 4 cenários de estúdio, minimalistas, 3D ou fundos infinitos focados 100% no produto. 2) 'suggestedSceneriesLifestyle': 3 a 4 cenários cinematográficos e reais onde o produto estaria inserido ou sendo usado. REGRA CRÍTICA: Se você usar qualquer termo técnico de cinema, fotografia ou arte (ex: bokeh, lente anamórfica, macro, profundidade de campo, etc) nos cenários, você DEVE explicar brevemente o que significa entre parênteses para que um usuário leigo entenda. A 'description' interna pode ser em inglês para manter a precisão técnica para os próximos passos." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING, description: "Highly precise description of the product's shape, color, texture, materials, branding, text, and unique visual features." },
          productType: { type: Type.STRING, description: "A short category name (e.g., 'Sneakers', 'Skincare Bottle', 'Electronics')." },
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
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  let taskDescription = `
    Task: Create a cohesive 3-part commercial video sequence for OpenAI's Sora 2. 
    The goal is to generate 3 different prompts (10 seconds each) that can be stitched together into a seamless 30-second commercial without feeling repetitive.
    
    Structure the 3 prompts as follows:
    1. [The Hook / Establishing Shot]: Wide or medium-wide shot. Introduce the environment, the atmosphere, and reveal the product in a cinematic way.
    2. [The Action / Feature]: Medium or tracking shot. Show the product in action, being used (if lifestyle), or dynamic movement around the product (if product only).
    3. [The Climax / Macro]: Extreme close-up or macro shot. Focus on the texture, materials, branding, and fine details with dramatic lighting.
  `;

  if (previousPrompts && previousPrompts.length > 0) {
    taskDescription = `
    Task: CONTINUE the commercial video sequence for OpenAI's Sora 2.
    Here are the previous scenes already generated:
    ${previousPrompts.map((p, i) => `Scene ${i+1}: ${p}`).join('\n')}

    Generate the NEXT 3 scenes to seamlessly follow the story.
    Structure the 3 NEW prompts as follows:
    1. [Alternative Angle / Reaction]: Show a different perspective or how the environment/actor reacts to the product.
    2. [Dynamic B-Roll]: Fast-paced or highly stylized transition shot highlighting a secondary feature.
    3. [Final Outro / Call to Action]: A majestic final shot slowly zooming out, leaving space for a logo or text.
    `;
  }

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
    
    ${taskDescription}

    Structure each prompt professionally: [Subject Description] + [Action/Context] + [Environment] + [Camera Movement] + [Lighting/Atmosphere] + [Film Stock/Technical Details].
    Make sure the product is the central focus and matches the description perfectly. Incorporate the Additional Context if provided. 
    CRITICAL RULE: The final generated prompts MUST be entirely in ENGLISH, as Sora 2 understands English best. Do not output the prompts in Portuguese.
    Specify the aspect ratio (${options.aspectRatio}) at the end of the prompt if relevant for framing.
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
          description: "A detailed Sora 2 video generation prompt."
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
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const sequenceTypes = [
      "Wide Establishing Shot, showing the environment and introducing the product.",
      "Medium Action Shot, showing the product in use or dynamic display.",
      "Extreme Close-up Macro Shot, focusing on textures, materials, and branding.",
      "Alternative Angle or Reaction Shot, showing a different perspective.",
      "Dynamic B-Roll Shot, highly stylized.",
      "Final Outro Shot, majestic and leaving space for a logo.",
      "Extra Scene 1",
      "Extra Scene 2",
      "Extra Scene 3"
    ];
    
    const imagePrompt = `A professional product photography concept sheet showing MULTIPLE ANGLES of the exact same product in a single image.
    Layout: A split-screen or grid collage showing front view, side view, and detail macro shots.
    Product: ${productDescription}. CRITICAL: Maintain strict consistency with this product description. The shape, color, and branding MUST be identical across all angles.
    Scene Focus: ${sequenceTypes[promptIndex] || "Dynamic Shot"}
    Setting: ${options.environment}, ${options.timeOfDay}.
    ${options.mode === 'lifestyle' ? `Featuring a ${options.skinTone} skinned ${options.gender} with ${options.hairColor} hair interacting with the product.` : 'The product is the sole focus.'}
    ${options.supportingDescription ? `Additional Context: ${options.supportingDescription}.` : ''}
    Style: ${options.style}. Ultra-realistic, raw photography, 8k resolution, sharp focus, highly detailed, shot on 35mm lens, photorealistic commercial photography. NO AI artifacts, highly realistic textures.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: imagePrompt }]
            },
            config: {
                // @ts-ignore
                imageConfig: {
                    aspectRatio: "1:1"
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
