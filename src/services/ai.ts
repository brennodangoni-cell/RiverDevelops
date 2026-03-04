import { GoogleGenAI, Type } from "@google/genai";

export interface ProductAnalysis {
    description: string;
    productType: string;
    suggestedSceneriesProductOnly: string[];
    suggestedSceneriesLifestyle: string[];
    colors?: string[]; // Unique colors seen in images
    sellingPoints?: string[]; // Top 3 marketing hooks/advantages
    dominantHexColors?: string[]; // Precise hex codes extracted from photos
    productDNA?: ProductDNA;
    branding?: {
        text?: string;
        position?: string;
        orientation?: string;
    };
    rawThinking?: string; // Chain of thought captured
}

export interface ProductDNA {
    category: string;
    quantity: string;
    upperMaterial: string;
    soleMaterial: string;
    soleShape: string;
    logoPosition: string;
    logoType: string;
    textureScale: string;
    rigidity: {
        upper: string;
        sole: string;
    };
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
const BRAIN_MODELS = ["gemini-2.5-pro", "gemini-2.5-flash"];
const ANALYSIS_MODELS = ["gemini-2.5-flash", "gemini-2.5-pro"];
const IMAGE_MODELS = ["gemini-3.1-flash-image-preview", "gemini-3-pro-image-preview"];

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

function safeParseJson(text: string, fallback: any) {
    try {
        return JSON.parse(text || "");
    } catch {
        try {
            const cleaned = (text || "")
                .replace(/```json/gi, "")
                .replace(/```/g, "")
                .trim();
            const start = Math.min(
                ...["{", "["]
                    .map((c) => cleaned.indexOf(c))
                    .filter((i) => i >= 0)
            );
            const endCurly = cleaned.lastIndexOf("}");
            const endSquare = cleaned.lastIndexOf("]");
            const end = Math.max(endCurly, endSquare);
            if (start >= 0 && end > start) {
                return JSON.parse(cleaned.slice(start, end + 1));
            }
        } catch {
            // fall through
        }
    }
    return fallback;
}

function normalizeStringList(value: any, fallback: string[] = []): string[] {
    if (!Array.isArray(value)) return fallback;
    const cleaned = value
        .map((v) => String(v || "").trim())
        .filter(Boolean);
    return cleaned.length ? cleaned : fallback;
}

function normalizeProductAnalysis(value: any): ProductAnalysis {
    const fallbackProductOnly = [
        "Estúdio premium com fundo infinito e luz suave lateral",
        "Superfície técnica minimalista com sombras controladas",
        "Set clean comercial com destaque absoluto para materiais",
        "Composição editorial de produto com contraste elegante"
    ];
    const fallbackLifestyle = [
        "Ambiente urbano sofisticado com uso natural do produto",
        "Interior contemporâneo com luz de janela cinematográfica",
        "Cena externa ao entardecer com interação realista",
        "Lifestyle premium com foco no benefício em ação"
    ];
    const normalized: ProductAnalysis = {
        description: String(value?.description || ""),
        productType: String(value?.productType || "Produto"),
        suggestedSceneriesProductOnly: normalizeStringList(value?.suggestedSceneriesProductOnly, fallbackProductOnly).slice(0, 4),
        suggestedSceneriesLifestyle: normalizeStringList(value?.suggestedSceneriesLifestyle, fallbackLifestyle).slice(0, 4),
        colors: normalizeStringList(value?.colors).slice(0, 12),
        sellingPoints: normalizeStringList(value?.sellingPoints).slice(0, 6),
        dominantHexColors: normalizeStringList(value?.dominantHexColors).slice(0, 6),
        rawThinking: String(value?.thinking || "")
    };

    if (value?.productDNA && typeof value.productDNA === "object") {
        normalized.productDNA = {
            category: String(value.productDNA.category || ""),
            quantity: String(value.productDNA.quantity || ""),
            upperMaterial: String(value.productDNA.upperMaterial || ""),
            soleMaterial: String(value.productDNA.soleMaterial || ""),
            soleShape: String(value.productDNA.soleShape || ""),
            logoPosition: String(value.productDNA.logoPosition || ""),
            logoType: String(value.productDNA.logoType || ""),
            textureScale: String(value.productDNA.textureScale || ""),
            rigidity: {
                upper: String(value.productDNA.rigidity?.upper || ""),
                sole: String(value.productDNA.rigidity?.sole || "")
            }
        };
    }

    if (value?.branding && typeof value.branding === "object") {
        normalized.branding = {
            text: String(value.branding.text || ""),
            position: String(value.branding.position || ""),
            orientation: String(value.branding.orientation || "")
        };
    }

    return normalized;
}

async function ensureModelCompatibleImage(base64: string): Promise<string> {
    const { mimeType } = parseBase64(base64);
    if (mimeType !== "image/webp") return base64;

    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            try {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                if (!ctx) return resolve(base64);
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL("image/jpeg", 0.94));
            } catch {
                resolve(base64);
            }
        };
        img.onerror = () => resolve(base64);
        img.src = base64;
    });
}

// =======================================================================
// IMAGE COMPRESSION (Fix #6)
// =======================================================================
function compressImage(base64: string, maxSize = 1024): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            // Keep originals when already lightweight to preserve logo/texture micro-detail.
            const estimatedBytes = Math.floor((base64.length * 3) / 4);
            if (estimatedBytes < 1_000_000 && img.width <= 1600 && img.height <= 1600) {
                resolve(base64);
                return;
            }
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

                if (classified.type === 'RATE_LIMIT') {
                    // Wait a little and move to the next model to reduce repeated throttling.
                    await new Promise(r => setTimeout(r, 3500));
                    break;
                }

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
export async function analyzeProduct(imagesBase64: string[], marketingContext?: string, engine: 'ultra' | 'speed' = 'ultra'): Promise<ProductAnalysis> {
    const apiKey = getApiKey();
    if (!apiKey) throw new AIError("Chave API do Gemini não configurada.", "API_KEY_MISSING");

    const ai = new GoogleGenAI({ apiKey });

    const preparedImages = await Promise.all(imagesBase64.map(ensureModelCompatibleImage));
    const parts = preparedImages.map(b64 => {
        const { data, mimeType } = parseBase64(b64);
        return { inlineData: { data, mimeType } };
    });

    const models = engine === 'speed' ? ["gemini-2.5-flash"] : ANALYSIS_MODELS;

    const response = await generateWithFallback(ai, models, (model) => ({
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

Analyze these product images for a SORA 2 digital twin. RETURN a JSON with: 1. 'description' (ENGLISH, detailed). 2. 'productType' (PT-BR). 3. 'suggestedSceneriesProductOnly' (PT-BR): 4 scenarios (2 realistic, 2 HIGH-FASHION/AVANT-GARDE SURREALISM). 4. 'suggestedSceneriesLifestyle' (PT-BR): 4 scenarios (2 realistic, 2 CINEMATIC DREAMLIKE/LUXURY SURREALISM). MANDATE: Avoid childish, toy-like, or 'ludic' metaphors. No marshmallows, no candy, no fairytales. Use HIGH-END aesthetic references (e.g. perfume commercials, luxury fashion, liquid metal, volumetric light).

1. "description" (ENGLISH, ultra-detailed):
    - Exact physical traits: shape, silhouette, weight distribution
    - MICRO-PHYSICS: How the materials react to touch and pressure (e.g., "memory foam compression", "rigid plastic", "liquid viscosity")
    - Textures & Finishes: (matte, glossy, brushed, rubberized, porous)
    - Colors: Verbal description + precise HEX codes (e.g., "Emerald Green #50C878")
    - QUANTITY: Exactly how many items (pair/set/single)?
    - Branding: Exact placement and legibility of all logos/text.

2. "productType" (PORTUGUESE): Short category name

3. "suggestedSceneriesProductOnly" (PORTUGUESE): 4 REAL COMMERCIAL VIDEO SCENARIOS for product-only shots. Focus on cinematic movement and lighting.

4. "suggestedSceneriesLifestyle" (PORTUGUESE): 4 REAL COMMERCIAL VIDEO SCENARIOS with people. Focus on physical interaction with the product.

5. "colors" (ENGLISH): List of all unique colors/variations detected with HEX.

6. "sellingPoints" (PORTUGUESE): TOP 3 technical/visual advantages.

7. "dominantHexColors": List the 3 most important HEX CODES detected.

8. "productDNA" (ENGLISH object):
{
  "category": string,
  "quantity": string,
  "upperMaterial": string,
  "soleMaterial": string,
  "soleShape": string,
  "logoPosition": string,
  "logoType": string,
  "textureScale": string,
  "rigidity": { "upper": string, "sole": string }
}

9. "branding" (ENGLISH object):
{
  "text": string,
  "position": string,
  "orientation": string
}` }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    thinking: { type: Type.STRING, description: "Your internal reasoning. Analyze the physics, materials, lighting interaction, and precise logo placement BEFORE generating the rest of the fields. Be highly analytical." },
                    description: { type: Type.STRING, description: "Ultra-precise English description including shape, colors (hex), materials, textures, branding, text, logos, QUANTITY (pair/single/set), display convention, and all unique visual features." },
                    productType: { type: Type.STRING, description: "A short category name in Portuguese (e.g., 'Tênis', 'Garrafa de Skincare', 'Eletrônico')." },
                    suggestedSceneriesProductOnly: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "Array of 3-4 studio, minimalist, or 3D environment descriptions in Portuguese."
                    },
                    suggestedSceneriesLifestyle: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "Array of 3-4 cinematic, real-world environment descriptions in Portuguese."
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
                    },
                    productDNA: {
                        type: Type.OBJECT,
                        properties: {
                            category: { type: Type.STRING },
                            quantity: { type: Type.STRING },
                            upperMaterial: { type: Type.STRING },
                            soleMaterial: { type: Type.STRING },
                            soleShape: { type: Type.STRING },
                            logoPosition: { type: Type.STRING },
                            logoType: { type: Type.STRING },
                            textureScale: { type: Type.STRING },
                            rigidity: {
                                type: Type.OBJECT,
                                properties: {
                                    upper: { type: Type.STRING },
                                    sole: { type: Type.STRING }
                                }
                            }
                        }
                    },
                    branding: {
                        type: Type.OBJECT,
                        properties: {
                            text: { type: Type.STRING },
                            position: { type: Type.STRING },
                            orientation: { type: Type.STRING }
                        }
                    }
                },
                required: ["thinking", "description", "productType", "suggestedSceneriesProductOnly", "suggestedSceneriesLifestyle", "colors", "sellingPoints", "dominantHexColors"]
            }
        }
    }));

    return normalizeProductAnalysis(safeParseJson(response.text || "", {}));
}

// =======================================================================
// 1B. ANALYZE SCENERY (Scene Mode)
// =======================================================================
export async function analyzeScenery(imagesBase64: string[], marketingContext?: string, engine: 'ultra' | 'speed' = 'ultra'): Promise<SceneryAnalysis> {
    const apiKey = getApiKey();
    if (!apiKey) throw new AIError("Chave API do Gemini não configurada.", "API_KEY_MISSING");
    const ai = new GoogleGenAI({ apiKey });
    const preparedImages = await Promise.all(imagesBase64.map(ensureModelCompatibleImage));
    const parts = preparedImages.map(b64 => {
        const { data, mimeType } = parseBase64(b64);
        return { inlineData: { data, mimeType } };
    });

    const models = engine === 'speed' ? ["gemini-2.5-flash"] : ANALYSIS_MODELS;

    const response = await generateWithFallback(ai, models, (model) => ({
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

    try { return safeParseJson(response.text || "", { description: "", locationType: "Local", mood: "", suggestedActions: [], suggestedCameraAngles: [], suggestedAudio: [] }); }
    catch { return { description: "", locationType: "Local", mood: "", suggestedActions: [], suggestedCameraAngles: [], suggestedAudio: [] }; }
}

// =======================================================================
// 2. GENERATE PROMPTS
// =======================================================================
export async function generateSceneConcepts(
    productDescription: string,
    options: any,
    engine: 'ultra' | 'speed' = 'ultra'
): Promise<string[]> {
    const apiKey = getApiKey();
    if (!apiKey) throw new AIError("Chave API do Gemini não configurada.", "API_KEY_MISSING");

    const ai = new GoogleGenAI({ apiKey });

    const outputCount = 3;
    const userIntent = options.supportingDescription || '';
    const isScriptMode = options.mode === 'script' && !!options.script;

    const promptContext = `You are a creative art director.
Generate ${outputCount} short scene concepts (1-2 sentences each). 
These are NOT video prompts, but concepts for a static image generation.

PROJECT SETTINGS
- Mode: ${options.mode === 'lifestyle' ? 'Lifestyle' : 'Product only'}
- Environment: ${options.environment || 'Studio'}
- Lighting: ${options.timeOfDay || 'Controlled'}
- Style: ${options.style || 'Commercial'}
${options.mode === 'lifestyle' ? `- Talent: ${options.gender}, ${options.skinTone} skin, ${options.hairColor} hair` : ''}

PRODUCT:
${productDescription}

SCENE BRIEF
${isScriptMode ? `Adapt this script into concise scene concepts:\n${options.script}` : (userIntent ? userIntent : 'Build a premium product reveal sequence with clear progression: reveal, interaction, detail.')}

Output must be JSON array of ${outputCount} string(s).`;

    const models = engine === 'speed' ? ["gemini-2.5-flash", "gemini-2.5-pro"] : BRAIN_MODELS;

    const response = await generateWithFallback(ai, models, (model) => ({
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
        return parsed
            .map((p) => typeof p === 'string' ? p.trim() : '')
            .filter((p) => p.length > 0)
            .slice(0, outputCount);
    } catch (e) {
        console.error("Failed to parse prompts", e);
        return [];
    }
}

// =======================================================================
// 4. GENERATE BLUEPRINT FROM MOCKUP (THE MASTER REVERSE PIPELINE)
// =======================================================================
export async function generateBlueprintFromMockup(
    mockupBase64: string,
    productDescription: string,
    _options: any,
    sceneConcept: string,
    engine: 'ultra' | 'speed' = 'ultra'
): Promise<string> {
    const apiKey = getApiKey();
    if (!apiKey) throw new AIError("Chave API do Gemini não configurada.", "API_KEY_MISSING");

    const ai = new GoogleGenAI({ apiKey });
    
    // Ensure format is clean for vision
    const cleanB64 = mockupBase64.replace(/^data:image\/\w+;base64,/, "");

    const referenceLockLine = "Use the uploaded image(s) as the exact product reference. Preserve geometry, logo placement, proportions, materials, and texture scale.";

    const promptContext = `You are a Senior Sora 2 Prompt Engineer. 
I have attached an image (a concept mockup board). It is a collage containing a MAIN HERO SHOT (usually on the left) and smaller macro detail panels.

YOUR TASK: Write the perfect, most accurate Sora 2 video generation prompt describing EXACTLY the MAIN HERO SHOT that you see. IGNORE the macro panels and the fact that it is a collage. You are describing a single, unified 3D environment based on the main shot, but adding instructions for 3D camera movement and physical action.

MANDATORY RULES:
- English output only.
- Length: 85-125 words.
- Start the prompt with exactly this sentence: "${referenceLockLine}"
- DESCRIBE WHAT YOU SEE: Faithfully describe the product, the exact lighting in the main hero shot, the colors, and the background environment. Do not invent things.
- ANTI-STATIC LOCK: NEVER output a prompt that describes a static photo with just a zoom or pan. You MUST instruct the camera to move dynamically in 3D space (e.g., orbit, push in, tracking shot, macro reveal) and describe physical motion or life in the scene.
- DO NOT mention "collage", "panels", "split screen", or "macro shots on the side". Act as if the main hero shot is the entire physical world.
- No markdown, just the raw prompt text.

SCENE CONTEXT HINT:
"${sceneConcept}"

PRODUCT DNA HINT:
"${productDescription}"

Remember: If Sora reads your prompt, it should generate a single full-frame video whose first frame looks EXACTLY like the main hero shot in the attached image, but then bursts into cinematic motion.`;

    const models = engine === 'speed' ? ["gemini-2.5-flash"] : BRAIN_MODELS; // We use brain models capable of vision

    const response = await generateWithFallback(ai, models, (model) => ({
        model,
        contents: {
            parts: [
                { inlineData: { data: cleanB64, mimeType: "image/jpeg" } },
                { text: promptContext }
            ]
        }
    }));

    let result = response.text?.trim() || "";
    if (!result.toLowerCase().startsWith(referenceLockLine.toLowerCase())) {
        result = `${referenceLockLine} ${result}`;
    }
    
    return result;
}
export async function generateMockup(
    productDescription: string,
    options: any,
    promptIndex: number,
    productImages: string[],
    promptText?: string, // Optional: use the actual prompt text for the mockup
    engine: 'ultra' | 'speed' = 'ultra'
): Promise<string | null> {
    const apiKey = getApiKey();
    if (!apiKey) throw new AIError("Chave API do Gemini não configurada.", "API_KEY_MISSING");

    const ai = new GoogleGenAI({ apiKey });


    const focusInstructions = [
        "Focus on the environment and how the product fits in. Show the whole object with logo/branding clearly visible.",
        "Focus on the interaction/movement. The product must remain 100% rigid and faithful. Logo must be readable.",
        "Hyper-zoom on materials, textures, AND the logo/branding. Text must be perfectly sharp and legible.",
        "Show the silhouette from a clean side angle. If the logo is on this side, it must be clearly visible.",
        "Show it from directly above. Clean geometry. Any top branding must be sharp.",
        "Majestic hero angle, looking up at the product. Branding facing camera.",
        "Dynamic scene. Logo visible.",
        "Lifestyle action. Logo visible.",
        "Product focus. Logo prominently displayed."
    ];

    const imagePrompt = `TASK: 1:1 PRODUCT REPLICATION & COMMERCIAL STORYBOARD COLLAGE (16:9).
GOAL: Create an ultra-photorealistic storyboard board that perfectly matches the BLUEPRINT while cloning the uploaded product photos pixel-by-pixel.

[CRITICAL - SOURCE OF TRUTH]
THE ATTACHED PHOTOS ARE THE ABSOLUTE TRUTH FOR THE PRODUCT'S APPEARANCE.
1. DO NOT change the logo, typography, or branding text. Replicate it exactly as seen in the photos.
2. DO NOT change the materials, stitching, geometry, or colors.
3. The environment, camera angle, and action MUST visually match the BLUEPRINT text below.

BLUEPRINT TO VISUALIZE:
"${promptText || productDescription}"

ENVIRONMENT & AESTHETICS:
- Environment: ${options.environment}
- Lighting: ${options.timeOfDay}
- Style: ${options.style}
${options.mode === 'lifestyle' ? `- Talent: ${options.gender}, ${options.skinTone}, ${options.hairColor}` : ''}

[LAYOUT - MUST BE A COLLAGE]
- MAIN HERO SHOT (LEFT, 70%): The main cinematic shot exactly as described in the BLUEPRINT. Focus: ${focusInstructions[promptIndex] || "Hero product focus."}
- DETAIL MACROS (RIGHT STACK, 30%): 2 or 3 extreme close-up panels showing the precise materials, textures, and the logo/branding text from the reference photos to prove material fidelity.

Make it look like a high-end, cinematic agency pitch board. Perfect product clone. ZERO HALLUCINATION.`;

    // Build content parts: reference images (if available) + text prompt
    const contentParts: any[] = [];

    // Send max 3 reference images to save tokens/cost (first, middle, last for best coverage)
    if (productImages && productImages.length > 0) {
        const selected = productImages.length <= 3
            ? productImages
            : [productImages[0], productImages[Math.floor(productImages.length / 2)], productImages[productImages.length - 1]];
        const prepared = await Promise.all(selected.map(ensureModelCompatibleImage));
        for (const img of prepared) {
            const { data, mimeType } = parseBase64(img);
            contentParts.push({ inlineData: { data, mimeType } });
        }
    }

    contentParts.push({ text: imagePrompt });

    try {
        const models = engine === 'speed' ? ["gemini-3.1-flash-image-preview"] : IMAGE_MODELS;
        const response = await generateWithFallback(ai, models, (model) => ({
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
