import { GoogleGenAI, Type } from "@google/genai";

export interface ProductAnalysis {
    description: string;
    productType: string;
    suggestedSceneriesProductOnly: string[];
    suggestedSceneriesLifestyle: string[];
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
export async function analyzeProduct(imagesBase64: string[]): Promise<ProductAnalysis> {
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
                    text: `You are a WORLD-CLASS product photographer, commercial director, and visual analyst. Analyze these product images with EXTREME precision.

RETURN a JSON with the following fields:

1. "description" (ENGLISH, ultra-detailed):
   - Exact shape, silhouette, and form factor
   - Exact colors (use hex codes when possible)
   - Materials and textures (matte, glossy, rubber, leather, fabric, etc.)
   - All visible text, logos, brand names, and their exact placement
   - QUANTITY: How many items make up this product? (e.g., flip-flops/sandals/shoes = PAIR of 2, earrings = PAIR of 2, a single bottle = 1, a kit = specify count). ALWAYS mention the correct quantity.
   - How the product is typically displayed/sold (e.g., "always shown as a pair", "comes in a box", "single unit")
   - Size relative to common objects if discernible
   - Any unique visual details that differentiate this exact product from similar ones

2. "productType" (PORTUGUESE): Short category name

3. "suggestedSceneriesProductOnly" (PORTUGUESE): 4 REAL COMMERCIAL VIDEO SCENARIOS for product-only shots. Each must describe:
   - The ENVIRONMENT (where)
   - The ACTION/MOVEMENT (what happens in the scene)
   - The EMOTION/MOOD (what feeling it evokes)
   - Example: "Plataforma giratória em estúdio escuro com iluminação rim light — câmera orbita lentamente revelando cada detalhe do produto. Mood: premium e misterioso."
   DO NOT just list locations. Describe FULL SCENES that would work as TV commercials or social media ads.

4. "suggestedSceneriesLifestyle" (PORTUGUESE): 4 REAL COMMERCIAL VIDEO SCENARIOS with people using the product. Each must describe:
   - WHO is using/wearing the product and HOW
   - WHERE the action takes place
   - WHAT HAPPENS in the scene (storytelling micro-narrative)
   - Example: "Jovem caminhando na orla ao amanhecer, câmera foca nos pés calçando o chinelo enquanto pisa na areia molhada — mood aspiracional e livre."
   These must feel like real TV commercial storyboard descriptions.` }
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
                    }
                },
                required: ["description", "productType", "suggestedSceneriesProductOnly", "suggestedSceneriesLifestyle"]
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
export async function analyzeScenery(imagesBase64: string[]): Promise<SceneryAnalysis> {
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
                    text: `You are a WORLD-CLASS film location scout and cinematographer. Analyze these SCENERY/LOCATION images.

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
export async function generatePrompts(productDescription: string, options: any, previousPrompts?: string[]): Promise<string[]> {
    const apiKey = getApiKey();
    if (!apiKey) throw new AIError("Chave API do Gemini não configurada.", "API_KEY_MISSING");

    const ai = new GoogleGenAI({ apiKey });

    const sora2MasterSkeleton = `
SORA 2 – COMPACT DETERMINISTIC PROMPT SKELETON v3
Strict interpretation only. No creative reinterpretation. No fabrication.

[1] OUTPUT: Aspect Ratio: [INSERT] | Resolution: 4K | 60fps | Duration: 10s | HDR: yes | No auto-reframing, zoom, or crop.

[2] ENVIRONMENT: Type: [INSERT] | Location: [INSERT] | Surface/terrain: [INSERT] | Background layers: [INSERT] | Atmosphere: [INSERT] | Weather: [INSERT] | Dominant colors: [INSERT]

[3] SUBJECT: Entity: Product | Identity: [INSERT EXACT PRODUCT DESCRIPTION] | Identity lock: absolute, no mutations | Must remain fully visible for entire duration | Zero occlusion.
${options.mode === 'lifestyle' ? `
[ACTOR]: A [INSERT gender] [INSERT age range], wearing [INSERT clothing].
[INTERACTION]: PHYSICAL CONTACT MANDATORY. The actor MUST be [INSERT: wearing/holding/using/stepping into] the product throughout. The product is the center of the action.
[PROXIMITY]: The actor's body/limbs and the product MUST be in the same focus plane, occupying at least 40% of the frame together. No distant background actors.
` : '[NO HUMAN ACTORS]'}

[4] ACTION: Initial state: [INSERT] | Motion: [INSERT] | End state: [INSERT] | Real-time speed | Earth gravity | No teleportation, morphing, or time jumps | Continuous motion.

[5] CAMERA: Position: [INSERT relative to subject] | Lens: [INSERT mm equivalent] | Aperture: [INSERT] | Focus: locked on product | Movement: [INSERT type + speed] | Gimbal-stabilized | Cinematic motion blur.

[6] LIGHTING: Source: [INSERT natural/artificial] | Direction: [INSERT] | Color temperature: [INSERT K] | Shadow softness: [INSERT] | No clipped highlights | No crushed blacks.

[7] STYLE: Photorealistic | Modern color grading | [INSERT contrast/saturation] | No CGI look | No AI artifacts.

[8] AUDIO: Ambient sounds: [INSERT] | Music: [INSERT genre], non-diegetic.

[SORA 2 CHARACTERS]: If the prompt mentions a character using the @tag format (e.g., @Alex, @Maya), include the tag exactly as written in the [ACTOR] field. Sora 2 will use its built-in character consistency engine.

HARD RULES: No text overlays | No subtitles | No watermarks | No logos (except product) | No physics violations | ACTOR AND PRODUCT MUST INTERACT PHYSICALLY — product cannot be isolated from actor in lifestyle mode.
  `;

    let taskDescription = `
    Task: Create a cohesive 3-part commercial video sequence for OpenAI's Sora 2. 
    The goal is to generate 3 different prompts (10 seconds each) that can be stitched together into a seamless 30-second commercial without feeling repetitive.
    
    Structure the 3 prompts as follows:
    1. [The Hook / Establishing Shot]: Wide or medium-wide shot. Introduce the environment, the atmosphere, and reveal the product in a cinematic way.
    2. [The Action / Feature]: Medium or tracking shot. Show the product in action, being used (if lifestyle), or dynamic movement around the product (if product only).
    3. [The Climax / Macro]: Extreme close-up or macro shot. Focus on the texture, materials, branding, and fine details with dramatic lighting.
  `;

    const isScriptMode = options.mode === 'script' && !!options.script;

    if (isScriptMode) {
        taskDescription = `
    ACT AS A SORA 2 MASTER SCRIPT-TO-VISUAL ADAPTER.
    
    RAW SCRIPT:
    """
    ${options.script}
    """
    
    TASK: BREAK DOWN THE ENTIRE SCRIPT INTO A COMPLETE STORYBOARD.
    1. READ every section — Hook, Development, Climax, Closing.
    2. GENERATE a Sora 2 prompt for EVERY visual scene described or implied.
    3. Generate AS MANY SCENES AS THE SCRIPT NEEDS (not fixed to 3). If the script has 5 distinct moments, generate 5 prompts. If it has 8, generate 8.
    4. For EACH scene, use the EXACT SORA 2 COMPACT SKELETON format.
    5. Each scene = 10 seconds of video.
    `;
    } else if (previousPrompts && previousPrompts.length > 0) {
        taskDescription = `
    Task: CONTINUE the commercial video sequence for OpenAI's Sora 2.
    Here are the previous scenes already generated:
    ${previousPrompts.map((p, i) => `Scene ${i + 1}: ${p}`).join('\n')}

    Generate the NEXT 3 scenes to seamlessly follow the story.
    Structure the 3 NEW prompts as follows:
    1. [Alternative Angle / Reaction]: Show a different perspective or how the environment/actor reacts to the product.
    2. [Dynamic B-Roll]: Fast-paced or highly stylized transition shot highlighting a secondary feature.
    3. [Final Outro / Call to Action]: A majestic final shot slowly zooming out, leaving space for a logo or text.
    `;
    }

    const promptContext = `
    Product Description: ${productDescription}
    
    Video Style Options:
    - Aspect Ratio: ${options.aspectRatio}
    - Mode: ${options.mode === 'lifestyle' ? 'Lifestyle (Someone using the product)' : options.mode === 'script' ? 'Script Adaptation' : options.mode === 'scenery' ? 'Scenery/Location Video' : 'Product Only'}
    ${options.mode === 'lifestyle' ? `
    - Actor Gender: ${options.gender}
    - Actor Skin Tone: ${options.skinTone}
    - Actor Hair Color: ${options.hairColor}
    ` : ''}
    ${options.mode === 'scenery' ? `
    - Camera Technique: ${(options as any).cameraAngle || 'Cinematic orbit'}
    - Scene Action: ${(options as any).sceneAction || 'Ambient establishing shot'}
    - Audio Design: ${(options as any).audioDesign || 'Natural ambient sounds'}
    - Animation Speed: ${(options as any).animationSpeed || 'Normal'}
    ` : ''}
    - Time of Day/Lighting: ${options.timeOfDay}
    - Environment/Setting: ${options.environment}
    - Cinematography Style: ${options.style}
    ${options.supportingDescription ? `- Additional Context/User Request: ${options.supportingDescription}` : ''}
    
    ${taskDescription}

    CRITICAL INSTRUCTION: For EACH generated scene, fill in every [INSERT] field in the COMPACT SKELETON with specific, deterministic details. Output the complete filled skeleton for each scene.

    SKELETON TEMPLATE:
    ${sora2MasterSkeleton}

    CRITICAL RULE: All prompts MUST be in ENGLISH. Do not output in Portuguese.
    SORA 2 SAFETY: When describing people, use brief professional casting terms (e.g., "a young woman", "a man in his 30s"). Avoid overly detailed physical descriptions.
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
    productImages?: string[]  // NEW: Original product photos for reference
): Promise<string | null> {
    const apiKey = getApiKey();
    if (!apiKey) throw new AIError("Chave API do Gemini não configurada.", "API_KEY_MISSING");

    const ai = new GoogleGenAI({ apiKey });
    const sequenceTypes = [
        "Wide Establishing Shot, environment focus.",
        "Medium Action Shot, product in use focus.",
        "Extreme Close-up Macro Shot, texture focus.",
        "Side Profile Shot, shape focus.",
        "Top View Shot, interior/upper focus.",
        "Low Angle Hero Shot, status focus.",
        "Extra Scene 1",
        "Extra Scene 2",
        "Extra Scene 3"
    ];

    const focusInstructions = [
        "Focus on the environment and how the product fits in. Show the whole object.",
        "Focus on the interaction/movement. The product must remain 100% rigid and faithful.",
        "Hyper-zoom on materials and textures. Branding must be perfectly clear.",
        "Show the silhouette from a clean side angle.",
        "Show it from directly above. Clean geometry.",
        "Majestic hero angle, looking up at the product.",
        "Dynamic scene.",
        "Lifestyle action.",
        "Product focus."
    ];

    const imagePrompt = `TASK: Generate a PROFESSIONAL PRODUCT CONCEPT SHEET (Collage).
GOAL: Create a single 16:9 image containing a HERO SHOT and MULTIPLE detail views.

CRITICAL — PRODUCT FIDELITY (CLONE MODE):
- PHOTOGRAPHIC TEMPLATE: Use the ${productImages?.length || 0} attached photos. They are the 100% SOURCE OF TRUTH.
- PIXEL-PERFECT CLONE: Every pixel of the product (shape, silhouette, branding, logos, materials, texture) MUST be an exact replica of the photos.
- ZERO HALLUCINATION: Do not change colors, do not add fake logos, do not simplify the design. 
- CONSISTENCY: Every view in this collage MUST show the same identical product.

QUANTITY RULE (CRITICAL):
- The product is a ${productDescription.includes('pair') || productDescription.includes('shoes') || productDescription.includes('flip-flop') || productDescription.includes('sandal') ? 'PAIR (2 Items)' : 'SINGLE UNIT (1 Item)'}. 
- HERO SHOT (Left) MUST show the product exactly as sold (e.g., BOTH items of a pair).
- If it's a pair, do not show only one shoe/sandal.

COLLAGE LAYOUT:
- MAIN HERO SHOT (LEFT, 60%): The product in the requested environment.
- ANGLE VIEWS (RIGHT STACK, 40%): 3 technical detail views (e.g. Sole, Interior, Logos).

SHOT SPECIFIC FOCUS: ${focusInstructions[promptIndex] || "Hero product focus"}

LIFESTYLE EXECUTION (ANCHOR MODE):
- TALENT: ${options.mode === 'lifestyle' ? `A ${options.gender} model (${options.hairColor} hair) is PHYSICALLY ${productDescription.includes('shoe') || productDescription.includes('flip-flop') || productDescription.includes('sandal') ? 'WEARING' : 'USING'} the product. 
- ANCHOR RULE: The product is fixed. Draw the person *fitting* the product.
- RIGIDITY: The product does not bend or distort based on the person's pose.` : 'Product only, no people. Hero composition.'}

SCENE DATA:
IDENTIFIER: ${productDescription}
HERO SCENE: ${sequenceTypes[promptIndex] || "Action hero shot"}
ENVIRONMENT: ${options.environment}, ${options.timeOfDay} lighting.
STYLE: ${options.style}. High-end commercial photography, studio-quality, 8k textures.`;

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
