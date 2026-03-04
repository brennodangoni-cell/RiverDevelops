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
                    text: `SYSTEM MANDATE: You are an ELITE ADVERTISING DIRECTOR, CMO, and MASTER CINEMATOGRAPHER.
${marketingContext ? `
[CRITICAL MARKETING CONTEXT - SUPER-PRIORITY]
"""
${marketingContext}
"""
MANDATE: ALL Suggested Sceneries MUST directly serve the marketing goals, target audience, and benefits described above.
` : ''}

ENVIRONMENT RANDOMIZATION SEED: ${Date.now() + Math.random()}
CREATIVITY LEVEL DIRECTIVE: You are operating at the "${creativityLevel}" creativity tier.
${creativityLevel === 'Conservador' ? 'CONSERVATIVE DIRECTIVE: Create 100% grounded, realistic, highly commercial scenarios. Professional lighting, premium studios, believable real-world interactions. Strict logical physics.' :
                            creativityLevel === 'Extremo' ? 'EXTREME SURREALISM DIRECTIVE: Ignore reality. Create avant-garde, impossible, highly artistic, and hyper-premium commercial scenarios. Levitating materials, impossible fluid dynamics, alien landscapes with luxury lighting, shattered glass slow-mo. BUT THE PRODUCT ITSELF MUST NEVER MUTATE OR DEFORM.' :
                                'BALANCED DIRECTIVE: Mix highly polished commercial realism with striking, memorable "magic realism" touches (e.g. dramatic lighting, slightly exaggerated physics, ultra-premium stylization) that maintain brand credibility.'}

Analyze these product images for a SORA 2 MASTER BLUEPRINT.

YOUR TWO JOBS:

1. CREATE A FORENSIC-LEVEL, OBSESSIVELY DETAILED "PRODUCT ATLAS".
This description will be INJECTED VERBATIM into every Sora 2 video prompt. YOU MUST ORGANIZE IT BY COMPONENTS (Label them: Component A, Component B, etc.):
   - COMPONENT A (LOGO & BRANDING): Exact details of the icon, text, and font.
   - COMPONENT B (PRIMARY SILHOUETTE): The main geometry and overall shape.
   - COMPONENT C (MATERIALS & TEXTURES): Specific PBR material details for all surfaces.
   - COMPONENT D (ACCENTS & DETAILS): Secondary colors, trim, and small features.
   - CRITICAL: NEVER mention file names, image extensions (png, jpg), or metadata artifacts from the images. Focus ONLY on physical design.

2. INVENT COMPLETELY NEW, UNEXPECTED ENVIRONMENTS matching the CREATIVITY LEVEL.

RETURN a strict JSON with:
1. "description" (ENGLISH, MINIMUM 300 WORDS): The forensic physical blueprint organized by COMPONENT CALLOUTS.
2. "productType" (PT-BR): Short category.
3. "suggestedSceneriesProductOnly" (PT-BR): 4 COMMERCIAL VIDEO SCENARIOS.
4. "suggestedSceneriesLifestyle" (PT-BR): 4 COMMERCIAL VIDEO SCENARIOS.
5. "colors" (ENGLISH): Detected variants.
6. "sellingPoints" (PT-BR): Top 3 hooks.
7. "dominantHexColors": Top 3 hex codes.`
                }
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
    const visualAnchor = previousPrompts && previousPrompts.length > 0
        ? `\nVISUAL ANCHOR (FOR CONTINUITY): Match the lighting, camera kit, and atmosphere of the previous blueprint: "${previousPrompts[previousPrompts.length - 1]}"`
        : '';

    let taskDescription = `
    [PRODUCT IDENTITY & DNA]
    ${productDescription}
    ${hexInfo}
    ${visualAnchor}

    ${sceneDraft ? `
    ACT AS AN ELITE AI VIDEO DIRECTOR & SORA 2 NARRATIVE ARCHITECT.
    
    [USER SCENE DRAFT]
    "${sceneDraft}"
    
    TASK: TRANSFORM THIS DRAFT INTO A MASTER SORA 2 CINEMATIC PROMPT (999,999% IMPROVEMENT).
    - GOAL: Extreme visual consistency for the product, but ABSOLUTE CREATIVE FREEDOM for the environment.
    - SURREALISM MANDATE: If the user draft contains impossible or fantastical elements (e.g., walking on clouds, flying, portals), DO NOT RATIONALIZE. Do not turn clouds into "white sand". Provide the LITERAL surrealist interpretation that Sora 2 excels at.
    - STRATEGY: Use the 5-LAYER CINEMATIC PROTOCOL:
      0. MARKETING ALIGNMENT & EMOTION: Evoke the EMOTION described. If the user says "stepping on clouds", describe the ethereal lightness and the model's divine comfort.
      1. TECHNICAL SETTING: Specify lens (e.g., 35mm), movement (e.g., slow-motion tracking), and framing in extreme detail.
      2. PHYSICS & WEIGHT: The PRODUCT must be structurally rigid and feel solid. The WORLD can ignore gravity, time, and logic if requested.
      3. ABSOLUTE SHAPE & TEXTURE LOCK: Describe the product, its shape, colors, materials, textures, and any visible logos/branding IN METICULOUS DETAIL. Explain exactly how the light and environment interact with it. The prompt MUST describe the product perfectly so Sora 2 does not guess.
      4. ATMOSPHERIC GRADE & VFX: Very heavy detail on ethereal lighting, volumetric mist, glow effects, color grading, and particle physics.
    
    - FORMAT: Natural, ultra-technical prose. No technical labels. WRITE A MASSIVE, EPIC, HYPER-DETAILED PARAGRAPH. Be incredibly verbose about the environment, atmosphere, and camera work.
    - Generate ONLY THIS ONE MASTER SCENE.
    ` : (detectedColors && detectedColors.length > 1 ? `
    DETECTION: We found ${detectedColors.length} unique color variants.
    GOAL: Generate a 3-scene sequence showcasing the VARIETY while maintaining a STRIKING stylistic consistency.
    Scene 1 — Reveal: Highlighting one version with a dramatic orbit shot.
    Scene 2 — Interaction: Another variant being used/worn in close-up.
    Scene 3 — Details: Macro shots of multiple variants in a premium layout.
    ` : `
    GOAL: Create 3 cinematic video scenes (10 seconds each) for a high-end commercial:
    Scene 1 — THE HOOK: Wide establishing shot. Reveal the product in a majestic environment. The product's logo/branding must be facing the camera and clearly readable.
    Scene 2 — THE STORY: Medium tracking shot. Show the core benefit and dynamic interaction.
    Scene 3 — THE LOGO HERO: Slow cinematic orbit or macro tracking shot that lands DIRECTLY on the product's logo/branding. The camera must glide toward the logo and hold it in sharp focus. Describe the exact logo (its design, icon, text) as it appears on the product. This scene exists to showcase the brand identity with movement and cinematic lighting.
    `)}
    `;

    const isScriptMode = options.mode === 'script' && !!options.script;

    if (sceneDraft) {
        // Task description for "Magic" expansion is already set above
    } else if (isScriptMode) {
        taskDescription = `
    ACT AS A STRICT SCRIPT-TO-VISUAL ADAPTER.
    
    RAW SCRIPT:
    """
    ${options.script}
    """
    
    TASK: BREAK DOWN THE SCRIPT INTO A COMPLETE STORYBOARD.
    - Map every action and emotional beat to a hyper-detailed, massive Sora 2 cinematic prompt.
    - FORCE visual continuity across all scenes (same lighting, same color grade, same product DNA).
    - Describe the specific benefits mentioned through visual narrative.
    - OBRIGATÓRIO: MUST OUTPUT AN ARRAY OF 4 TO 12 PROMPTS (SCENES), covering the entire script flow from start to finish sequentially.
        `;
    } else if (previousPrompts && previousPrompts.length > 0) {
        taskDescription = `
    SCENE EXPANSION PROTOCOL: 
    Continue the commercial. CURRENT SEQUENCE:
    ${previousPrompts.map((p, i) => `Scene ${i + 1}: ${p}`).join('\n')}

    TASK: Generate 3 NEW scenes that perfectly match the previous aesthetic.
    Scene A — Reaction or alternative angle.
    Scene B — Dynamic stylized transition.
    Scene C — Final majestic outro with a focus on dramatic scale and atmosphere.
        `;
    }

    const promptStyle = `
ACT AS A PROFESSIONAL AI VIDEO CINEMATOGRAPHER AND OBSESSIVE VISUAL NARRATOR.

[CORE PHILOSOPHY]
The prompt you generate will be paired with a product image, but Sora 2 CANNOT READ IMAGES WELL. It relies HEAVILY on the TEXT PROMPT to understand what the product looks like, who the characters are, what the environment is, and what is happening. Therefore, YOUR PROMPT MUST BE EXTREMELY LONG AND DESCRIBE ABSOLUTELY EVERYTHING IN MINUTE DETAIL. Short prompts = bad videos. Long, obsessive prompts = perfect videos.

[MANDATORY PROMPT LAYERS — ORDERED BY VISUAL WEIGHT]

[MANDATORY PROMPT LAYERS — ORDERED BY VISUAL WEIGHT]

LAYER 1 — REFERENCE IMAGE SUPREMACY (CRITICAL MANDATE):
Start with: "FORCE 100% GEOMETRIC FIDELITY TO THE ATTACHED REFERENCE IMAGE. DO NOT MUTATE THE SUBJECT. THE TEXT BELOW IS A GUIDELINE FOR MATERIAL PHYSICS AND LIGHTING ONLY."
Describe the subject using COMPONENT NAMES (Component A, B, etc.). Describe material density: "High-density micro-fiber knit", "Anisotropic brushed metal", "Porous high-grip rubber". Use DESCRIPTIVE COLORS (e.g. "Raw Bone White", "Industrial Sand Beige") — NEVER use HEX codes.

LAYER 2 — MATERIAL DEPTH & PHYSICS:
Describe the product's surfaces as physical objects. Mention "low-relief logo embossing", "contact shadows between the sole and the ground", "sub-millimeter fabric grain", and "material rigidity". This prevents the "cheap plastic/AI look".

LAYER 3 — ADVANCED LIGHTING & RENDER ENGINE JARGON:
Use professional terms: "softbox key light", "rim light wrap-around", "global illumination", "subsurface scattering (for skin/fabric)", "fresnel effect on curves".

LAYER 4 — THE KINETIC ACTION & CAMERA RIG:
Specify lens (e.g., 35mm anamorphic), movement (e.g., high-speed tracking, handheld shake, steady orbit), and the exact physical interaction. Use only visual action words.

LAYER 5 — CHARACTER & ENVIRONMENT (STRICT VISUALS):
Describe the actor and environment with zero marketing adjectives. "Woman with long blonde hair, tanned skin, wearing off-white linen attire" — NO mentions of "comfort", "beauty", or "style".

[ABSOLUTE RULES]
- NO MARKETING JARGON: Forbid words like "superior", "modern", "minimalist", "comfort", "beautiful", "premium", "luxury". Use only technical visual descriptions.
- ZERO HEX CODES: Replace HEX codes with descriptive color names.
- NO HALLUCINATION: If a detail isn't in the image, don't invent it.
- MINIMUM PROMPT LENGTH: Each prompt MUST be at least 250-400 words.
- FORMAT: A single monolithic, epic cinematic paragraph. Visual logic only.
    `;
    const promptContext = `
[STRICT DIRECTOR MANDATE]
LEAVE NO CHOICE BEHIND. Every parameter below must be the SOUL of the scene.

[USER INTENT - HIGHEST PRIORITY]
${options.supportingDescription ? `CRITICAL USER OVERRIDE: ${options.supportingDescription}` : 'Generate a premium scene.'}
If the user request is surreal or impossible, EXECUTE LITERALLY. No metaphors.

TARGET CONFIGURATION:
- Aspect Ratio: ${options.aspectRatio}
- Mode: ${options.mode === 'lifestyle' ? 'LIFESTYLE (Actor Interaction Required)' : 'PRODUCT ONLY (Studio/Abstract)'}
- Lighting/Time: ${options.timeOfDay} (STRICT ADHERENCE)
- Environment: ${options.environment} (STRICT ADHERENCE)
- Cinematography Style: ${options.style} (STRICT ADHERENCE)

${options.mode === 'lifestyle' ? `
ACTOR SPECIFICATION (MUST BE DESCRIBED IN DETAIL IN THE PROMPT):
- Gender: ${options.gender}
- Skin Tone: ${options.skinTone}
- Hair: ${options.hairColor}
IMPORTANT: You MUST describe this actor/model in the output prompt with extreme detail — their appearance, clothing, expression, body language, and how they physically handle/interact with the product.
` : ''}

[PRODUCT IDENTITY & COMPONENT ATLAS — INTEGRATE COMPONENTS INTO PHYSICS]
The product consists of these technical components. Describe their material physics in the prompt using these labels:
"""
${productDescription}
"""

[CRITICAL INSTRUCTION]
1. REMOVE ALL MARKETING FLUFF. No "modern", "cool", "premium", "comfortable". Use only visual physics.
2. CONVERT ALL HEX CODES to descriptive English color names.
3. NEVER mention filenames, .png, .jpg, or metadata.
4. FOCUS ON MATERIAL REALISM: textures, reflections, and shadowing.

SCENE TYPE: ${sceneDraft ? 'POLISH THIS SPECIFIC DRAFT:' : 'CREATE NEW SCENE:'}
${sceneDraft || 'Based on the above settings, generate a 10-second high-impact cinematic sequence.'}

[SCENE TASK & STRATEGY]
${taskDescription}

[DIRECTOR'S CINEMATIC PROMPT RULES]
${promptStyle}

[OUTPUT REQUIREMENTS]
- The output MUST be a SINGLE, EXTREMELY LONG, ultra-detailed paragraph in ENGLISH.
- MINIMUM 150-250 words per prompt. Short prompts are UNACCEPTABLE.
- The prompt MUST include: product description, camera movement, action, environment, lighting, atmosphere, and character details (if lifestyle).
- No labels, no bullet points, no section headers. Just pure cinematic prose.
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
        return JSON.parse(response.text || "[]");
    } catch (e) {
        console.error("Failed to parse prompts", e);
        return [];
    }
}

// =======================================================================
// 3. GENERATE MOCKUP (Fix #1 — Now receives original product images!)
// =======================================================================
export async function generateMockup(
    productDescription: string,
    options: any,
    promptIndex: number,
    productImages: string[],
    promptText?: string // Optional: use the actual prompt text for the mockup
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

    const imagePrompt = `TASK: TECHNICAL INDUSTRIAL DESIGN REFERENCE SHEET (COLLAGE).
            GOAL: Create a professional commercial concept sheet (16:9 Collage) for a film director.

[CRITICAL - SOURCE OF TRUTH]
THE ATTACHED PHOTOS ARE THE ONLY REFERENCE. 
- CLONE MODE: Absolute adherence to reference photos. 
- IDENTITY LOCK: The product must be a pixel-perfect reconstruction.

[TECHNICAL ANNOTATIONS MANDATE - NEW]
- YOU MUST INCLUDE PROFESSIONAL TEXT LABELS AND CALLOUTS (lines pointing to parts) on the image.
- LABEL THE PARTS: Use terms like "Component A: Main Body", "Component B: Logo Area", "Component C: Surface Texture".
- CRITICAL: DO NOT write filenames, image extensions (like .png, .jpg), or file paths. Use only professional technical names.
- The image should look like a highly technical "Designer's Blueprint" with microscopic detail.

[LOGO MANDATE]
- The logo MUST be clearly visible, sharp, and perfectly legible in the MAIN HERO SHOT.
- At least ONE of the detail angles MUST be a dedicated, labeled close-up of the logo.

[SCENE CONTEXT]
    ENVIRONMENT: ${options.environment}
    LIGHTING: ${options.timeOfDay}
    STYLE: ${options.style}
${options.mode === 'lifestyle' ? `- TALENT: ${options.gender}, ${options.skinTone}, ${options.hairColor}` : ''}
${promptText || productDescription ? `BLUEPRINT: "${promptText || productDescription}"` : ''}

    [LAYOUT]
        - MAIN HERO SHOT (LEFT, 60%): ${focusInstructions[promptIndex] || "Hero product focus."} INCLUDE COMPONENT LABELS.
    - DETAIL ANGLES (RIGHT STACK, 40%): 3 microscopic views with TECHNICAL CALLOUTS AND TEXT.

        CRITICAL: The product MUST be identical to the photos. Annotations must look premium and architectural.`;

    // Build content parts: reference images (if available) + text prompt
    const contentParts: any[] = [];

    // Send max 3 reference images to save tokens/cost (first, middle, last for best coverage)
    if (productImages && productImages.length > 0) {
        const selected = productImages.length <= 3
            ? productImages
            : [productImages[0], productImages[Math.floor(productImages.length / 2)], productImages[productImages.length - 1]];
        for (const img of selected) {
            const { data, mimeType } = parseBase64(img);
            contentParts.push({ inlineData: { data, mimeType } });
        }
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
                return `data:${part.inlineData.mimeType}; base64, ${part.inlineData.data} `;
            }
        }
    } catch (e: any) {
        const classified = classifyError(e);
        console.error("Mockup generation failed:", classified.type, classified.message);
        throw classified;
    }
    return null;
}
