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

const BRAIN_MODELS = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-3.1-pro-preview"];
const ANALYSIS_MODELS = ["gemini-2.5-flash", "gemini-2.5-pro"];
const IMAGE_MODELS = ["gemini-3.1-flash-image-preview", "gemini-3-pro-image-preview", "gemini-1.5-flash"];

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
    if (msg.includes('safety') || msg.includes('SAFETY') || msg.includes('blocked')) {
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

function sanitizeJson(text: string): string {
    return text.replace(/```json\n?|```/g, '').trim();
}

async function generateWithFallback(ai: any, models: string[], contentsBuilder: () => any): Promise<any> {
    let lastError: any;
    for (const modelName of models) {
        try {
            return await ai.models.generateContent({
                model: modelName,
                ...contentsBuilder()
            });
        } catch (e: any) {
            lastError = e;
            console.warn(`Model ${modelName} failed`, e);
        }
    }
    throw classifyError(lastError);
}

export async function analyzeProduct(imagesBase64: string[], marketingContext?: string): Promise<ProductAnalysis> {
    const apiKey = getApiKey();
    if (!apiKey) throw new AIError("Chave API não configurada.", "API_KEY_MISSING");
    const ai = new GoogleGenAI({ apiKey } as any);
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

[THE TASK] 4 Concepts:
- Concept 1: "Technical Detail" (Macro/textures).
- Concept 2: "Lifestyle Luxury" (Premium environment).
- Concept 3: "Surreal Avant-Garde" (Visual metaphor).
- Concept 4: "Power Hero" (Minimalist/Silhouette).

MANDATE:
- "description" MUST be in English.
- "title", "visualHook", "commercialReason" MUST be in Portuguese (PT-BR).

RETURN JSON with: description (English), productType (PT), concepts (Array of 4 objects with title, visualHook, commercialReason, category), colors (HEX list), sellingPoints, dominantHexColors.${marketingContext ? `\nCONTEXT: ${marketingContext}` : ''}`
                }
            ]
        }],
        generationConfig: {
            responseMimeType: "application/json"
        }
    }));

    const text = response.text || "";
    return JSON.parse(sanitizeJson(text));
}

export async function generatePrompts(
    productDescription: string,
    concept: CommercialConcept,
    marketingContext?: string
): Promise<string[]> {
    const apiKey = getApiKey();
    if (!apiKey) throw new AIError("Chave API não configurada.", "API_KEY_MISSING");
    const ai = new GoogleGenAI({ apiKey } as any);

    const promptContext = `SYSTEM: You are a Senior Sora 2 Director specialized in high-end product cinematography.
TASK: Generate 1 VIVID, TECHNICALLY DESCRIPTIVE, and CINEMATIC prompt.

MANDATE: 
- Output MUST be in English.
- Cinematic vocabulary: Use terms like "85mm prime lens", "anamorphic flare", "micro-focal shift", "depth of field", "volumetric lighting", "soft rim light".
- Motion: Describe slow, elegant camera rigs (slider, crane, macro pull). No fast cuts.
- Detail: Describe physical textures (brushed metal grains, liquid viscosity, fabric weave).
- Atmosphere: Mention "suspended dust particles", "subtle haze", "refractions".
- Length: 2-4 sentences. Detailed but focused on ONE continuous shot.
- NO meta-comments, NO aspect ratio specs.

CONCEPT: ${concept.title} - ${concept.visualHook}
PRODUCT: ${productDescription}
${marketingContext ? `MARKETING CONTEXT: ${marketingContext}` : ''}
Return as a JSON array of 1 string.`;

    const response = await generateWithFallback(ai, BRAIN_MODELS, () => ({
        contents: [{ parts: [{ text: promptContext }] }],
        generationConfig: { responseMimeType: "application/json" }
    }));

    const text = response.text || "";
    return JSON.parse(sanitizeJson(text));
}

export async function generateMockup(
    productDescription: string,
    promptText: string,
    productImages: string[]
): Promise<string | null> {
    const apiKey = getApiKey();
    if (!apiKey) throw new AIError("Chave API não configurada.", "API_KEY_MISSING");
    const ai = new GoogleGenAI({ apiKey } as any);

    const imagePrompt = `TASK: PROFESSIONAL CREATIVE DELIVERY BOARD.
MANDATE: Create a high-fidelity 16:9 cinematic presentation of the product.
DESCRIPTION: The image must be a composite board showing a large master Hero Shot with cinematic studio lighting, plus 3 smaller inset detail shots showing macro textures and logos.
STYLE: Global illumination, soft premium shadows, consistent with the product's DNA.

PRODUCT: ${productDescription}
CINEMATIC BLUEPRINT: ${promptText}
DO NOT add text or watermarks. Just the visual image board.`;

    const parts = productImages.slice(0, 3).map(b64 => {
        const { data, mimeType } = parseBase64(b64);
        return { inlineData: { data, mimeType } };
    });

    try {
        const response = await generateWithFallback(ai, IMAGE_MODELS, () => ({
            contents: [{ parts: [...parts, { text: imagePrompt }] }]
        }));

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    } catch (e) {
        console.error("Mockup failed", e);
    }
    return null;
}
