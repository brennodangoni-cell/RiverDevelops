import { GoogleGenAI, Type } from "@google/genai";

export interface ProductAnalysis {
    description: string;
    productType: string;
    suggestedSceneriesProductOnly: string[];
    suggestedSceneriesLifestyle: string[];
}

// THE STRATEGY: Use the cutting-edge available Flash model for 2026.
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
                    SYSTEM DIRECTIVE: Act as a "Physical World Simulator & Forensic Architect". 
                    
                    TASK: Create an "Immutable Physical Manifest" of the product. 
                    INSPECTION PROTOCOL:
                    - Image 1 is the MASTER ANCHOR for geometry and color.
                    - Images 2-7 are TECHNICAL SUPPLEMENTS for hidden details and textures.
                    
                    In 'description', provide a "SORA 2 RIGID BODY MANIFEST" (Strictly Technical English):
                    1. GEOMETRIC INTEGRITY: Define the product as a "Solid, Non-Deformable Rigid Body". Specify its fixed mesh structure.
                    2. MATERIAL DNA: Define the exact surface texture so it doesn't "morph" into other materials.
                    3. VOLUME STABILITY: State that the volumetric volume is constant and immutable.
                    4. ANCHOR POINTS: Identify key rigid points (e.g., "Fixed strap attachment", "Solid base") that cannot move or warp.
                    
                    REGRA: 'productType' e cenários em Português. 'description' deve ser o MASTER RIGID MANIFEST em Inglês.`
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

    const textEnabled = !!options.includeText;
    const voiceEnabled = !!options.includeVoice;

    const promptContext = `
    ACT AS A SORA 2 RIGID-BODY SIMULATION ENGINEER.
    Product Manifest: ${productDescription}
    Context: Mode=${options.mode}, Style=${options.style}, Lighting=${options.timeOfDay}, Aspect Ratio=${options.aspectRatio}, Environment=${options.environment}.
    
    ANTI-MORPHING PROTOCOL (CRITICAL):
    - FIXED GEOMETRY: The product is a SOLID, RIGID OBJECT. It cannot morph, melt, or change shape.
    - OBJECT PERMANENCE: Every pixel of the product must remain consistent from Frame 1 to Frame 300. 
    - RIGID PHYSICS: No fluid dynamics on the product body. Only external light and camera movement are dynamic.
    
    SIMULATION LOGIC:
    - Describe the scene with a "STABLE RENDER" focus. 
    - Use "Locked 3D Mesh" terminology to prevent Sora from inventing new parts.
    
    STRICT TEXT/VOICE ENFORCEMENT:
    - ON-SCREEN TEXT STATUS: ${textEnabled ? `ENABLED (Include minimalist high-end typography pointers in ${options.language || 'Portuguese'})` : 'STRICTLY DISABLED. No text allowed.'}
    - VOICE-OVER STATUS: ${voiceEnabled ? `ENABLED (Write compelling scripts in ${options.language || 'Portuguese'})` : 'STRICTLY DISABLED. No narration allowed.'}
    
    OUTPUT: A JSON array of 3 highly technical "Rigid Simulation Commands" for Sora 2. Focus on "GEOMETRIC STABILITY".
    ${previousPrompts && previousPrompts.length > 0 ? `PREVIOUS CONTINUITY: ${previousPrompts.join(' | ')}. Expand the story from these scenes.` : ''}
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

    const imageRequestPrompt = `
    TASK: ULTRA-HIGH-FIDELITY PRODUCT PLACEMENT.
    SCENE CONTEXT: "${scenePrompt}"
    
    STRICT VISUAL RULES:
    1. PIXEL-LINK IDENTITY: The product in the mockup MUST BE A 1:1 CLONE of the attached photos (Use Image 1 as the master reference).
    2. ZERO REDESIGN: Do not change the shape, logos, colors, or materials. Do not "beautify" or generalize. 
    3. SCENE INTEGRATION: Place the EXACT product from the photo into the "${scenePrompt}" environment. 
    4. SURFACE PHYSICS: Lighting in the scene must react to the materials (described as: ${productDescription}) but without altering the product's physical identity.
    
    OUTPUT: One single, cinematic, photorealistic master commercial frame. 
    Goal: If the product in the mockup is different from the photo, it is a failure. Accuracy is the only metric.
    `;

    const imageParts = (imagesBase64 || []).map(base64 => {
        const data = base64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
        return { inlineData: { data, mimeType: 'image/jpeg' } };
    });

    try {
        const response = await ai.models.generateContent({
            model: 'models/nano-banana-pro-preview',
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
