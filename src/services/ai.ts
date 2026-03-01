import { GoogleGenAI, Type } from "@google/genai";

export interface ProductAnalysis {
    description: string;
    productType: string;
    suggestedSceneriesProductOnly: string[];
    suggestedSceneriesLifestyle: string[];
}

// "Golden Combination" from AI_MODELS_DOC.md
const BRAIN_MODEL = "gemini-3.1-pro-preview";
const IMAGE_MODEL = "gemini-3-pro-image-preview";

function getApiKey(): string {
    const localKey = localStorage.getItem('gemini_api_key');
    if (localKey && localKey.trim().startsWith('AIzaSy')) return localKey.trim();

    const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (envKey && envKey.trim().startsWith('AIzaSy')) return envKey.trim();

    return "";
}

export async function analyzeProduct(imagesBase64: string[]): Promise<ProductAnalysis> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("GEMINI_API_KEY_MISSING");

    const ai = new GoogleGenAI({ apiKey });
    const parts = imagesBase64.map(base64 => {
        const mimeTypeMatch = base64.match(/^data:(image\/[a-zA-Z+]+);base64,/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
        const data = base64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

        return {
            inlineData: {
                data,
                mimeType,
            }
        };
    });

    const response = await ai.models.generateContent({
        model: BRAIN_MODEL,
        contents: {
            parts: [
                ...parts,
                { text: "Analise estas imagens de produto em detalhes extremos. Retorne um JSON estruturado. IMPORTANTE: O 'productType' e os cenários DEVEM estar em Português do Brasil (PT-BR). Forneça duas listas de cenários: 1) 'suggestedSceneriesProductOnly': 3 a 4 cenários de estúdio, minimalistas, 3D ou fundos infinitos focados 100% no produto. 2) 'suggestedSceneriesLifestyle': 3 a 4 cenários cinematográficos e reais onde o produto estaria inserido ou sendo usado. REGRA CRÍTICA: Se você usar qualquer termo técnico de cinema, fotografia ou arte (ex: bokeh, lente anamórfica, macro, profundidade de campo, etc) nos cenários, você DEVE explicar brevemente o que significa entre parênteses para que um usuário leigo entenda. A 'description' interna pode ser em inglês para manter a precisão técnica para os próximos passos." }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    description: { type: Type.STRING, description: "Highly precise description of the product's shape, color, texture, materials, branding, text, and unique visual features." },
                    productType: { type: Type.STRING, description: "A short category name (e.g., 'Sneakers', 'Skincare Bottle', 'Electronics')." },
                    suggestedSceneriesProductOnly: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "Array of 3-4 studio, minimalist, or 3D environment descriptions."
                    },
                    suggestedSceneriesLifestyle: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "Array of 3-4 cinematic, real-world environment descriptions."
                    }
                },
                required: ["description", "productType", "suggestedSceneriesProductOnly", "suggestedSceneriesLifestyle"]
            }
        }
    });

    try {
        return JSON.parse(response.text || "{}");
    } catch (e) {
        console.error("Failed to parse analysis", e);
        return { description: "", productType: "Product", suggestedSceneriesProductOnly: [], suggestedSceneriesLifestyle: [] };
    }
}

export async function generatePrompts(productDescription: string, options: any, previousPrompts?: string[]): Promise<string[]> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("GEMINI_API_KEY_MISSING");

    const ai = new GoogleGenAI({ apiKey });

    const sora2MasterSkeleton = `
SORA 2 – MAXIMUM CONTROL PROMPT ENGINEERING MASTER SKELETON
Ultra-Structured Deterministic Video Generation Blueprint Version:
Extreme Control Specification

=====================================================================
GLOBAL GENERATION DIRECTIVE
=====================================================================
This specification must be interpreted strictly and literally. Do not infer missing elements. Do not creatively reinterpret constraints. If information is not explicitly stated, do not fabricate it. Prioritize physical realism and spatial consistency over artistic creativity.

===================================================================== 1. OUTPUT CONFIGURATION (HIGHEST PRIORITY)
=====================================================================
VIDEO_OUTPUT: - Aspect Ratio: [INSERT] - Strict Aspect Enforcement: yes - Resolution: 4K - Frame Rate: 60fps - Duration (seconds): 10 - Bitrate target: Maximum - Compression style: Lossless - HDR: yes - Color space: Rec.2020 - Safe margin enforcement: yes - No automatic reframing: yes - No auto zoom: yes - No auto crop: yes

===================================================================== 2. SCENE PHYSICAL FOUNDATION
=====================================================================
ENVIRONMENT_CORE: - Environment type: [INSERT] - Geographic location: [INSERT] - Climate zone: [INSERT] - Terrain type: [INSERT] - Surface materials: [INSERT] - Structural elements: [INSERT] - Background depth layers: [INSERT] - Foreground elements: [INSERT] - Atmospheric density: [INSERT] - Air particles (dust/fog/smoke): [INSERT] - Wind speed: [INSERT] - Humidity level: [INSERT] - Temperature context: [INSERT] - Water presence: [INSERT] - Reflection surfaces: [INSERT]
COLOR_ENVIRONMENT: - Dominant color family: [INSERT] - Secondary colors: [INSERT] - Natural vs artificial balance: [INSERT] - Saturation baseline: [INSERT]

===================================================================== 3. SUBJECT ARCHITECTURE
=====================================================================
PRIMARY_SUBJECT: - Entity type: Product - Quantity: 1 - Species: N/A - Gender: [INSERT IF LIFESTYLE, ELSE N/A] - Age range: [INSERT IF LIFESTYLE, ELSE N/A] - Body type: [INSERT IF LIFESTYLE, ELSE N/A] - Height: [INSERT IF LIFESTYLE, ELSE N/A] - Skin tone: [INSERT IF LIFESTYLE, ELSE N/A] - Clothing description: [INSERT IF LIFESTYLE, ELSE N/A] - Clothing material physics: [INSERT IF LIFESTYLE, ELSE N/A] - Accessories: [INSERT IF LIFESTYLE, ELSE N/A] - Facial hair: [INSERT IF LIFESTYLE, ELSE N/A] - Hairstyle: [INSERT IF LIFESTYLE, ELSE N/A] - Emotional state: [INSERT IF LIFESTYLE, ELSE N/A] - Pose: [INSERT] - Orientation relative to camera: [INSERT] - Must remain visible entire duration: yes - Occlusion tolerance level: Zero
CRITICAL IDENTITY LOCK: - Non-negotiable visual traits: [INSERT EXACT PRODUCT DESCRIPTION] - Identity continuity enforcement: Absolute

===================================================================== 4. OBJECT & PROP SYSTEM
=====================================================================
ACTIVE_OBJECTS: - Object name: The Product - Material: [INSERT] - Weight realism: High - Surface texture: [INSERT] - Reflectivity: [INSERT] - Damage state: Pristine - Interaction rules: [INSERT]
STATIC_OBJECTS: - Placement: [INSERT] - Anchoring physics: [INSERT] - Stability enforcement: Absolute

===================================================================== 5. ACTION & TEMPORAL LOGIC
=====================================================================
ACTION_FLOW: - Initial state: [INSERT] - Trigger event: [INSERT] - Primary motion: [INSERT] - Secondary motion: [INSERT] - End state: [INSERT] - Motion speed scale: Real-time - Acceleration realism: High - Friction realism: High - Gravity consistency: Earth-normal - No teleportation: yes - No morphing: yes - No time jumps: yes - Continuous motion enforcement: yes

===================================================================== 6. CAMERA SYSTEM ENGINEERING
=====================================================================
CAMERA_POSITIONING: - Relative position to subject: [INSERT] - Height: [INSERT] - Distance: [INSERT] - Horizontal angle: [INSERT] - Vertical tilt: [INSERT] - Tracking anchor point: [INSERT]
OPTICS: - Lens equivalent: [INSERT] - Aperture simulation: [INSERT] - Depth of field intensity: [INSERT] - Focus target: The Product - Rack focus allowed: no
MOVEMENT_PROFILE: - Movement type: [INSERT] - Speed: [INSERT] - Stabilization: Gimbal-smooth - Handheld shake intensity: Zero - Motion blur level: Cinematic - No sudden perspective warping: yes - No digital zoom artifacts: yes

===================================================================== 7. LIGHTING PHYSICS MODEL
=====================================================================
LIGHT_SOURCE: - Natural or artificial: [INSERT] - Direction: [INSERT] - Elevation angle: [INSERT] - Intensity: [INSERT] - Color temperature: [INSERT] - Shadow softness: [INSERT] - Bounce light level: [INSERT] - Volumetric presence: [INSERT] - Reflection accuracy: High - Exposure protection: yes - No highlight clipping: yes - No crushed blacks: yes

===================================================================== 8. AUDIO ENGINEERING
=====================================================================
DIALOGUE: - Present: [INSERT YES/NO BASED ON OPTIONS] - Language: [INSERT LANGUAGE] - Number of speakers: [INSERT] - Tone: [INSERT] - Volume: [INSERT] - Emotional intensity: [INSERT] - Lip-sync strictness: High - Accent specification: [INSERT] - No subtitles unless specified: yes
AMBIENCE: - Environmental sounds: [INSERT] - Distance realism: High - Echo/reverb profile: [INSERT]
SOUND_EFFECTS: - Object interaction sounds: [INSERT] - Movement sounds: [INSERT] - Environmental physics consistency: High
MUSIC: - Present: yes - Genre: [INSERT] - Tempo: [INSERT] - Diegetic/non-diegetic: Non-diegetic - Volume relative to dialogue: Background
SILENCE ENFORCEMENT: no

===================================================================== 9. STYLE CONTROL SYSTEM
=====================================================================
VISUAL_REALISM_LEVEL: - [INSERT STYLE OPTION]
COLOR_GRADING: - Contrast level: [INSERT] - Saturation level: [INSERT] - LUT inspiration: [INSERT] - Era reference: Modern
TEXTURE_PROCESSING: - Film grain: [INSERT] - Noise control: High - Digital sharpness: High - No CGI aesthetic: yes - No cartoon stylization: yes - No artificial smooth skin: yes

===================================================================== 10. TEMPORAL CONSISTENCY LOCK
=====================================================================
CONTINUITY_RULES: - No duplicated subjects: yes - No limb duplication: yes - No object mutation: yes - Lighting consistency across frames: yes - Weather consistency: yes - Motion continuity: yes - Frame stability: yes - No flickering: yes

===================================================================== 11. NEGATIVE HARD CONSTRAINTS
=====================================================================
FORBIDDEN_ELEMENTS: - No text overlays (unless explicitly required) - No subtitles (unless explicitly required) - No logos (other than product) - No watermarks - No distorted anatomy - No warped geometry - No random inserted objects - No stylistic shifts mid-video - No physics violations - No AI artifacts

===================================================================== 12. FINAL EXECUTION DIRECTIVE
=====================================================================
- Obey structural hierarchy strictly.
- Do not add elements not specified.
- Maintain spatial coherence.
- Maintain physical plausibility.
- Preserve identity continuity.
- Respect strict framing.
- Prioritize realism over interpretation.
END OF MASTER SPECIFICATION
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
    1. READ every section (Hook, Development, Closing).
    2. GENERATE a high-fidelity Sora 2 prompt for EVERY visual scene described or implied.
    3. For EACH scene, use the EXACT SORA 2 MASTER SKELETON format.
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
    - Mode: ${options.mode === 'lifestyle' ? 'Lifestyle (Someone using the product)' : options.mode === 'script' ? 'Script Adaptation' : 'Product Only'}
    ${options.mode === 'lifestyle' ? `
    - Actor Gender: ${options.gender}
    - Actor Skin Tone: ${options.skinTone}
    - Actor Hair Color: ${options.hairColor}
    ` : ''}
    - Time of Day/Lighting: ${options.timeOfDay}
    - Environment/Setting: ${options.environment}
    - Cinematography Style: ${options.style}
    ${options.supportingDescription ? `- Additional Context/User Request: ${options.supportingDescription}` : ''}
    
    ${taskDescription}

    CRITICAL INSTRUCTION: For EACH generated scene, you MUST output the prompt using EXACTLY the following "SORA 2 MASTER SKELETON" format. Fill in every single [INSERT] field with highly specific, deterministic, and physically plausible details based on the product description and chosen options. Do not omit any section. The output for each scene must be the full skeleton text.

    SKELETON TEMPLATE TO FILL OUT FOR EACH SCENE:
    ${sora2MasterSkeleton}

    CRITICAL RULE: The final generated prompts MUST be entirely in ENGLISH, as Sora 2 understands English best. Do not output the prompts in Portuguese.
  `;

    const response = await ai.models.generateContent({
        model: BRAIN_MODEL,
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
    });

    try {
        return JSON.parse(response.text || "[]");
    } catch (e) {
        console.error("Failed to parse prompts", e);
        return [];
    }
}

export async function generateMockup(productDescription: string, options: any, promptIndex: number): Promise<string | null> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("GEMINI_API_KEY_MISSING");

    const ai = new GoogleGenAI({ apiKey });
    const sequenceTypes = [
        "Wide Establishing Shot, showing the environment and introducing the product.",
        "Medium Action Shot, showing the product in use or dynamic display.",
        "Extreme Close-up Macro Shot, focusing on textures, materials, and branding.",
        "Alternative Angle or Reaction Shot, showing a different perspective.",
        "Dynamic B-Roll Shot, highly stylized.",
        "Final Outro Shot, majestic and leaving space for a logo.",
        "Extra Scene 1",
        "Extra Scene 2",
        "Extra Scene 3"
    ];

    const imagePrompt = `A professional product photography concept sheet showing MULTIPLE ANGLES of the exact same product in a single image.
    Layout: A split-screen or grid collage showing front view, side view, and detail macro shots.
    Product: ${productDescription}. CRITICAL: Maintain strict consistency with this product description. The shape, color, and branding MUST be identical across all angles.
    Scene Focus: ${sequenceTypes[promptIndex] || "Dynamic Shot"}
    Setting: ${options.environment}, ${options.timeOfDay}.
    ${options.mode === 'lifestyle' ? `Featuring a ${options.skinTone} skinned ${options.gender} with ${options.hairColor} hair interacting with the product.` : 'The product is the sole focus.'}
    ${options.supportingDescription ? `Additional Context: ${options.supportingDescription}.` : ''}
    Style: ${options.style}. Ultra-realistic, raw photography, 8k resolution, sharp focus, highly detailed, shot on 35mm lens, photorealistic commercial photography. NO AI artifacts, highly realistic textures.`;

    try {
        const response = await ai.models.generateContent({
            model: IMAGE_MODEL,
            contents: {
                parts: [{ text: imagePrompt }]
            },
            config: {
                // @ts-ignore
                imageConfig: {
                    aspectRatio: "1:1",
                    imageSize: "1K"
                }
            }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    } catch (e) {
        console.error("Failed to generate mockup", e);
    }
    return null;
}
