import { GoogleGenAI, Type } from "@google/genai";

export interface ProductAnalysis {
    description: string;
    productType: string;
    suggestedSceneriesProductOnly: string[];
    suggestedSceneriesLifestyle: string[];
}

// THE STRATEGY: Use the cutting-edge available Flash model for 2026.
// Based on our curl check and error logs, 'gemini-2.5-flash' is the required modern model.
const STABLE_MODEL = "gemini-2.5-flash";

function getApiKey(): string {
    const localKey = localStorage.getItem('gemini_api_key');
    if (localKey && localKey.trim().startsWith('AIzaSy')) return localKey.trim();

    const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (envKey && envKey.trim().startsWith('AIzaSy')) return envKey.trim();

    return "";
}

export async function analyzeProduct(imagesBase64: string[]): Promise<ProductAnalysis> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("GEMINI_API_KEY_MISSING");

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

    try {
        const response = await ai.models.generateContent({
            model: STABLE_MODEL,
            contents: [{
                role: 'user',
                parts: [
                    ...parts,
                    {
                        text: `You are a Senior Cinematographer and AI Video Specialist for Sora 2.
                    Analyze these product images to extract a FIXED VISUAL DNA for a high-end commercial.
                    
                    In 'description', provide a "Sora 2 Technical Blueprint" in English:
                    1. PRODUCT MESH: Define the exact 3D geometry (e.g., "Sleek matte black cylindrical bottle with a chrome-finished beveled cap").
                    2. SURFACE PHYSICS: Describe how it reacts to light (e.g., "Highly anisotropic brushed metal reflections, slight subsurface scattering on plastics").
                    3. BRANDING COORDINATES: Exact placement of logos (e.g., "Minimalist white sans-serif logo vertically aligned in the center-left quadrant").
                    4. COLOR PROFILE: Use hex-like accuracy (e.g., "Deep Obsidian #0A0A0A base with Metallic Bronze #CD7F32 accents").
                    
                    REGRA: 'productType' e cenários em Português. 'description' deve ser um PROMPT MASTER em Inglês para manter a consistência entre o Mockup e o Vídeo final.`
                    }
                ]
            }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING, description: "Technical cinematography blueprint for Sora 2." },
                        productType: { type: Type.STRING },
                        suggestedSceneriesProductOnly: { type: Type.ARRAY, items: { type: Type.STRING } },
                        suggestedSceneriesLifestyle: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["description", "productType", "suggestedSceneriesProductOnly", "suggestedSceneriesLifestyle"]
                }
            }
        });

        const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
        return JSON.parse(text || "{}");
    } catch (e: any) {
        console.error("ANALYSIS_ERROR:", e);
        throw e;
    }
}

export async function generatePrompts(productDescription: string, options: any, previousPrompts?: string[]): Promise<string[]> {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });

    const promptContext = `
    ACT AS A SORA 2 DIRECTOR. 
    Product DNA: ${productDescription}
    Settings: Mode=${options.mode}, Style=${options.style}, Light=${options.timeOfDay}, Ratio=${options.aspectRatio}.
    
    TASK: Generate a 3-scene cinematic sequence (10s each) for Sora 2.
    
    SORA 2 REQUIREMENTS:
    - Use technical camera terms (Tracking shot, Handheld, Slow-motion 120fps, Rack focus).
    - Maintain visual consistency (The product MUST NOT change its design between scenes).
    - Lighting: Must be consistent with ${options.timeOfDay}.
    - Movement: Fluid transitions.
    
    ${previousPrompts && previousPrompts.length > 0 ? `This is a CONTINUATION. Previous scenes: ${previousPrompts.join(' | ')}. Avoid repetition.` : ''}
    
    OUTPUT: A JSON array with exactly 3 highly detailed English prompts. Focus on photorealism and physics-accurate motion.
    `;

    try {
        const response = await ai.models.generateContent({
            model: STABLE_MODEL,
            contents: [{
                role: 'user',
                parts: [{ text: promptContext }]
            }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });

        const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
        return JSON.parse(text || "[]");
    } catch (e) {
        console.error("PROMPT_ERROR:", e);
        return [];
    }
}

export async function generateMockup(productDescription: string, options: any, promptIndex: number, imagesBase64?: string[]): Promise<string | null> {
    const apiKey = getApiKey();
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

    const imagePrompt = `REFERENCE PHOTOS ATTACHED. Produce a mockup IDENTICAL to these photos. 
    Product: ${productDescription}. 
    Scene Focus: ${sequenceTypes[promptIndex] || "Dynamic Shot"}.
    Setting: ${options.environment}, ${options.timeOfDay}. 
    Style: ${options.style}. 
    ${options.mode === 'lifestyle' ? `Featuring a ${options.skinTone} skinned ${options.gender} with ${options.hairColor} hair interacting with the product.` : 'The product is the sole focus.'}
    8k photorealistic, raw photography, sharp focus, highly detailed, shot on 35mm lens.`;

    const imageParts = (imagesBase64 || []).map(base64 => {
        const data = base64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
        return { inlineData: { data, mimeType: 'image/jpeg' } };
    });

    try {
        const response = await ai.models.generateContent({
            model: 'models/nano-banana-pro-preview', // UPGRADED TO PRO MODEL
            contents: [{
                role: 'user',
                parts: [
                    ...imageParts,
                    { text: imagePrompt }
                ]
            }]
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    } catch (e) {
        console.error("MOCKUP_ERROR:", e);
    }
    return null;
}
