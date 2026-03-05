
import { GoogleGenAI, Type } from "@google/genai";

export interface ProductAnalysis {
    description: string;
    productType: string;
    suggestedSceneriesProductOnly: string[];
    suggestedSceneriesLifestyle: string[];
    colors?: string[]; // Unique colors seen in images
    sellingPoints?: string[]; // Top 3 marketing hooks/advantages
    dominantHexColors?: string[]; // Precise hex codes extracted from photos
}

export interface SceneryAnalysis {
    description: string;
    locationType: string;
    mood: string;
    suggestedActions: string[];
    suggestedCameraAngles: string[];
    suggestedAudio: string[];
}

// =======================================================================
// MODEL CONFIGURATION WITH FALLBACK CHAIN (Fix #4)
// =======================================================================
const BRAIN_MODELS = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-3.1-pro-preview"];
const ANALYSIS_MODELS = ["gemini-2.5-flash", "gemini-2.5-pro"];
const IMAGE_MODELS = ["gemini-3.1-pro-image-preview", "gemini-2.5-flash-image", "gemini-2.0-flash-preview-image-generation"];

// =======================================================================
// ERROR TYPES (Fix #2 - Specific error handling)
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
        return new AIError('Conteúdo bloqueado pelo filtro de segurança. Tente ajustar as opções.', 'SAFETY_FILTER', true);
    }
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('rate')) {
        return new AIError('Limite de requisições atingido. Aguarde alguns segundos.', 'RATE_LIMIT', true);
    }
    if (msg.includes('404') || msg.includes('not found') || msg.includes('NOT_FOUND')) {
        return new AIError('Modelo não disponível. Tentando modelo alternativo...', 'MODEL_NOT_FOUND', true);
    }
    if (msg.includes('timeout') || msg.includes('DEADLINE')) {
        return new AIError('Timeout na requisição. Tentando novamente...', 'TIMEOUT', true);
    }
    return new AIError(`Erro inesperado: ${msg.slice(0, 100)}`, 'UNKNOWN', true);
}

// =======================================================================
// API KEY
// =======================================================================
function getApiKey(): string {
    const localKey = localStorage.getItem('gemini_api_key');
    if (localKey && localKey.trim().startsWith('AIzaSy')) return localKey.trim();

    const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (envKey && envKey.trim().startsWith('AIzaSy')) return envKey.trim();

    return "";
}

// =======================================================================
// UNIVERSAL BASE64 PARSER (handles ANY mime type)
// =======================================================================
function parseBase64(base64: string): { data: string; mimeType: string } {
    // Match ANY data URI: data:image/jpeg, data:application/octet-stream, etc.
    const match = base64.match(/^data:([^;]+);base64,(.*)$/);
    if (match) {
        let mimeType = match[1];
        // Force image mime type — octet-stream means the browser didn't recognize it
        if (!mimeType.startsWith('image/')) mimeType = 'image/jpeg';
        return { data: match[2], mimeType };
    }
    // No prefix — assume raw base64 JPEG
    return { data: base64, mimeType: 'image/jpeg' };
}

// =======================================================================
// IMAGE COMPRESSION (Fix #6)
// =======================================================================
function compressImage(base64: string, maxSize = 1024): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;

            if (width > maxSize || height > maxSize) {
                const ratio = Math.min(maxSize / width, maxSize / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => resolve(base64); // fallback to original
        img.src = base64;
    });
}

export async function compressImages(images: string[]): Promise<string[]> {
    return Promise.all(images.map(img => compressImage(img)));
}

// =======================================================================
// HELPER: Generate with fallback chain (Fix #4)
// =======================================================================
async function generateWithFallback(
    ai: GoogleGenAI,
    models: string[],
    requestBuilder: (model: string) => any,
    maxRetries = 1
): Promise<any> {
    let lastError: any;

    for (const model of models) {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const request = requestBuilder(model);
                return await ai.models.generateContent(request);
            } catch (e: any) {
                lastError = e;
                const classified = classifyError(e);
                console.warn(`[AI] Model ${model} attempt ${attempt + 1} failed:`, classified.type, classified.message);

                if (classified.type === 'MODEL_NOT_FOUND') break; // skip to next model
                if (classified.type === 'API_KEY_MISSING') throw classified;
                if (classified.type === 'SAFETY_FILTER') throw classified;
                if (!classified.retryable) throw classified;

                // Wait before retry (exponential backoff)
                if (attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
                }
            }
        }
    }

    throw classifyError(lastError);
}

// =======================================================================
// 1. ANALYZE PRODUCT
// =======================================================================
export async function analyzeProduct(imagesBase64: string[], marketingContext?: string): Promise<ProductAnalysis> {
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
                    text: `SYSTEM MANDATE: You are an ELITE ADVERTISING DIRECTOR and CMO.
${marketingContext ? `
[CRITICAL MARKETING CONTEXT - SUPER-PRIORITY]
"""
${marketingContext}
"""
MANDATE: ALL Suggested Sceneries (Lifestyle & Product-Only) MUST directly serve the marketing goals, target audience, and benefits described above. No generic suggestions allowed.
` : ''}

Analyze these product images for a SORA 2 digital twin. RETURN a JSON with: 1. 'description' (ENGLISH, detailed). 2. 'productType' (PT-BR). 3. 'suggestedSceneriesProductOnly' (PT-BR): 4 scenarios. 4. 'suggestedSceneriesLifestyle' (PT-BR): 4 scenarios. MANDATE: REALISTIC, PROFESSIONAL, GROUNDED. Cinematic = good lighting, clean composition, believable — NOT surreal, NOT dreamlike, NOT avant-garde. Think: Nike/Apple/real brand commercials. Real locations, real people, real light. No liquid metal, no floating objects, no fantasy. Elegant but believable.

1. "description" (ENGLISH, ultra-detailed):
    - Exact physical traits: shape, silhouette, weight distribution
    - MICRO-PHYSICS: How the materials react to touch and pressure (e.g., "memory foam compression", "rigid plastic", "liquid viscosity")
    - Textures & Finishes: (matte, glossy, brushed, rubberized, porous)
    - Colors: Verbal description + precise HEX codes (e.g., "Emerald Green #50C878")
    - QUANTITY: Exactly how many items (pair/set/single)?
    - Branding: Exact placement and legibility of all logos/text.

2. "productType" (PORTUGUESE): Short category name

3. "suggestedSceneriesProductOnly" (PORTUGUESE): 4 REALISTIC scenarios — studio, fundo neutro, mesa de madeira, superfície natural. Clean, professional, believable. No surrealism.

4. "suggestedSceneriesLifestyle" (PORTUGUESE): 4 REALISTIC scenarios — pessoa em ambiente real (sala, rua, praia, café). Natural, elegante, sem exageros. Interação genuína com o produto.

5. "colors" (ENGLISH): List of all unique colors/variations detected with HEX.

6. "sellingPoints" (PORTUGUESE): TOP 3 technical/visual advantages.

7. "dominantHexColors": List the 3 most important HEX CODES detected.` }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    description: { type: Type.STRING, description: "Ultra-precise English description including shape, colors (hex), materials, textures, branding, text, logos, QUANTITY (pair/single/set), display convention, and all unique visual features." },
                    productType: { type: Type.STRING, description: "A short category name in Portuguese (e.g., 'Tênis', 'Garrafa de Skincare', 'Eletrônico')." },
                    suggestedSceneriesProductOnly: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "Array of 3-4 realistic studio/neutral environment descriptions in Portuguese. Professional, believable, no surrealism."
                    },
                    suggestedSceneriesLifestyle: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "Array of 3-4 realistic lifestyle scenarios in Portuguese. Real locations, natural actions, no fantasy."
                    },
                    colors: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "List of all unique color variations detected in the provided images."
                    },
                    sellingPoints: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "Top 3 marketing hooks/technical advantages in Portuguese."
                    },
                    dominantHexColors: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "List of precise hex codes extracted (e.g. ['#FFFFFF'])."
                    }
                },
                required: ["description", "productType", "suggestedSceneriesProductOnly", "suggestedSceneriesLifestyle", "colors", "sellingPoints", "dominantHexColors"]
            }
        }
    }));

    try {
        return JSON.parse(response.text || "{}");
    } catch (e) {
        console.error("Failed to parse analysis", e);
        return { description: "", productType: "Produto", suggestedSceneriesProductOnly: [], suggestedSceneriesLifestyle: [] };
    }
}

// =======================================================================
// 1B. ANALYZE SCENERY (Scene Mode)
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
                    text: `SYSTEM MANDATE: You are an ELITE SCENERY SCOUT and NARRATIVE ARCHITECT.
${marketingContext ? `
[CRITICAL MARKETING CONTEXT - SUPER-PRIORITY]
"""
${marketingContext}
"""
MANDATE: Tailor ALL suggestions (Mood, Actions, Camera) to strictly serve this specific audience and marketing angle.
` : ''}

Analyze these SCENERY/LOCATION images for a high-end commercial.

RETURN a JSON:
1. "description" (ENGLISH): Ultra-detailed description of the location — architecture, nature, lighting conditions, colors, textures, atmosphere, time of day, weather.
2. "locationType" (PORTUGUESE): Short category — e.g., "Praia", "Floresta", "Cidade Urbana", "Interior de Casa"
3. "mood" (ENGLISH): The emotional mood this location evokes — e.g., "serene and peaceful", "gritty and urban"
4. "suggestedActions" (PORTUGUESE): 4 actions/events that could naturally happen in this location for a commercial video. Each should describe WHO does WHAT with EMOTION.
5. "suggestedCameraAngles" (ENGLISH): 4 camera techniques ideal for this location. E.g., "Drone pullback revealing the full landscape"
6. "suggestedAudio" (ENGLISH): 4 ambient sound + music combinations. E.g., "Ocean waves crashing + soft acoustic guitar"` }
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
                },
                required: ["description", "locationType", "mood", "suggestedActions", "suggestedCameraAngles", "suggestedAudio"]
            }
        }
    }));

    try { return JSON.parse(response.text || "{}"); }
    catch { return { description: "", locationType: "Local", mood: "", suggestedActions: [], suggestedCameraAngles: [], suggestedAudio: [] }; }
}

// =======================================================================
// 2. GENERATE PROMPTS
// =======================================================================
export async function generatePrompts(
    productDescription: string,
    options: any,
    previousPrompts?: string[],
    detectedColors?: string[],
    sceneDraft?: string // Specific scene draft to polish
): Promise<string[]> {
    // Define DNA injection
    const apiKey = getApiKey();
    if (!apiKey) throw new AIError("Chave API do Gemini não configurada.", "API_KEY_MISSING");

    const ai = new GoogleGenAI({ apiKey });

    // Initialize DNA injection
    const hexInfo = detectedColors?.length ? `\nADOPT THESE EXACT HEX COLORS FOR PRODUCT MATERIALS: ${detectedColors.join(', ')}` : '';
    let taskDescription = sceneDraft ? `
    Polish this draft into a simple, natural prompt. Keep the same vibe — person, action, product, logo visibility, ambient sound.
    ` : (detectedColors && detectedColors.length > 1 ? `
    Create 3 scenes showcasing different color variants. Same simple style: person + action + product + logo visible + sound.
    ` : `
    Create 3 simple scenes:
    Scene 1: Person in a relaxed setting (e.g. by pool, in living room). Product visible. Logo clear. Natural light.
    Scene 2: Different person or angle. Product in use (stepping, walking). Logo on strap/footbed clearly visible.
    Scene 3: Close-up or detail. Product colors and materials. Logo sharp.
    All in the same natural, flowing style — no jargon.
    `);

    const isScriptMode = options.mode === 'script' && !!options.script;

    if (sceneDraft) {
        // Task description for "Magic" expansion is already set above
    } else if (isScriptMode) {
        taskDescription = `
    Script: ${options.script}
    Break into 3 simple prompts. Same natural style: person, action, product, logo visible, sound.
        `;
    } else if (previousPrompts && previousPrompts.length > 0) {
        taskDescription = `
    Previous scenes: ${previousPrompts.map((p, i) => `Scene ${i + 1}: ${p.slice(0, 80)}...`).join('\n')}
    Generate 3 NEW scenes in the same simple, natural style. Match the vibe.
        `;
    }

    const promptStyle = `
WRITE SIMPLE, NATURAL SORA 2 PROMPTS — LIKE A SUCCESSFUL COMMERCIAL BRIEF.

FORMAT (follow this flow):
1. Person + action + location. Example: "A middle-aged man with light skin and blonde hair sits on a comfortable lounge chair by a resort pool..."
2. Product woven in naturally with colors and details. Example: "his creamy beige 'yogui' flip-flops, accented with the vivid orange stripe, resting casually on the warm flagstones."
3. Shot type, framing, lens — brief. Example: "A medium shot, framed at 9:16 with an 85mm lens, captures his relaxed posture..."
4. Camera movement: holds steady, tracks, orbits — simple.
5. Mood/feeling: contentment, ease, gentle grace.
6. Logo visibility: "making the 'yogui' logo on the strap clearly visible" or similar.
7. Ambient sound: "Gentle sounds of water lapping and distant conversation" or "subtle fabric rustles."

RULES:
- REALISTIC scenes only. No surrealism, no dreamlike, no fantasy. Believable locations and actions.
- SIMPLE language. No jargon like "kinetic foundation" or "volumetric lighting".
- Brand name in quotes: 'yogui' or whatever the product brand is.
- Product colors and materials described naturally (creamy beige, vivid orange stripe, pure white, black stripe).
- One flowing paragraph. 80-120 words.
- If lifestyle: include person (age hint, skin, hair) and their natural action.
- Logo must be "clearly visible" somewhere in the prompt.
    `;

    const promptContext = `
Write simple, natural Sora 2 prompts. Natural scene descriptions only — no meta-instructions about "uploaded images" or "product reference".

SETTINGS:
- Environment: ${options.environment}
- Lighting: ${options.timeOfDay}
- Style: ${options.style}
- Aspect: ${options.aspectRatio}
${options.mode === 'lifestyle' ? `- Person: ${options.gender}, ${options.skinTone}, ${options.hairColor}` : ''}

PRODUCT:
${productDescription}
${hexInfo}

${sceneDraft ? `SCENE DRAFT TO POLISH:\n"${sceneDraft}"` : ''}
${(options.customScenario || options.supportingDescription) ? `\nUSER REQUEST / CENA DESCRITA: ${(options.customScenario || options.supportingDescription).trim()}` : ''}

${taskDescription}

${promptStyle}

Output: JSON array of 3 simple prompts (80-120 words each). Natural language. No jargon.
    `;


    const response = await generateWithFallback(ai, BRAIN_MODELS, (model) => ({
        model,
        contents: {
            parts: [{ text: promptContext }]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.STRING,
                    description: "A detailed Sora 2 video generation prompt."
                }
            }
        }
    }));

    try {
        const parsed = JSON.parse(response.text || "[]");
        if (!Array.isArray(parsed)) return [];
        return parsed.map((p: string) => {
            const s = (typeof p === 'string' ? p : '').trim();
            if (!s) return '';
            return s;
        }).filter((s: string) => s.length > 0);
    } catch (e) {
        console.error("Failed to parse prompts", e);
        return [];
    }
}

// =======================================================================
// 3. GENERATE MOCKUP — 100% VISION-BASED (fotos = única fonte do produto)
// =======================================================================
export async function generateMockup(
    _productDescription: string, // IGNORED — produto vem só das fotos
    options: any,
    promptIndex: number,
    productImages: string[],
    promptText?: string // Cena/ambiente para o mockup (não aparência do produto)
): Promise<string | null> {
    const apiKey = getApiKey();
    if (!apiKey) throw new AIError("Chave API do Gemini não configurada.", "API_KEY_MISSING");

    if (!productImages?.length) {
        throw new AIError("Envie fotos do produto para gerar o mockup. O gerador usa apenas as imagens, não descrições.", "UNKNOWN", false);
    }

    const ai = new GoogleGenAI({ apiKey });

    const heroHints = [
        "Produto inteiro em cena, logo visível. Ambiente amplo.",
        "Produto em uso/interação. Logo legível.",
        "Close-up de materiais e logo. Nitidez máxima.",
        "Ângulo lateral limpo. Logo visível.",
        "Vista de cima. Geometria limpa. Branding nítido.",
        "Ângulo hero, branding de frente.",
        "Cena dinâmica. Produto e logo em destaque.",
        "Lifestyle. Produto em ação. Logo visível.",
        "Produto em foco. Logo em destaque."
    ];
    const heroHint = heroHints[promptIndex] || heroHints[0];

    const imagePrompt = `AGENCY PITCH BOARD — 16:9 COLLAGE. Layout OBRIGATÓRIO com painéis separados.

═══════════════════════════════════════════════════════════════
REGRA CRÍTICA — ZERO INVENÇÃO DE LOGO/MARCA
═══════════════════════════════════════════════════════════════

O produto deve ser IDÊNTICO ao que aparece nas fotos do PRODUTO.

- Se uma foto mostra logo/marca SOZINHA (sem produto) = é de APOIO/REFERÊNCIA. NÃO adicione esse logo ao produto. NUNCA.
- Só replique logo/marca que já aparece VISÍVEL NO PRODUTO nas fotos do produto.
- Se o produto nas fotos NÃO tem logo visível = o mockup NÃO deve ter logo. Mostre detalhe de material/textura no painel em vez de inventar logo.

ESTRUTURA OBRIGATÓRIA:

[ESQUERDA ~55%] — HERO / MAIN
- Shot principal do produto inteiro — exatamente como nas fotos
- ${heroHint}
- Ambiente: ${options.environment} | Luz: ${options.timeOfDay}
${options.mode === 'lifestyle' ? `- Pessoa: ${options.gender}, ${options.skinTone}, ${options.hairColor}` : ''}

[DIREITA — 3 painéis empilhados, ~15% cada]

1. TOPO — Só se o produto NAS FOTOS tiver logo visível: close-up do logo. Se NÃO tiver logo no produto, use: close-up de textura/material.

2. MEIO — MATERIAL / INTERIOR
   - Detalhe de costura, forro, acabamento, textura
   - O que as fotos do produto mostram

3. BAIXO — DETALHE / ÂNGULO
   - Sola, lateral, costas — fiel às fotos

NUNCA invente logo, letra ou marca. Produto = cópia exata do que está nas fotos do produto.
${promptText ? `Contexto da cena: "${promptText.slice(0, 250)}"` : ''}`;

    const contentParts: any[] = [];

    const selected = productImages.length <= 4
        ? productImages
        : [productImages[0], productImages[Math.floor(productImages.length / 3)], productImages[Math.floor(2 * productImages.length / 3)], productImages[productImages.length - 1]];

    for (let i = 0; i < selected.length; i++) {
        const { data, mimeType } = parseBase64(selected[i]);
        contentParts.push({ text: `[IMAGEM ${i + 1}] Se for foto do PRODUTO: replique exatamente. Se for logo/marca SOZINHA (de apoio): NÃO coloque no produto.` });
        contentParts.push({ inlineData: { data, mimeType } });
    }

    contentParts.push({ text: imagePrompt });

    try {
        const response = await generateWithFallback(ai, IMAGE_MODELS, (model) => ({
            model,
            contents: { parts: contentParts },
            config: {
                // @ts-ignore
                imageConfig: {
                    aspectRatio: "16:9",
                    imageSize: "1K"
                }
            }
        }));

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    } catch (e: any) {
        const classified = classifyError(e);
        console.error("Mockup generation failed:", classified.type, classified.message);
        throw classified;
    }
    return null;
}

// =======================================================================
// 4. GENERATE VIDEO (Veo 3.1) — 8s, opcional com mockup como referência
// =======================================================================
const VEO_MODELS = ["veo-3.1-generate-preview", "veo-2.0-generate-001"];
const POLL_INTERVAL_MS = 15000;
const MAX_POLL_MINUTES = 10;

export async function generateVideo(
    prompt: string,
    mockupImageBase64?: string | null,
    options?: { aspectRatio?: string; durationSeconds?: number }
): Promise<string | null> {
    const apiKey = getApiKey();
    if (!apiKey) throw new AIError("Chave API do Gemini não configurada.", "API_KEY_MISSING");

    const ai = new GoogleGenAI({ apiKey });
    const duration = Math.min(8, options?.durationSeconds ?? 8); // Veo max 8s
    const aspectRatio = options?.aspectRatio ?? "16:9";

    const source: { prompt: string; image?: { imageBytes: string; mimeType: string } } = { prompt };
    if (mockupImageBase64) {
        const { data, mimeType } = parseBase64(mockupImageBase64);
        source.image = { imageBytes: data, mimeType };
    }

    let operation: any;
    try {
        operation = await ai.models.generateVideos({
            model: VEO_MODELS[0],
            source,
            config: {
                durationSeconds: duration,
                aspectRatio,
                numberOfVideos: 1,
                generateAudio: true
            }
        });
    } catch (e: any) {
        const classified = classifyError(e);
        console.error("Video generation start failed:", classified.type, classified.message);
        throw classified;
    }

    const startTime = Date.now();
    while (!operation?.done) {
        if (Date.now() - startTime > MAX_POLL_MINUTES * 60 * 1000) {
            throw new AIError("Timeout: geração de vídeo excedeu o tempo limite.", "TIMEOUT", false);
        }
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
        try {
            operation = await ai.operations.getVideosOperation({ operation });
        } catch (e: any) {
            throw classifyError(e);
        }
    }

    const video = operation?.response?.generatedVideos?.[0]?.video;
    if (!video) return null;

    if (video.uri) return video.uri;
    if (video.videoBytes) {
        const mime = video.mimeType || "video/mp4";
        return `data:${mime};base64,${video.videoBytes}`;
    }
    return null;
}
