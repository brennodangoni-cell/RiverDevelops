import { GoogleGenAI } from "@google/genai";

export interface CommercialConcept {
    title: string;
    visualHook: string;
    commercialReason: string;
    category: 'PRODUCT_FOCUS' | 'LIFESTYLE_LUXURY' | 'SURREAL_AVANT_GARDE' | 'TECHNICAL_DETAIL';
}

export interface ProductAnalysis {
    description: string;
    productType: string;
    concepts: CommercialConcept[];
    colors?: string[];
    sellingPoints?: string[];
    dominantHexColors?: string[];
}

// =======================================================================
// MODEL CONFIGURATION
// =======================================================================
const BRAIN_MODELS = ["gemini-2.0-flash", "gemini-1.5-pro"];
const ANALYSIS_MODELS = ["gemini-2.0-flash"];

// =======================================================================
// ERROR TYPES
// =======================================================================
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
    if (msg.includes('API key') || msg.includes('API_KEY')) {
        return new AIError('Chave API do Gemini não encontrada ou inválida.', 'API_KEY_MISSING', false);
    }
    if (msg.includes('safety') || msg.includes('SAFETY') || msg.includes('suggestive') || msg.includes('racy') || msg.includes('blocked')) {
        return new AIError('Conteúdo bloqueado pelo filtro de segurança.', 'SAFETY_FILTER', true);
    }
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        return new AIError('Limite atingido. Aguarde alguns segundos.', 'RATE_LIMIT', true);
    }
    return new AIError(`Erro: ${msg.slice(0, 100)}`, 'UNKNOWN', true);
}

function getApiKey(): string {
    return localStorage.getItem('gemini_api_key') || (import.meta as any).env?.VITE_GEMINI_API_KEY || "";
}

function parseBase64(base64: string): { data: string; mimeType: string } {
    const match = base64.match(/^data:([^;]+);base64,(.*)$/);
    if (match) return { data: match[2], mimeType: match[1] };
    return { data: base64, mimeType: 'image/jpeg' };
}

async function generateWithFallback(ai: GoogleGenAI, models: string[], requestBuilder: (model: string) => any): Promise<any> {
    let lastError: any;
    for (const modelName of models) {
        try {
            const model = ai.getGenerativeModel({ model: modelName });
            const request = requestBuilder(modelName);
            return await model.generateContent(request);
        } catch (e: any) {
            lastError = e;
            console.warn(`Model ${modelName} failed`, e);
        }
    }
    throw classifyError(lastError);
}

// =======================================================================
// 1. ANALYZE PRODUCT
// =======================================================================
export async function analyzeProduct(imagesBase64: string[], marketingContext?: string): Promise<ProductAnalysis> {
    const apiKey = getApiKey();
    if (!apiKey) throw new AIError("Chave API não configurada.", "API_KEY_MISSING");
    const ai = new GoogleGenAI(apiKey);
    const parts = imagesBase64.map(b64 => {
        const { data, mimeType } = parseBase64(b64);
        return { inlineData: { data, mimeType } };
    });

    const response = await generateWithFallback(ai, ANALYSIS_MODELS, () => ({
        contents: [{
            parts: [
                ...parts,
                {
                    text: `SYSTEM MANDATE: You are a WORLD-CLASS CREATIVE DIRECTOR for high-end luxury commercials.
Analyze this product and architect 4 PERFECT CINEMATIC CONCEPTS for Sora 2.

[CRITICAL ANALYSIS]
1. Identify Material DNA (Liquid, Carbon Fiber, Metal).
2. identify Brand position.

[THE TASK] 4 Concepts:
- Concept 1: "Technical Detail" (Macro/textures).
- Concept 2: "Lifestyle Luxury" (Premium environment).
- Concept 3: "Surreal Avant-Garde" (Visual metaphor).
- Concept 4: "Power Hero" (Minimalist/Silhouette).

MANDATE: No generic ideas. Prompts must be DECISIVE. Elegant motion (8-10s).
RETURN JSON with: description (English), productType (PT), concepts (Array of 4 objects with title, visualHook, commercialReason, category), colors (HEX list), sellingPoints, dominantHexColors.${marketingContext ? `\nCONTEXT: ${marketingContext}` : ''}`
                }
            ]
        }],
        generationConfig: {
            responseMimeType: "application/json"
        }
    }));

    return JSON.parse(response.response.text());
}

// =======================================================================
// 2. GENERATE PROMPTS
// =======================================================================
export async function generatePrompts(
    productDescription: string,
    concept: CommercialConcept,
    marketingContext?: string
): Promise<string[]> {
    const apiKey = getApiKey();
    if (!apiKey) throw new AIError("Chave API não configurada.", "API_KEY_MISSING");
    const ai = new GoogleGenAI(apiKey);

    const promptContext = `SYSTEM: You are a Senior Sora 2 Director.
Generate 1 DECISIVE, SIMPLE, and HIGH-FIDELITY prompt based on this concept.

CONCEPT: ${concept.title} - ${concept.visualHook}
PRODUCT: ${productDescription}
${marketingContext ? `MARKETING: ${marketingContext}` : ''}

MANDATORY RULES:
1. One single shot. Shorter is better for stability.
2. Direct movement (Slow pan, gentle tilt, macro pull-in). No complex choreographies.
3. NEVER mention aspect ratio like "9:16" or "16:9".
4. Focus on physical realism.
5. Absolute product fidelity.
6. Return as a JSON array of 1 string.`;

    const response = await generateWithFallback(ai, BRAIN_MODELS, () => ({
        contents: [{ parts: [{ text: promptContext }] }],
        generationConfig: { responseMimeType: "application/json" }
    }));

    return JSON.parse(response.response.text());
}

// =======================================================================
// 3. GENERATE MOCKUP
// =======================================================================
export async function generateMockup(
    productDescription: string,
    promptText: string,
    productImages: string[]
): Promise<string | null> {
    const apiKey = getApiKey();
    if (!apiKey) throw new AIError("Chave API não configurada.", "API_KEY_MISSING");
    const ai = new GoogleGenAI(apiKey);

    const imagePrompt = `TASK: HIGH-END COMMERCIAL CONCEPT MOCKUP.
PRODUCT: ${productDescription}
CINEMATIC BLUEPRINT: ${promptText}

MANDATE:
- Perfect product reconstruction based on attached photos.
- Luxury lighting.
- 16:9 Aspect ratio.
- DO NOT add text or logos that are not in the photos.`;

    const parts = productImages.slice(0, 3).map(b64 => {
        const { data, mimeType } = parseBase64(b64);
        return { inlineData: { data, mimeType } };
    });

    try {
        const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
        const response = await model.generateContent({
            contents: [{ parts: [...parts, { text: imagePrompt }] }]
        });

        for (const part of response.response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    } catch (e) {
        console.error("Mockup failed", e);
    }
    return null;
}
