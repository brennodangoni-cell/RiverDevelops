import { GoogleGenAI, Type } from "@google/genai";

export interface ProductAnalysis {
    description: string;
    productType: string;
    suggestedSceneriesProductOnly: string[];
    suggestedSceneriesLifestyle: string[];
}

// THE STRATEGY: Use the high-end Professional Pro model (latest 2.0 Pro) for maximum intelligence.
const BRAIN_MODEL = "gemini-2.0-pro-exp-02-05";
const VISION_MODEL = "gemini-2.0-pro-exp-02-05";

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
            model: VISION_MODEL,
            contents: [{
                role: 'user',
                parts: [
                    ...parts,
                    {
                        text: `You are a Senior Product Cinematographer and Visual Identity Architect.
                    SYSTEM DIRECTIVE: Analyze this product with extreme forensic precision. 
                    
                    TASK: Create a "Digital Twin Visual Blueprint". 
                    INSPECTION PROTOCOL:
                    - Extract every material nuance: texture, reflectivity, weight appearance.
                    - Identify exact colors (hex or descriptive) and branding placement.
                    - Define the 3D footprint: dimensions, scale, and characteristic silhouette.
                    
                    In 'description', provide a "CINEMATIC MASTER BLUEPRINT" (Strictly English):
                    1. VISUAL IDENTITY: Exact description of the product as a fixed, high-end commercial asset.
                    2. MATERIAL PHYSICS: How light reacts to its surfaces (e.g., "brushed titanium with soft micro-reflections").
                    3. UNCHANGING ATTRIBUTES: List things that Sora 2 must NEVER change (logos, specific curves, material types).
                    4. SCALE & PROPORTION: The product's size relative to common environments.
                    
                    REGRA: 'productType' e cenários em Português. 'description' deve ser o MASTER BLUEPRINT em Inglês.`
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
    const isScriptMode = options.mode === 'script' && !!options.script;

    const promptContext = isScriptMode ? `
    ACT AS A SORA 2 MASTER SCRIPT-TO-VISUAL ADAPTER.
    
    PRODUCT BLUEPRINT: ${productDescription}
    RAW SCRIPT:
    """
    ${options.script}
    """
    
    TASK: BREAK DOWN THE ENTIRE SCRIPT INTO A COMPLETE STORYBOARD.
    1. READ every section (Hook, Development, Closing).
    2. GENERATE a high-fidelity Sora 2 prompt for EVERY visual scene described or implied.
    3. INTEGRITY: The product (${productDescription}) must be the persistent hero in every scene.
    4. LANGUAGE: The script is in ${options.language}, but the SORA 2 prompts MUST be in TECHNICAL CINEMATIC ENGLISH.
    5. FORMATTING: Return a JSON array of strings. Each string = one scene prompt. 
    6. Ensure NO scene is left out. If the script has 5-8 scenes, return 5-8 prompts.
    ` : `
    ACT AS A WORLD-CLASS AI VIDEO DIRECTOR FOR SORA 2.
    Product Blueprint: ${productDescription}
    Context: Mode=${options.mode}, Style=${options.style}, Lighting=${options.timeOfDay}, Aspect Ratio=${options.aspectRatio}, Environment=${options.environment}.
    
    CINEMATIC DIRECTIVES (CRITICAL):
    - OBJECT PERMANENCE: The product is the anchor. It must remain 100% physically identical to the reference throughout the shot.
    - NO MORPHING: Describe the product as a physical object, NOT a digital effect. Use "A high-end [Product Name] captured in 8k".
    - CAMERA DYNAMICS: Focus on premium camera movements.
    
    SCENE LOGIC:
    - Avoid technical simulation jargon. Use descriptive, evocative language.
    - ${options.supportingDescription || ''}
    
    STRICT TEXT/VOICE ENFORCEMENT:
    - ON-SCREEN TEXT STATUS: ${textEnabled ? `ENABLED (Include minimalist high-end typography pointers in ${options.language || 'Portuguese'})` : 'STRICTLY DISABLED. No text allowed.'}
    - VOICE-OVER STATUS: ${voiceEnabled ? `ENABLED (Write compelling scripts in ${options.language || 'Portuguese'})` : 'STRICTLY DISABLED. No narration allowed.'}
    
    OUTPUT PROTOCOL: 
    - The overall prompt MUST be in English.
    - Focus on "Frame 0 Fidelity".
    - Provide a JSON array of 3 cinematic "Director Directives" for Sora 2.
    ${previousPrompts && previousPrompts.length > 0 ? `STORY CONTINUITY: Building upon: ${previousPrompts.join(' | ')}.` : ''}
    `;

    try {
        const response = await ai.models.generateContent({
            model: BRAIN_MODEL,
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
    TASK: CREATE AN ULTRA-REALISTIC CINEMATIC MOCKUP.
    SCENE: "${scenePrompt}"
    PRODUCT BLUEPRINT: ${productDescription}
    
    CRITICAL FIDELITY RULES:
    1. EXCLUSIVITY: Only the product from the reference images exists. Do not substitute with generic versions.
    2. PHYSICS: High-end production lighting (rim light, soft shadows, caustic reflections).
    3. POSITIONING: Center the product as the hero of the frame.
    
    OUTPUT: Direct Image Generation. Photorealistic Commercial Quality.
    `;

    const imageParts = (imagesBase64 || []).map(base64 => {
        const data = base64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
        return { inlineData: { data, mimeType: 'image/jpeg' } };
    });

    try {
        const response = await ai.models.generateContent({
            model: VISION_MODEL, // Using Pro Exp for best visual fidelity if output is supported
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

