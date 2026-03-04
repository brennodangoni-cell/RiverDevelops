import { GoogleGenAI, Type } from "@google/genai";

export interface ProductAnalysis {
    description: string;
    geometricSignature: string;
    productType: string;
    suggestedSceneriesProductOnly: string[];
    suggestedSceneriesLifestyle: string[];
    colors?: string[];
    sellingPoints?: string[];
    dominantHexColors?: string[];
}

export interface SceneryAnalysis {
    description: string;
    locationType: string;
    mood: string;
    suggestedActions: string[];
    suggestedCameraAngles: string[];
    suggestedAudio: string[];
}

const BRAIN_MODELS = ["gemini-2.0-flash", "gemini-2.0-pro", "gemini-3.1-pro-preview"];
const ANALYSIS_MODELS = ["gemini-2.0-flash", "gemini-2.0-pro"];
const IMAGE_MODELS = ["gemini-3.1-flash-image-preview", "gemini-3-pro-image-preview"];

export class AIError extends Error {
    type: 'SAFETY_FILTER' | 'RATE_LIMIT' | 'MODEL_NOT_FOUND' | 'API_KEY_MISSING' | 'TIMEOUT' | 'UNKNOWN';
    retryable: boolean;
    constructor(message: string, type: AIError['type'], retryable = false) {
        super(message);
        this.type = type;
        this.retryable = retryable;
    }
}

function classifyError(e: any): AIError {
    const msg = e?.message || e?.toString() || '';
    if (msg.includes('API key') || msg.includes('API_KEY')) return new AIError('Chave API do Gemini não encontrada ou inválida.', 'API_KEY_MISSING', false);
    if (msg.includes('safety') || msg.includes('racy') || msg.includes('blocked')) return new AIError('Conteúdo bloqueado pelos filtros de segurança.', 'SAFETY_FILTER', true);
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) return new AIError('Limite de requisições atingido.', 'RATE_LIMIT', true);
    if (msg.includes('404') || msg.includes('not found')) return new AIError('Modelo não disponível.', 'MODEL_NOT_FOUND', true);
    if (msg.includes('timeout') || msg.includes('DEADLINE')) return new AIError('Timeout na requisição.', 'TIMEOUT', true);
    return new AIError(`Erro inesperado: ${msg.slice(0, 100)}`, 'UNKNOWN', true);
}

function getApiKey(): string {
    const localKey = localStorage.getItem('gemini_api_key');
    if (localKey && localKey.trim().startsWith('AIzaSy')) return localKey.trim();
    const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (envKey && envKey.trim().startsWith('AIzaSy')) return envKey.trim();
    return "";
}

function parseBase64(base64: string): { data: string; mimeType: string } {
    const match = base64.match(/^data:([^;]+);base64,(.*)$/);
    if (match) {
        let mimeType = match[1];
        if (!mimeType.startsWith('image/')) mimeType = 'image/jpeg';
        return { data: match[2], mimeType };
    }
    return { data: base64, mimeType: 'image/jpeg' };
}

async function generateWithFallback(ai: GoogleGenAI, models: string[], requestBuilder: (model: string) => any, maxRetries = 1): Promise<any> {
    let lastError: any;
    for (const model of models) {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const request = requestBuilder(model);
                return await ai.models.generateContent(request);
            } catch (e: any) {
                lastError = e;
                const classified = classifyError(e);
                if (classified.type === 'MODEL_NOT_FOUND') break;
                if (!classified.retryable) throw classified;
                if (attempt < maxRetries) await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
            }
        }
    }
    throw classifyError(lastError);
}

// =======================================================================
// 1. ANALYZE PRODUCT
// =======================================================================
export async function analyzeProduct(imagesBase64: string[], marketingContext?: string, creativityLevel: string = 'Balanceado'): Promise<ProductAnalysis> {
    const apiKey = getApiKey();
    if (!apiKey) throw new AIError("Chave API do Gemini não configurada.", "API_KEY_MISSING");
    const ai = new GoogleGenAI({ apiKey });
    const parts = imagesBase64.map(b64 => {
        const { data, mimeType } = parseBase64(b64);
        return { inlineData: { data, mimeType } };
    });

    const response = await generateWithFallback(ai, ANALYSIS_MODELS, (model) => ({
        model,
        contents: {
            parts: [
                ...parts,
                {
                    text: `SYSTEM MANDATE: You are the WORLD'S TOP INDUSTRIAL DESIGNER.
TASK: Break down this product into a DETERMINISTIC ANCHOR BLUEPRINT for Sora 2.

INSTRUCTIONS:
1. GEOMETRIC SIGNATURE: Fundamental shape in 5-8 words.
2. PRODUCT DNA: Paragraph on material physics, texture, and branding.
3. SCENARIOS: 4 scenarios for the "${creativityLevel}" tier.

RETURN JSON:
{
  "geometricSignature": string,
  "description": string (English),
  "productType": string (PT-BR),
  "suggestedSceneriesProductOnly": string[],
  "suggestedSceneriesLifestyle": string[],
  "colors": string[],
  "sellingPoints": string[],
  "dominantHexColors": string[]
}`
                }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    geometricSignature: { type: Type.STRING },
                    description: { type: Type.STRING },
                    productType: { type: Type.STRING },
                    suggestedSceneriesProductOnly: { type: Type.ARRAY, items: { type: Type.STRING } },
                    suggestedSceneriesLifestyle: { type: Type.ARRAY, items: { type: Type.STRING } },
                    colors: { type: Type.ARRAY, items: { type: Type.STRING } },
                    sellingPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                    dominantHexColors: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            }
        }
    }));

    try { return JSON.parse(response.text || "{}"); }
    catch { throw new AIError("Falha ao processar análise do produto.", "UNKNOWN"); }
}

// =======================================================================
// 1B. ANALYZE SCENERY
// =======================================================================
export async function analyzeScenery(imagesBase64: string[], marketingContext?: string): Promise<SceneryAnalysis> {
    const apiKey = getApiKey();
    if (!apiKey) throw new AIError("Chave API do Gemini não configurada.", "API_KEY_MISSING");
    const ai = new GoogleGenAI({ apiKey });
    const parts = imagesBase64.map(b64 => {
        const { data, mimeType } = parseBase64(b64);
        return { inlineData: { data, mimeType } };
    });

    const response = await generateWithFallback(ai, ANALYSIS_MODELS, (model) => ({
        model,
        contents: {
            parts: [
                ...parts,
                {
                    text: `Analyze these SCENERY images for commercial video production.
RETURN JSON:
{
  "description": string,
  "locationType": string,
  "mood": string,
  "suggestedActions": string[],
  "suggestedCameraAngles": string[],
  "suggestedAudio": string[]
}` }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    description: { type: Type.STRING },
                    locationType: { type: Type.STRING },
                    mood: { type: Type.STRING },
                    suggestedActions: { type: Type.ARRAY, items: { type: Type.STRING } },
                    suggestedCameraAngles: { type: Type.ARRAY, items: { type: Type.STRING } },
                    suggestedAudio: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            }
        }
    }));

    try { return JSON.parse(response.text || "{}"); }
    catch { return { description: "", locationType: "Local", mood: "", suggestedActions: [], suggestedCameraAngles: [], suggestedAudio: [] }; }
}

// =======================================================================
// 2. GENERATE PROMPTS (Production Engine v16.2)
// =======================================================================
export async function generatePrompts(productDescription: string, options: any, previousPrompts?: string[], detectedColors?: string[], sceneDraft?: string): Promise<string[]> {
    const apiKey = getApiKey();
    if (!apiKey) throw new AIError("Chave API do Gemini não configurada.", "API_KEY_MISSING");
    const ai = new GoogleGenAI({ apiKey });

    const visualAnchor = previousPrompts?.length ? `\nVISUAL CONTINUITY: Lock settings to previous: "${previousPrompts[previousPrompts.length - 1]}"` : '';

    const systemPrompt = `ACT AS THE SORA 2 MASTER DIRECTOR (v16.2).
MISSION: Generate a DETERMINISTIC commercial prompt.

[STRICT GOLDEN RULES]
1. THE ANCHOR: Start with clear geometry/material lockdown (first 12 words).
2. NO OVERCROWDING: ONE main action, ONE clear camera move. No list-hell.
3. PHYSICS: Describe specular highlights, subsurface scattering, and surface grain.
4. STRUCTURE: Output separate sections: Prompt, Cinematography, Actions, Sound.
5. LENGTH: Block < 300 words.

[IDENTITY]
${productDescription}
${detectedColors?.length ? `PALETTE: ${detectedColors.join(', ')}` : ''}
${visualAnchor}

[TARGET]
- Env: ${options.environment} | Light: ${options.timeOfDay} | Style: ${options.style}`;

    const response = await generateWithFallback(ai, BRAIN_MODELS, (model) => ({
        model,
        contents: {
            parts: [{ text: systemPrompt + (sceneDraft ? `\n\nPOLISH DRAFT: "${sceneDraft}"` : "\n\nTask: Generate commercial sequence.") }]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
    }));

    try { return JSON.parse(response.text || "[]"); }
    catch { return []; }
}

// =======================================================================
// 3. GENERATE MOCKUP (v16.2)
// =======================================================================
export async function generateMockup(productDescription: string, options: any, productImages: string[], promptText?: string): Promise<string | null> {
    const apiKey = getApiKey();
    if (!apiKey) throw new AIError("Chave API do Gemini não configurada.", "API_KEY_MISSING");
    const ai = new GoogleGenAI({ apiKey });

    const imagePrompt = `TASK: GENERATE MASTER VISUAL REFERENCE. 100% PRODUCT FIDELITY.
LOCK: Clone product from photos exactly. No text. No UI. No collage. 
SCENE: ${options.environment} | LIGHT: ${options.timeOfDay}. 1K Cinematic Master.`;

    const contentParts: any[] = [];
    if (productImages?.length) {
        productImages.slice(0, 3).forEach(b64 => {
            const { data, mimeType } = parseBase64(b64);
            contentParts.push({ inlineData: { data, mimeType } });
        });
    }
    contentParts.push({ text: imagePrompt });

    try {
        const response = await generateWithFallback(ai, IMAGE_MODELS, (model) => ({
            model,
            contents: { parts: contentParts },
            config: {
                // @ts-ignore
                imageConfig: { aspectRatio: "16:9", imageSize: "1K" }
            }
        }));
        const part = response.candidates?.[0]?.content?.parts.find((p: any) => p.inlineData);
        return part ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : null;
    } catch { return null; }
}
