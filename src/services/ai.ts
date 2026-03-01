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
                    SYSTEM DIRECTIVE: Perform a "Sequential Multi-Angle Forensic Inspection". 
                    Process EVERY image provided one by one to build a single "MASTER PRODUCT IDENTITY".
                    
                    STRICT INSPECTION RULES:
                    - IMAGE-BY-IMAGE CATALOGING: Identify unique details in Image 1, cross-reference with Image 2, then 3, and so on.
                    - MASTER PHYSICAL RECORD: Create a technical record of logos, exact stitching counts, material grain depth, and geometric curvatures.
                    - ZERO VARIATION: The analysis must result in a FIXED digital twin definition. Do not generalize.
                    - If Image A shows a detail hidden in Image B, that detail MUST be part of the final identity.
                    
                    In 'description', provide a "MASTER DIGITAL TWIN SPECIFICATION" in English:
                    1. ABSOLUTE GEOMETRY: Volumetric measurements and proportions of every component.
                    2. MATERIAL DNA: Pixel-level surface description (e.g., "High-specularity polished brass", "Porous EVA foam with specific hexagonal pattern").
                    3. BRANDING REGISTRY: Exact placement, font weight, and embossing depth of all logos.
                    4. FORENSIC NOTES: Catalog any unique wear, specific factory marks, or distinct textures visible in ANY of the photos.
                    
                    REGRA: 'productType' e cenários em Português. 'description' deve ser o MASTER DIGITAL TWIN em Inglês.`
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
    // FORENSIC RECONSTRUCTION PROTOCOL: Absolute product cloning.
    const imageRequestPrompt = `
    MASTER DIRECTIVE: 1:1 PHYSICAL RECONSTRUCTION.
    The images provided are your ONLY SOURCE OF TRUTH. 
    You are performing a Forensic Reconstruction of the product.
    
    1. DIGITAL TWIN RECONSTRUCTION:
    - Treat every photo as a technical reference for a specific part of the product.
    - REPEAT: Every logo, stitch, texture, and color MUST be a 100% clone from the photos.
    - If a detail appears in ANY of the reference photos, it MUST appear in the mockup. 
    - ZERO DEVIATION. Any artistic "improvement" is a FAILURE.
    
    2. TECHNICAL STORYBOARD GRID (STRICT FIDELITY):
    - Create a professionalStoryboard Grid. 
    - MAIN PANEL: The product strictly reconstructed in: "${scenePrompt}".
    - TECHNICAL PANELS: Sequential views (e.g., Close-up, Profile, Top) showing the EXACT same physical object with 100% consistent materials.
    
    3. VISUAL ANCHORING:
    - Anchor all pixels to the "MASTER DIGITAL TWIN SPECIFICATION": ${productDescription}.
    - The product's identity must be unshakeable across all grid panels. 
    - Materials must react to the studio lighting in ${scenePrompt} identical to how they react in the reference photos.
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
