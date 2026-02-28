import { GoogleGenAI, Type } from "@google/genai";

export interface ProductAnalysis {
    description: string;
    productType: string;
    suggestedSceneriesProductOnly: string[];
    suggestedSceneriesLifestyle: string[];
}

function getApiKey(): string {
    // Priority 1: localStorage (User manually set or session memory)
    const localKey = localStorage.getItem('gemini_api_key');
    // Basic validation: Standard Gemini keys start with AIzaSy
    if (localKey && localKey.trim().startsWith('AIzaSy')) return localKey;

    // Priority 2: Vite Environment
    const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (envKey && envKey.startsWith('AIzaSy')) return envKey;

    // Priority 3: Hardcoded User Default (The confirmed working one)
    return "AIzaSyCzD70dKzYba-TYUlX3V1CRUy6zasGHCCc";
}

export async function analyzeProduct(imagesBase64: string[]): Promise<ProductAnalysis> {
    const apiKey = getApiKey();
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        console.error("Gemini API Key is invalid or missing.");
        throw new Error("GEMINI_API_KEY_MISSING");
    }

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
        // High-Fidelity Vision: Gemini 1.5 Pro (The absolute best for detail extraction)
        model: "gemini-1.5-pro",
        contents: {
            parts: [
                ...parts,
                {
                    text: `Analise estas imagens de produto com precisão CIRÚRGICA. Você é um Diretor de Arte sênior preparando um blueprint para o Sora 2.
                Extraia um DNA VISUAL COMPLETO. O objetivo é que o mockup gerado depois seja IDENTICO ao produto real.
                
                No campo 'description', forneça um "Visual Blueprint" detalhando:
                1. GEOMETRIA: Formatos exatos, proporções (ex: "cilindro alto com tampa arredondada"), cantos (raio de curvatura).
                2. MATERIAIS: Textura exata (Alumínio escovado, vidro translúcido, plástico fosco), reflexividade, transparência.
                3. BRANDING: Localização exata de logos e textos (ex: "Logo centralizado no terço superior em fonte Sans Serif prateada").
                4. CORES: Use nomes técnicos e aproximações de tons (ex: "Azul Marinho meia-noite", "Branco Pérola acetinado").
                5. DETALHES ÚNICOS: Ranhuras, costuras, botões, reflexos específicos.

                REGRA DE IDIOMA: 'productType' e os cenários em Português. 'description' em INGLÊS TÉCNICO para máxima fidelidade na geração.` }
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
    }).catch(async (err) => {
        // Safe Fallback for Vision
        console.warn("Primary vision model error, falling back to 1.5 Flash", err);
        return ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: { parts: [...parts, { text: "Analise estas imagens de produto... (Analise JSON)" }] },
            config: { responseMimeType: "application/json" }
        });
    });

    try {
        // @ts-ignore
        const text = response.text || (response as any).candidates?.[0]?.content?.parts?.[0]?.text;
        return JSON.parse(text || "{}");
    } catch (e) {
        console.error("Failed to parse analysis", e);
        return { description: "", productType: "Product", suggestedSceneriesProductOnly: [], suggestedSceneriesLifestyle: [] };
    }
}

export async function generatePrompts(productDescription: string, options: any, previousPrompts?: string[]): Promise<string[]> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("GEMINI_API_KEY_MISSING");

    const ai = new GoogleGenAI({ apiKey });

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
    ${previousPrompts.map((p, i) => `Scene ${i + 1}: ${p}`).join('\n')}

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
        model: "gemini-1.5-flash", // Rapid prompt engineering
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
    }).catch(async () => {
        return ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: promptContext,
            config: { responseMimeType: "application/json" }
        });
    });

    try {
        // @ts-ignore
        const text = response.text || (response as any).candidates?.[0]?.content?.parts?.[0]?.text;
        return JSON.parse(text || "[]");
    } catch (e) {
        console.error("Failed to parse prompts", e);
        return [];
    }
}

export async function generateMockup(productDescription: string, options: any, promptIndex: number): Promise<string | null> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("GEMINI_API_KEY_MISSING");

    const ai = new GoogleGenAI({ apiKey });
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

    const imagePrompt = `URGENT ARCHITECTURAL REQUIREMENT: You MUST reproduce the product below with 100% IDENTICAL visual features.
    No artistic interpretation of the product is allowed. 
    Product Blueprint: ${productDescription}. 
    
    Constraint: The shape, materials, text labels, and color palette MUST be exact.
    Scene Narrative: ${sequenceTypes[promptIndex] || "Dynamic Shot"}
    Environment: ${options.environment}, ${options.timeOfDay}.
    ${options.mode === 'lifestyle' ? `Featuring a ${options.skinTone} skinned ${options.gender} with ${options.hairColor} hair naturally interacting with this specific product.` : 'The product is the sole focus.'}
    ${options.supportingDescription ? `Additional Artistic Direction: ${options.supportingDescription}.` : ''}
    Style: ${options.style}. High-end commercial product photography, 8k, raw textures, realistic lens distortion, 35mm.`;

    try {
        const response = await ai.models.generateContent({
            // Nano Banana 2 (Stable ID)
            model: 'gemini-3.1-flash-image-preview',
            contents: {
                parts: [{ text: imagePrompt }]
            },
            config: {
                // @ts-ignore
                imageConfig: {
                    aspectRatio: "1:1"
                }
            }
        }).catch(async () => {
            // Fallback to standard
            console.warn("Nano Banana 2 not available, falling back to Imagen 2");
            return ai.models.generateContent({
                model: 'image-generation-002',
                contents: { parts: [{ text: imagePrompt }] }
            });
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
