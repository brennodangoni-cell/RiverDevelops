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
                    Analyze ALL these product images as a single Multi-Angle Data Set. 
                    
                    STRICT CORRELATION RULE:
                    - Cross-reference all angles to identify EXACT micro-details (stitching patterns, sole textures, buckle materials, logo engravings).
                    - If an angle shows a hidden detail, it MUST BE RETAINED in the master description.
                    - ZERO INVENTION: Do not guess brand names if not clear.
                    
                    In 'description', provide a "Sora 2 Technical Master Blueprint" in English:
                    1. FULL-MESH GEOMETRY: 3D volume, exact proportions, curvature radii.
                    2. MATERIAL PHYSICS: Multi-layered shaders (e.g., "Matte leather with subtle grain visibility, metallic gold-finish hardware with fingerprint-resistant coating").
                    3. ANGLE-SPECIFIC NOTES: Mention details visible from specific perspectives to ensure 360 consistency.
                    
                    REGRA: 'productType' e cenários em Português. 'description' deve ser o MASTER BLUEPRINT técnico em Inglês.`
                    }
                ]
            }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING, description: "Master technical blueprint based on ALL provided angles." },
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
    ACT AS AN AWARD-WINNING COMMERCIAL DIRECTOR (Nike/Apple standards).
    Product Blueprint: ${productDescription}
    Scene Setup: Mode=${options.mode}, Style=${options.style}, Lighting=${options.timeOfDay}, Aspect Ratio=${options.aspectRatio}, Environment=${options.environment}.
    
    SPECIAL DIRECTIVES:
    - LANGUAGE: ${options.language || 'Portuguese'}
    - ON-SCREEN TEXT: ${options.includeText ? 'ENABLED (Include minimalist high-end typography pointers)' : 'STRICTLY DISABLED (Do not write any text on screen)'}
    - VOICE-OVER SCRIPTS: ${options.includeVoice ? 'ENABLED (Write compelling, emotive scripts)' : 'STRICTLY DISABLED (No narration scripts allowed)'}
    
    TASK: Generate 3 cinematic scenes (10s each). 
    Each prompt must follow Sora 2 technical syntax and include:
    1. CAMERA: Dynamic movement (Parallax, Vertigo effect, Anamorphic lens, FPV drone).
    2. PHYSICS: Accurate gravity, fluid dynamics, and light interaction.
    3. OVERLAYS: If enabled, define EXACT text content and voice-over lines in ${options.language}. 
    - SCENERY: Use the "${options.environment}" setup for all scenes.
    
    EXEMPLO DE TONE OF VOICE: Se for 'Cinematic', o tom deve ser épico. Se for 'Minimalist', deve ser limpo e luxuoso.
    
    ${previousPrompts && previousPrompts.length > 0 ? `PREVIOUS CONTINUITY: ${previousPrompts.join(' | ')}. Expand the story.` : ''}
    
    OUTPUT: A JSON array of 3 highly detailed English technical prompts containing all text/voice data as part of the scene description.
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

export async function generateMockup(productDescription: string, scenePrompt: string, imagesBase64?: string[]): Promise<string | null> {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });

    // ZERO-INVENTION MAPPING: Map the scene context to the EXACT product in photos
    const imageRequestPrompt = `
    TASK: Generate a high-fidelity static FRAME from a high-end commercial.
    
    REFERENCE PRODUCT: 
    Photos attached. Use EXACT details. DO NOT add new logos or features. 
    DNA Profile: ${productDescription}
    
    SCENE TO RENDER (STRICT ENVIRONMENT):
    ${scenePrompt}
    
    CINEMATOGRAPHY RULES:
    - Zero invention of product details.
    - Photorealistic rendering.
    - Match everything from the reference photos carefully.
    - ENVIRONMENT: Use EXACTLY the scenery described in the SCENE TO RENDER. Do not add background elements not described.
    - Output must be a direct visual representation of the provided SCENE PROMPT.
    `;

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
                    { text: imageRequestPrompt }
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
