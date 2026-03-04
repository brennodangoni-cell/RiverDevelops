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

// Prefer modern/stable families first. Keep legacy IDs only as final fallback.
const BRAIN_MODELS = [
    "gemini-3.1-pro-preview",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.0-pro",
    "gemini-2.0-flash"
];
const ANALYSIS_MODELS = [
    "gemini-3.1-pro-preview",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.0-pro",
    "gemini-2.0-flash"
];
const IMAGE_MODELS = [
    "gemini-3.1-flash-image-preview",
    "gemini-3-pro-image-preview",
    "gemini-2.5-flash-image"
];

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

function compactText(text: string, maxChars = 1000): string {
    return (text || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxChars);
}

function extractIdentityCore(productDescription: string): string {
    const cutoffRegex = /MARKETING CONTEXT:|PONTOS DE VENDA A DESTACAR:|ADOPT THESE EXACT HEX COLORS:/i;
    const core = productDescription.split(cutoffRegex)[0] || productDescription;
    return compactText(core, 900);
}

function safeAspectRatio(aspectRatio?: string): string {
    const accepted = new Set(["16:9", "9:16", "1:1", "4:3", "3:4"]);
    return accepted.has(aspectRatio || "") ? (aspectRatio as string) : "16:9";
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
${marketingContext?.trim() ? `MARKETING CONTEXT: ${compactText(marketingContext, 240)}` : ''}

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
${marketingContext?.trim() ? `CONTEXT: ${compactText(marketingContext, 220)}` : ''}
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
// 2. GENERATE PROMPTS (Production Engine v17)
// =======================================================================
export async function generatePrompts(productDescription: string, options: any, previousPrompts?: string[], detectedColors?: string[], sceneDraft?: string): Promise<string[]> {
    const apiKey = getApiKey();
    if (!apiKey) throw new AIError("Chave API do Gemini não configurada.", "API_KEY_MISSING");
    const ai = new GoogleGenAI({ apiKey });

    const identityCore = extractIdentityCore(productDescription);
    const palette = detectedColors?.length ? detectedColors.slice(0, 8).join(", ") : "";
    const continuityLock = previousPrompts?.length ? compactText(previousPrompts[previousPrompts.length - 1], 300) : "";
    const outputCount = sceneDraft ? 1 : 3;
    const draftLine = sceneDraft ? compactText(sceneDraft, 420) : "";
    const movementIntent = compactText(options.sceneAction || options.supportingDescription || "", 180);
    const cameraIntent = compactText(options.cameraAngle || "", 120);
    const soundIntent = compactText(options.audioDesign || "", 120);
    const characters = compactText(options.characters || "", 120);
    const speedIntent = compactText(options.animationSpeed || "Normal", 40);

    const systemPrompt = `You are Product Engine v17 for Sora 2 commercials.
Goal: produce highly faithful motion prompts from product photos and identity data.

NON-NEGOTIABLE PRODUCT LOCK
- Preserve exact geometry, silhouette, logo spelling, label layout, seams/stitches, texture scale, and material behavior.
- Never morph, melt, stretch, rebrand, recolor, or invent extra parts.
- Keep proportions constant across all shots.
- Mention logo and shape lock in the opening sentence of every prompt.

VIDEO QUALITY RULES
- One main subject action and one camera move per scene.
- Keep language concrete and visual (no generic adjectives without proof).
- Keep each prompt concise, cinematic, and physically plausible for materials.
- Return ENGLISH only.

PROJECT SETTINGS
- Mode: ${options.mode === "lifestyle" ? "Lifestyle" : "Product Only"}
- Environment: ${compactText(options.environment || "Studio", 120)}
- Lighting: ${compactText(options.timeOfDay || "Cinematic", 80)}
- Style: ${compactText(options.style || "Commercial", 80)}
- Aspect ratio: ${safeAspectRatio(options.aspectRatio)}
- Motion speed: ${speedIntent}
${options.mode === "lifestyle" ? `- Talent: ${options.gender || "Any"}, ${options.skinTone || "Any"} skin, ${options.hairColor || "Any"} hair` : ""}
${cameraIntent ? `- Camera preference: ${cameraIntent}` : ""}
${movementIntent ? `- Action preference: ${movementIntent}` : ""}
${soundIntent ? `- Audio direction: ${soundIntent}` : ""}
${characters ? `- Character tags: ${characters}` : ""}

IDENTITY ANCHOR
${identityCore}
${palette ? `Palette lock: ${palette}` : ""}
${continuityLock ? `Continuity from previous shot: ${continuityLock}` : ""}
${draftLine ? `Refine this draft while preserving identity: ${draftLine}` : ""}

OUTPUT FORMAT
Return ONLY a JSON array with exactly ${outputCount} string item(s).
Each item must be a single paragraph between 80 and 140 words.
Structure inside each paragraph:
1) product lock opener, 2) subject action, 3) camera move/lens, 4) lighting/material physics, 5) ambient sound cue.`;

    const response = await generateWithFallback(ai, BRAIN_MODELS, (model) => ({
        model,
        contents: {
            parts: [{ text: systemPrompt }]
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
// 3. GENERATE MOCKUP (v17)
// =======================================================================
export async function generateMockup(productDescription: string, options: any, productImages: string[], promptText?: string): Promise<string | null> {
    const apiKey = getApiKey();
    if (!apiKey) throw new AIError("Chave API do Gemini não configurada.", "API_KEY_MISSING");
    const ai = new GoogleGenAI({ apiKey });

    const identityCore = extractIdentityCore(productDescription);
    const cameraHint = compactText(options.cameraAngle || "", 100);
    const actionHint = compactText(options.sceneAction || "", 120);
    const styleHint = compactText(options.style || "Commercial", 80);
    const scenePromptHint = promptText ? compactText(promptText, 260) : "";

    const imagePrompt = `TASK: Generate one photorealistic master mockup frame with absolute product fidelity.
SOURCE OF TRUTH: attached product photos.

HARD LOCK
- Keep exact product geometry, logo text, icon placement, stitching/seams, material texture scale, and color tones.
- No logo redesign, no spelling changes, no extra labels, no missing details.
- No collage, no split-screen, no text overlays, no UI elements, no watermark.
- Product must look like the same real object from the references.

SCENE
- Environment: ${compactText(options.environment || "Studio", 120)}
- Lighting: ${compactText(options.timeOfDay || "Controlled studio light", 90)}
- Style: ${styleHint}
${cameraHint ? `- Camera: ${cameraHint}` : ""}
${actionHint ? `- Action: ${actionHint}` : ""}
${scenePromptHint ? `- Motion prompt reference: ${scenePromptHint}` : ""}

IDENTITY BRIEF
${identityCore}

OUTPUT
- Single hero frame, commercial grade realism, sharp texture micro-details, faithful branding.`;

    const contentParts: any[] = [];
    if (productImages?.length) {
        productImages.slice(0, 6).forEach(b64 => {
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
                imageConfig: { aspectRatio: safeAspectRatio(options.aspectRatio), imageSize: "1K" }
            }
        }));
        const part = response.candidates?.[0]?.content?.parts.find((p: any) => p.inlineData);
        return part ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : null;
    } catch { return null; }
}
