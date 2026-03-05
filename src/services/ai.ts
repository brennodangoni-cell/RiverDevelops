
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
                    text: `SYSTEM MANDATE: You are an ELITE 3D INDUSTRIAL DESIGNER and VISUAL STRATEGIST.
${marketingContext ? `
[CRITICAL MARKETING CONTEXT]
"""
${marketingContext}
"""
` : ''}

Analyze these images to create a 'DIGITAL TWIN SPECIFICATION'. Your goal is absolute geometric and branding fidelity for a video production.

RETURN a JSON matching the schema below.

1. "description" (ENGLISH - TECHNICAL BLUEPRINT):
    - GEOMETRIC VOLUME: Describe the 3D shape, proportions, and symmetry with mathematical precision.
    - BRANDING MAP: List every logo, text, and icon. Specify EXACT placement (e.g., 'Lateral-mid-left', 'Embossed on sole'), material (e.g., 'Raised rubber', 'Screen-printed gold'), and font characteristics.
    - MATERIAL PHYSICS: How light reflects (specular vs diffuse), surface roughness (RMS), and structural behavior (flexibility vs rigidity).
    - COLOR FIDELITY: Exact verbal descriptions + precise HEX codes (minimum 3).
    - QUANTITY & STATE: Exactly what is in the frame (e.g., 'One left-foot shoe', 'A set of 3 bottles').

2. "productType" (PORTUGUESE): Short category name.

3. "suggestedSceneriesProductOnly" (PORTUGUESE): 4 commercial scenarios focusing on product details.

4. "suggestedSceneriesLifestyle" (PORTUGUESE): 4 realistic scenarios with human interaction.

5. "colors" (ENGLISH): Detailed list of all color shades with HEX.

6. "sellingPoints" (PORTUGUESE): Top 3 technical/aesthetic advantages.

7. "dominantHexColors": Top 3 HEX codes.` }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    description: { type: Type.STRING, description: "Technical blueprint in English: 3D geometry, precise branding map (coordinates/style), material physics, and exact color specs." },
                    productType: { type: Type.STRING },
                    suggestedSceneriesProductOnly: { type: Type.ARRAY, items: { type: Type.STRING } },
                    suggestedSceneriesLifestyle: { type: Type.ARRAY, items: { type: Type.STRING } },
                    colors: { type: Type.ARRAY, items: { type: Type.STRING } },
                    sellingPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                    dominantHexColors: { type: Type.ARRAY, items: { type: Type.STRING } }
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
// 2. GENERATE PROMPTS — DUAL ENGINE: SORA 2 (10s) + KLING 3.0 (5s)
// =======================================================================
export type PromptEngine = 'sora' | 'kling';

export async function generatePrompts(
    productDescription: string,
    options: any,
    previousPrompts?: string[],
    detectedColors?: string[],
    sceneDraft?: string,
    engine: PromptEngine = 'kling' // NEW: which prompt format to use
): Promise<string[]> {
    const apiKey = getApiKey();
    if (!apiKey) throw new AIError("Chave API do Gemini não configurada.", "API_KEY_MISSING");

    const ai = new GoogleGenAI({ apiKey });

    const hexInfo = detectedColors?.length ? `\nPRODUCT COLORS (use these exact descriptions): ${detectedColors.join(', ')}` : '';

    // === TASK DESCRIPTION (shared logic) ===
    let taskDescription = '';
    const isScriptMode = options.mode === 'script' && !!options.script;

    if (sceneDraft) {
        taskDescription = engine === 'kling'
            ? `Polish this draft into a Kling 3.0 prompt. Keep the same vibe. Follow the Kling format below.`
            : `Polish this draft into a simple, natural prompt. Keep the same vibe — person, action, product, logo visibility, ambient sound.`;
    } else if (isScriptMode) {
        taskDescription = engine === 'kling'
            ? `Script: ${options.script}\nBreak into 3 Kling 3.0 prompts following the format below.`
            : `Script: ${options.script}\nBreak into 3 simple prompts. Same natural style: person, action, product, logo visible, sound.`;
    } else if (previousPrompts && previousPrompts.length > 0) {
        taskDescription = `Previous scenes: ${previousPrompts.map((p, i) => `Scene ${i + 1}: ${p.slice(0, 80)}...`).join('\n')}\n` + (
            engine === 'kling'
                ? `Generate 3 NEW scenes. Different angles, actions, settings. Follow the Kling 3.0 format.`
                : `Generate 3 NEW scenes in the same simple, natural style. Match the vibe.`
        );
    } else if (detectedColors && detectedColors.length > 1) {
        taskDescription = engine === 'kling'
            ? `Create 3 scenes showcasing different color variants of the product. Follow the Kling 3.0 format.`
            : `Create 3 scenes showcasing different color variants. Same simple style: person + action + product + logo visible + sound.`;
    } else {
        taskDescription = engine === 'kling'
            ? `Create 3 scenes:\nScene 1: Product hero shot — the product is the star. Clean background, product rotating or being revealed. Logo visible.\nScene 2: Lifestyle — a person interacting with the product naturally. The product is clearly visible with details preserved.\nScene 3: Detail/Close-up — extreme close-up showing textures, materials, stitching, brand details.`
            : `Create 3 simple scenes:\nScene 1: Person in a relaxed setting (e.g. by pool, in living room). Product visible. Logo clear. Natural light.\nScene 2: Different person or angle. Product in use (stepping, walking). Logo on strap/footbed clearly visible.\nScene 3: Close-up or detail. Product colors and materials. Logo sharp.\nAll in the same natural, flowing style — no jargon.`;
    }

    // === PROMPT STYLE (engine-specific) ===
    const klingPromptStyle = `
WRITE PROMPTS OPTIMIZED FOR KLING 3.0 VIDEO AI (Image-to-Video mode, 5 seconds each).

KLING 3.0 PROMPT FORMAT — FOLLOW THIS EXACTLY:

Each prompt should be a SINGLE CONTINUOUS TAKE of 5 seconds. Describe what happens in those 5 seconds.

STRUCTURE:
1. SHOT TYPE + CAMERA: Start with the shot type and camera angle.
   Examples: "Close-up, low angle" / "Medium shot, eye level" / "Wide shot, the camera slowly orbits" / "Extreme close-up, rack focus"

2. SUBJECT + ACTION: Describe who/what is in frame and what happens.
   Examples: "a man's hand reaches down and picks up the product" / "the product sits on a marble surface as warm light sweeps across it"

3. PRODUCT DETAILS: Weave in specific physical details from the reference image.
   Examples: "the soft grey suede texture catches the light" / "revealing the embossed logo on the heel tab"

4. ENVIRONMENT + LIGHTING: Brief, natural description.
   Examples: "on a polished concrete surface, warm golden hour light" / "in a modern minimalist apartment, soft diffused window light"

5. MOTION: What moves and how. Keep it subtle for 5 seconds.
   Examples: "the camera slowly pulls back" / "he shifts his weight, the shoe flexes naturally" / "a gentle breeze moves the fabric"

EXAMPLE KLING 3.0 PROMPTS:

"Close-up, low angle. A pair of grey suede slip-on moccasins rests on a warm wooden surface. Soft golden light sweeps across the brushed suede texture, highlighting the tonal stitching and the cream rubber sole. The camera slowly glides from left to right, revealing the embossed 'A' logo on the heel tab. Shallow depth of field, luxury product commercial quality."

"Medium shot, eye level. A young man in dark jeans walks confidently across polished concrete in a modern urban café. The camera tracks his feet, capturing the grey suede moccasins with cream soles. He pauses, shifts his weight — the shoe flexes naturally. Warm ambient lighting, shallow depth of field."

RULES:
- DURATION: Each prompt = exactly ONE 5-second clip. Don't describe more than 5 seconds of action.
- REALISTIC only. No surrealism, no fantasy, no impossible scenarios.
- SIMPLE language. No technical jargon. Describe what a camera operator would see.
- Product details must match the reference image EXACTLY — colors, textures, logos, materials.
- One flowing paragraph per prompt. 60-100 words.
- Include camera movement (slow orbit, tracking, pull back, static with subtle motion).
- Do NOT use shot numbering like "Shot 1 (3s)". That's for multi-shot mode. Each prompt is a SINGLE continuous take.
- Do NOT reference "uploaded images" or "@Product" — just describe the product naturally.
- If lifestyle mode: include a person with natural actions.
- The product's brand/logo should be mentioned as visible somewhere in the scene.
    `;

    const soraPromptStyle = `
WRITE SIMPLE, NATURAL SORA 2 PROMPTS — LIKE A SUCCESSFUL COMMERCIAL BRIEF (10 seconds each).

FORMAT (follow this flow):
1. Person + action + location. Example: "A middle-aged man with light skin and blonde hair sits on a comfortable lounge chair by a resort pool..."
2. Product woven in naturally with colors and details. Example: "his creamy beige 'yogui' flip-flops, accented with the vivid orange stripe, resting casually on the warm flagstones."
3. Shot type, framing, lens — brief. Example: "A medium shot, framed at 9:16 with an 85mm lens, captures his relaxed posture..."
4. Camera movement: holds steady, tracks, orbits — simple.
5. Mood/feeling: contentment, ease, gentle grace.
6. Logo visibility: "making the 'yogui' logo on the strap clearly visible" or similar.
7. Ambient sound: "Gentle sounds of water lapping and distant conversation" or "subtle fabric rustles."

RULES:
- DURATION: Each prompt = ONE 10-second clip.
- REALISTIC scenes only. No surrealism, no dreamlike, no fantasy. Believable locations and actions.
- SIMPLE language. No jargon like "kinetic foundation" or "volumetric lighting".
- Brand name in quotes: 'yogui' or whatever the product brand is.
- Product colors and materials described naturally (creamy beige, vivid orange stripe, pure white, black stripe).
- One flowing paragraph. 80-120 words.
- If lifestyle: include person (age hint, skin, hair) and their natural action.
- Logo must be "clearly visible" somewhere in the prompt.
    `;

    const promptStyle = engine === 'kling' ? klingPromptStyle : soraPromptStyle;
    const clipDuration = engine === 'kling' ? '5-second' : '10-second';
    const wordRange = engine === 'kling' ? '60-100' : '80-120';
    const engineLabel = engine === 'kling' ? 'KLING 3.0 Video AI (Image-to-Video)' : 'SORA 2 (Image-to-Video)';

    const promptContext = `
Generate prompts for ${engineLabel}. The user will upload a product photo as reference and paste your prompt. The AI will generate a ${clipDuration} video matching the reference image + prompt.

SETTINGS:
- Environment: ${options.environment}
- Lighting: ${options.timeOfDay}
- Style: ${options.style}
- Aspect Ratio: ${options.aspectRatio}
${options.mode === 'lifestyle' ? `- Person: ${options.gender}, ${options.skinTone}, ${options.hairColor}` : ''}

PRODUCT DESCRIPTION (from image analysis):
${productDescription}
${hexInfo}

${sceneDraft ? `SCENE DRAFT TO POLISH:\n"${sceneDraft}"` : ''}
${(options.customScenario || options.supportingDescription) ? `\nUSER REQUEST / CENA DESCRITA: ${(options.customScenario || options.supportingDescription).trim()}` : ''}

${taskDescription}

${promptStyle}

Output: JSON array of 3 ${engine === 'kling' ? 'Kling 3.0' : 'Sora 2'} prompts (${wordRange} words each). Natural, cinematic language. Each prompt = a single ${clipDuration} clip.
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
                    description: `A ${engine === 'kling' ? 'Kling 3.0' : 'Sora 2'} Video AI prompt optimized for Image-to-Video, ${clipDuration} clip.`
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
// 3. GENERATE MOCKUP — DUAL ENGINE: SORA (Collage) | KLING (Starting Frame)
// =======================================================================
export async function generateMockup(
    productDescription: string,
    options: any,
    promptIndex: number,
    productImages: string[],
    promptText?: string,
    engine: PromptEngine = 'kling'
): Promise<string | null> {
    const apiKey = getApiKey();
    if (!apiKey) throw new AIError("Chave API do Gemini não configurada.", "API_KEY_MISSING");

    if (!productImages?.length) {
        throw new AIError("Envie fotos do produto para gerar o mockup. O gerador usa apenas as imagens, não descrições.", "UNKNOWN", false);
    }

    const ai = new GoogleGenAI({ apiKey });

    // --- KLING 3.0 LOGIC (Single Frame Reference for I2V) ---
    const klingSceneVariations = [
        "HERO MASTER: 3/4 view from a low-angle. Product occupies 60% of frame. Mandatory: PRIMARY LOGO must be razor-sharp, centered or clearly legible, and positioned for maximum impact as per Branding Map. 3D depth in branding is mandatory.",
        "LIFESTYLE HERO: Product in a premium real-world setting. Natural eye-level angle. Focus is entirely on the product/brand interaction. Logo MUST be visible and perfectly legible even in the environment.",
        "MACRO DETAIL: Extreme close-up on primary logo and materials. The logo must have physical depth, shadows, and 3D representation (embossed/debossed). Material fidelity is 100%.",
        "DYNAMIC OBLIQUE: Product angled at 45 degrees. Camera at a low-angle. Professional lighting highlights BOTH silhouette and the BRANDING. Zero distortion of the logo geometry.",
        "EDITORIAL TOP-DOWN: Symmetrical layout from directly above. Clean surface. Product geometry and all top-facing logos must be perfectly preserved and sharp.",
        "PROFILE MASTER: Horizontal side-view. Zero geometric warping. Side branding must be perfectly legible and follow the product's 3D curvature exactly.",
        "IN-ACTION STILL: Product being used, branding always oriented towards the camera. The logo is the anchor of the scene's composition.",
        "ENVIRONMENTAL PORTRAIT: Product in its niche scenario. Lighting creates 'halo' around the logo area. Material textures are hyper-sharp.",
        "BRAND REVEAL STILL: Expert angle specifically chosen to showcase the primary branding/wordmark as a high-fidelity 3D element."
    ];

    // --- SORA 2 LOGIC (High Fidelity Agency Collage) ---
    const soraHeroHints = [
        "Fidelidade 100% ao Digital Twin. Ângulo Hero 3/4, logo em destaque nítido com profundidade 3D.",
        "Lifestyle Realista. Produto integrado, logo visível e geometricamente perfeito.",
        "Macro-Fidelidade. Foco extremo no logo e texturas originais. Nenhuma simplificação de branding.",
        "Perfil Técnico. Geometria perfeita, logo lateral perfeitamente legível.",
        "Vista Editorial de Cima. Organização limpa, branding visível e centralizado.",
        "Ângulo de Poder (Low-Angle). Produto imponente, logo principal como ponto focal.",
        "Cena de Uso Premium. Detalhes de branding preservados em movimento/ação.",
        "Ambiente Imersivo. Iluminação desenha o contorno do produto e ressalta o logo.",
        "Showcase de Marca. Foco absoluto no branding, geometria fiel ao Digital Twin."
    ];

    const aspectRatio = options.aspectRatio || "16:9";

    const commonFidelityRules = `
DIGITAL TWIN PROTOCOL — MANDATORY FIDELITY RULES:
- ABSOLUTE GEOMETRIC ACCURACY: The product in the mockup must be a 100% faithful reconstruction of the product in the reference photos. ZERO deviations in shape, proportions, or features.
- 3D LOGO REPRESENTATION: Logos and branding are NOT flat textures. They must be rendered as physical, 3D elements with depth, bevels, or appropriate material interaction (embossed, debossed, or raised).
- MATERIAL INTEGRITY: If the photo shows suede, the mockup must show suede. If it's polished steel, it must reflect like steel. Preserve every stitch, texture, and seam.
- ZERO HALLUCINATION: Do NOT add features, logos, or parts that are not present in the reference images.
- ONE PRODUCT ONLY: This is a commercial mockup for a single product model.
    `;

    const klingImagePrompt = `KLING 3.0 REFERENCE FRAME (I2V INPUT)
${commonFidelityRules}
TASK: Generate ONE SINGLE photorealistic frame that serves as the STARTING POINT for a video.
COMPOSITION: ${klingSceneVariations[promptIndex] || klingSceneVariations[0]}
Environment: ${options.environment} | Lighting: ${options.timeOfDay}
${options.mode === 'lifestyle' ? `- Person: ${options.gender}, ${options.skinTone}, ${options.hairColor}` : '- Product-only'}
${promptText ? `SCENE CONTEXT (Match this vibe): "${promptText.slice(0, 300)}"` : ''}
TECHNICAL: Sharp focus, 8k resolution, cinematic commercial photography. NO split screens.`;

    const soraImagePrompt = `SORA 2 AGENCY PITCH BOARD (16:9 COLLAGE)
${commonFidelityRules}
TASK: Generate a professional collage with distinct panels.
[MAIN PANEL - LEFT 60%]: ${soraHeroHints[promptIndex] || soraHeroHints[0]}
[DETAIL PANELS - RIGHT 40% (Stacked Vertically)]:
1. TOP: Extreme Close-up of LOGO/BRANDING (3D depth mandatory).
2. MID: Texture/Material detail (100% faithful).
3. BOTTOM: Alternative angle (sole/back/side).
Environment: ${options.environment} | Light: ${options.timeOfDay}
${options.mode === 'lifestyle' ? `- User: ${options.gender}, ${options.skinTone}, ${options.hairColor}` : ''}
${promptText ? `Context: "${promptText.slice(0, 250)}"` : ''}
TECHNICAL: Professional lighting, crisp borders between panels, luxury commercial aesthetic.`;

    const imagePrompt = engine === 'kling' ? klingImagePrompt : soraImagePrompt;

    const contentParts: any[] = [];
    const selected = productImages.length <= 4
        ? productImages
        : [productImages[0], productImages[Math.floor(productImages.length / 3)], productImages[Math.floor(2 * productImages.length / 3)], productImages[productImages.length - 1]];

    for (let i = 0; i < selected.length; i++) {
        const { data, mimeType } = parseBase64(selected[i]);
        contentParts.push({ text: `REFERENCE PHOTO ${i + 1}: Principal source for geometry and materials.` });
        contentParts.push({ inlineData: { data, mimeType } });
    }

    contentParts.push({ text: `TECHNICAL BLUEPRINT (DIGITAL TWIN SPEC):\n${productDescription}` });
    contentParts.push({ text: imagePrompt });

    try {
        const response = await generateWithFallback(ai, IMAGE_MODELS, (model) => ({
            model,
            contents: { parts: contentParts },
            config: {
                // @ts-ignore
                imageConfig: {
                    aspectRatio: engine === 'kling' ? aspectRatio : "16:9",
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
        throw classifyError(e);
    }
    return null;
}

// =======================================================================
// 4. GENERATE VIDEO (Veo) — 8s, opcional com mockup como referência
// =======================================================================
const VEO_MODELS = ["models/veo-3.0-generate-001"];
const POLL_INTERVAL_MS = 15000;
const MAX_POLL_MINUTES = 10;
// Veo preview = 10 req/min. Backoff: 90s, 120s, 180s, 240s
const RATE_LIMIT_DELAYS = [90000, 120000, 180000, 240000];

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
    let lastError: any;

    for (const model of VEO_MODELS) {
        for (let attempt = 0; attempt < RATE_LIMIT_DELAYS.length + 1; attempt++) {
            try {
                operation = await ai.models.generateVideos({
                    model,
                    source,
                    config: {
                        durationSeconds: duration,
                        aspectRatio,
                        numberOfVideos: 1,
                        generateAudio: true
                    }
                });
                lastError = null;
                break;
            } catch (e: any) {
                lastError = e;
                const classified = classifyError(e);
                console.warn(`Video gen [${model}] attempt ${attempt + 1}:`, classified.type, classified.message);

                if (classified.type === 'RATE_LIMIT' && attempt < RATE_LIMIT_DELAYS.length) {
                    const delay = RATE_LIMIT_DELAYS[attempt];
                    console.warn(`Aguardando ${delay / 1000}s antes de retentar (Veo tem limite de 10 req/min)...`);
                    await new Promise(r => setTimeout(r, delay));
                } else if (classified.type === 'MODEL_NOT_FOUND') {
                    break;
                } else {
                    throw classified;
                }
            }
        }
        if (operation) break;
    }

    if (!operation && lastError) {
        const err = classifyError(lastError);
        if (err.type === 'RATE_LIMIT') {
            throw new AIError(
                "Veo está com fila cheia. Tente em 1-2 horas ou use Vertex AI (Google Cloud) para quotas maiores.",
                'RATE_LIMIT',
                true
            );
        }
        throw err;
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

// =======================================================================
// 5. GENERATE VIDEO (Kling) — I2V or T2V via API (5s clips by default)
// =======================================================================
const KLING_BASE = "https://api.klingapi.com";
const KLING_POLL_MS = 5000;
const KLING_MAX_POLL_MINUTES = 5;

function getKlingApiKey(): string {
    const local = localStorage.getItem('kling_api_key');
    if (local && local.trim().length > 10) return local.trim();
    const env = (import.meta as any).env?.VITE_KLING_API_KEY;
    if (env && env.trim().length > 10) return env.trim();
    return "";
}

export async function generateVideoKling(
    prompt: string,
    mockupImageBase64?: string | null,
    options?: { aspectRatio?: string; durationSeconds?: number }
): Promise<string | null> {
    const apiKey = getKlingApiKey();
    if (!apiKey) throw new AIError("Chave API do Kling não configurada. Configure em Configuração.", "API_KEY_MISSING");

    const duration = options?.durationSeconds ?? 5; // Default: 5s clips (cost-optimized)
    const aspectRatio = options?.aspectRatio ?? "16:9";

    const endpoint = mockupImageBase64 ? "/v1/videos/image2video" : "/v1/videos/text2video";
    const body: Record<string, unknown> = {
        model: "kling-v2.6-std",
        prompt,
        duration,
        aspect_ratio: aspectRatio,
        mode: "standard"
    };

    if (mockupImageBase64) {
        const { data } = parseBase64(mockupImageBase64);
        body.image = `data:image/jpeg;base64,${data}`;
    }

    const res = await fetch(`${KLING_BASE}${endpoint}`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        const errText = await res.text();
        if (res.status === 429) throw new AIError("Kling: limite de requisições. Aguarde e tente novamente.", "RATE_LIMIT", true);
        throw new AIError(errText.slice(0, 150) || `Kling API erro ${res.status}`, "UNKNOWN", true);
    }

    const data = await res.json();
    const taskId = data.task_id || data.data?.task_id;
    if (!taskId) throw new AIError("Kling não retornou task_id.", "UNKNOWN", false);

    const start = Date.now();
    while (Date.now() - start < KLING_MAX_POLL_MINUTES * 60 * 1000) {
        await new Promise(r => setTimeout(r, KLING_POLL_MS));
        const statusRes = await fetch(`${KLING_BASE}/v1/videos/${taskId}`, {
            headers: { "Authorization": `Bearer ${apiKey}` }
        });
        if (!statusRes.ok) continue;
        const statusData = await statusRes.json();
        const state = statusData.task_status ?? statusData.data?.task_status ?? statusData.status;
        if (state === "succeed" || state === "completed" || state === "success") {
            const url = statusData.task_result?.video_url ?? statusData.data?.video_url ?? statusData.video_url;
            if (url) return url;
        }
        if (state === "failed" || state === "error") {
            throw new AIError(statusData.task_result?.message ?? statusData.message ?? "Kling falhou.", "UNKNOWN", false);
        }
    }
    throw new AIError("Timeout: Kling excedeu o tempo limite.", "TIMEOUT", false);
}
