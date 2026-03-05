
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
const IMAGE_MODELS = ["gemini-3-pro-image-preview", "gemini-2.5-flash-image", "gemini-2.0-flash-preview-image-generation"];

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
    
    TASK: TRANSFORM THIS DRAFT INTO A MASTER SORA 2 BLUEPRINT (999,999% IMPROVEMENT).
    - GOAL: Extreme visual consistency for the product, but ABSOLUTE CREATIVE FREEDOM for the environment.
    - SURREALISM MANDATE: If the user draft contains impossible or fantastical elements (e.g., walking on clouds, flying, portals), DO NOT RATIONALIZE. Do not turn clouds into "white sand". Provide the LITERAL surrealist interpretation that Sora 2 excels at.
    - STRATEGY: Use the 5-LAYER CINEMATIC PROTOCOL:
      0. MARKETING ALIGNMENT & EMOTION: Evoke the EMOTION described. If the user says "stepping on clouds", describe the ethereal lightness and the model's divine comfort.
      1. TECHNICAL SETTING: Specify lens (e.g., 35mm), movement (e.g., slow-motion tracking), and framing.
      2. PHYSICS & WEIGHT: The PRODUCT must be structurally rigid and feel solid. The WORLD can ignore gravity, time, and logic if requested.
      3. PRODUCT FIDELITY: Meticulously describe materials (matte rubber, brushed aluminum), logo placement, and light reflection.
      4. ATMOSPHERIC GRADE & VFX: Ethereal lighting, volumetric mist, glow effects, or dream-state color grading.
    
    - FORMAT: Natural, ultra-technical prose. No technical labels. Length: ~150-250 words.
    - Generate ONLY THIS ONE MASTER SCENE.
    ` : (detectedColors && detectedColors.length > 1 ? `
    DETECTION: We found ${detectedColors.length} unique color variants.
    GOAL: Generate a 3-scene sequence showcasing the VARIETY while maintaining a STRIKING stylistic consistency.
    Scene 1 — Reveal: Highlighting one version with a dramatic orbit shot.
    Scene 2 — Interaction: Another variant being used/worn in close-up.
    Scene 3 — Details: Macro shots of multiple variants in a premium layout.
    ` : `
    GOAL: Create 3 cinematic video scenes (10 seconds each) for a high-end commercial:
    Scene 1 — THE HOOK: Wide establishing shot. Reveal the product in a majestic environment.
    Scene 2 — THE STORY: Medium tracking shot. Show the core benefit and product DNA in action.
    Scene 3 — THE DETAILS: Extreme macro. Focus on the sharpest textures and perfectly legible branding.
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
    - Map every action and emotional beat to a professional Sora 2 blueprint.
    - FORCE visual continuity across all scenes (same lighting, same color grade, same product DNA).
    - Describe the specific benefits mentioned through visual narrative.
        `;
    } else if (previousPrompts && previousPrompts.length > 0) {
        taskDescription = `
    SCENE EXPANSION PROTOCOL: 
    Continue the commercial. CURRENT SEQUENCE:
    ${previousPrompts.map((p, i) => `Scene ${i + 1}: ${p}`).join('\n')}

    TASK: Generate 3 NEW scenes that perfectly match the previous aesthetic.
    Scene A — Reaction or alternative angle.
    Scene B — Dynamic stylized transition.
    Scene C — Final majestic outro with a focus on brand identity.
        `;
    }

    const promptStyle = `
ACT AS AN ELITE AI VIDEO DIRECTOR & SORA 2 NARRATIVE ARCHITECT.

SORA 2 MASTER SKELETON (HIERARCHICAL PRIORITY):
1. KINETIC FOUNDATION (Movement): Define the camera kit and action immediately. (e.g., 35mm Anamorphic, Fluid Orbit shot).
2. SUBJECT VISUAL ANATOMY: Describe the product as a rigid, physically stable entity. Focus on textures and micro-details.
3. MICRO-PHYSICS: Describe how materials interact (e.g., "soft compression of the sole under the model's weight").
4. VOLUMETRIC LIGHTING: Use technical light descriptions (Rim light, God rays, Bokeh).
5. COLORS: Reinforce colors with HEX CODES (e.g., "Midnight Black #1A1A1A").
6. ATMOSPHERE & FX: Environmental particles, mist, or surreal elements.

DIRECTIVES:
- NO CONCEPTUAL TERMS: Never use words like "comfortable" or "premium". Use visual proofs: "The material deforms 2mm under pressure" (Visual-First).
- PHYSICS ANNIHILATION (SURREALISM): If the user requests walking on clouds, fire, or space, EXECUTE LITERALLY. Forbid adding "platforms", "glass floors", or "roads". The feet MUST interact DIRECTLY with the impossible medium.
- HIGH-END AESTHETIC: All surrealism must be PRESTIGIOUS and PREMIUM. Think Haute Couture, Luxury Perfume Ads (Dior, Chanel), or Apple-style minimalism. 
- FORBIDDEN: NEVER use 'childish' or 'ludic' elements like candy, marshmallows, toys, or fairytales unless explicitly asked. Surrealism should feel sophisticated and avant-garde, not silly.
- NO RATIONALIZATION: Stop trying to make it "plausible". Zero logic, maximum visual impact.
- RIGIDITY: The product must never distort/melt unless explicitly asked.
- FORMAT: Single flowing paragraph of cinematic English.
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
ACTOR SPECIFICATION (NON-NEGOTIABLE):
- Gender: ${options.gender}
- Skin Tone: ${options.skinTone} 
- Hair: ${options.hairColor}
` : ''}

PRODUCT DATA:
${productDescription}
${hexInfo}

SCENE TYPE: ${sceneDraft ? 'POLISH THIS SPECIFIC DRAFT:' : 'CREATE NEW SCENE:'}
${sceneDraft || 'Based on the above settings, generate a 10-second high-impact cinematic sequence.'}

[SCENE TASK & STRATEGY]
${taskDescription}

[DIRECTOR BLUEPRINT]
${promptStyle}

CRITICAL: The output MUST be a SINGLE paragraph in ENGLISH, adhering to the SORA 2 MASTER SKELETON. No labels, no bullet points.
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

    const imagePrompt = `TASK: TECHNICAL PRODUCT RECONSTRUCTION (COLLAGE).
GOAL: Create a professional commercial concept sheet (16:9 Collage).

[CRITICAL - SOURCE OF TRUTH]
THE ATTACHED PHOTOS ARE THE ONLY REFERENCE FOR PRODUCT SHAPE, COLORS, AND BRANDING. 
- CLONE MODE: Absolute adherence to reference photos. 
- ZERO HALLUCINATION: Do not add details, textures, or features not present in the photos.
- IDENTITY LOCK: The product must be a pixel-perfect reconstruction of the references.

[SCENE CONTEXT - FOR ENVIRONMENT ONLY]
ENVIRONMENT: ${options.environment}
LIGHTING: ${options.timeOfDay}
STYLE: ${options.style}
${options.mode === 'lifestyle' ? `- TALENT: ${options.gender}, ${options.skinTone}, ${options.hairColor}` : ''}
${promptText || productDescription ? `BLUEPRINT: "${promptText || productDescription}"` : ''}

[LAYOUT]
- MAIN HERO SHOT (LEFT, 60%): ${focusInstructions[promptIndex] || "Hero product focus."}
- DETAIL ANGLES (RIGHT STACK, 40%): 3 microscopic views focusing strictly on the materials and branding found in the photos.

CRITICAL: Perfect symmetry, cinematic grade. The product MUST be identical to the photos.`;

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
