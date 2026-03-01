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
                    2. MATERIAL SHADER MATRIX: Define physical properties (e.g., "Roughness: 0.2, Metalness: 0.8, Clearcoat: 1.0"). Describe texture maps (Albedo, Normal, Displacement).
                    3. LIGHT REACTION: How surface behaves under specialized lighting (e.g., "Sharp specular highlights on edges, diffuse scattering on central body").
                    4. ANGLE-SPECIFIC NOTES: Mention details visible from specific perspectives (3:4 view, profile view) to ensure 360 consistency.
                    
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
    
    TASK: Generate 3 cinematic scenes (10s each) following a "Hook -> Feature -> Reveal" commercial arc.
    
    CINEMATOGRAPHIC METADATA (Include in EVERY prompt):
    - CAMERA: Technical move (e.g., "360 orbit at 24fps", "Push-in on 35mm Anamorphic").
    - LENS: Specify glass (e.g., "T2.0, 85mm Prime").
    - LIGHTING: Technical setup (e.g., "Rembrandt Lighting, Rim light at 5600K").
    - PHYSICS: Fluid dynamics, micro-particulates, or motion blur specs.
    
    SPECIAL DIRECTIVES:
    - LANGUAGE: ${options.language || 'Portuguese'}
    - ON-SCREEN TEXT: ${options.includeText ? 'ENABLED (Include minimalist high-end typography pointers)' : 'STRICTLY DISABLED (Do not write any text on screen)'}
    - VOICE-OVER SCRIPTS: ${options.includeVoice ? 'ENABLED (Write compelling, emotive scripts)' : 'STRICTLY DISABLED (No narration scripts allowed)'}
    
    OUTPUT: A JSON array of 3 highly detailed English technical prompts containing all metadata and text/voice data as part of the scene description. Be extremely specific about the product's Material Shader Matrix throughout.
    
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

    // ZERO-INVENTION MAPPING: Map the scene context to the EXACT product in photos
    // VISUAL ANCHOR FIDELITY PROTOCOL: Absolute product cloning.
    const imageRequestPrompt = `
    CRITICAL INSTRUCTION: ACT AS A PIXEL-PERFECT IMAGE CLONING SYSTEM.
    You are NOT allowed to deviate from the reference photos.
    
    1. VISUAL IDENTITY LOCK:
    - Use the EXACT same product visible in the attached photos. 
    - Every logo, stitching pattern, material grain, and color hex MUST match the source perfectly.
    - DO NOT simplify. DO NOT "beautify" or change proportions. 
    
    2. TECHNICAL STORYBOARD GRID TASK:
    - Create a single professional storyboard grid image.
    - MAIN PANEL: Showcase the EXACT product in the scene: "${scenePrompt}".
    - TECHNICAL PANELS: Show the product from DIFFERENT ANGLES (Front, Profile, Detail) exactly as seen in the reference photos.
    
    3. PIXEL-BY-PIXEL COMPARISON:
    - Cross-reference the master Technical Blueprint: ${productDescription}.
    - Ensure the material physics (Roughness, Specularity) are identical to the source photos.
    - The product must look like the SAME PHYSICAL OBJECT in every panel of the grid.
    
    4. QUALITY:
    - Photorealistic excellence.
    - High-end studio lighting consistent with ${scenePrompt}.
    - ZERO INVENTION. If it's not in the photos, it doesn't belong in the mockup.
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
