import { GoogleGenAI, Type } from "@google/genai";

export interface ProductAnalysis {
    description: string;
    productType: string;
    suggestedSceneriesProductOnly: string[];
    suggestedSceneriesLifestyle: string[];
}

function getApiKey(): string {
    // Priority 1: localStorage (if you ever add a UI to change keys manually)
    const localKey = localStorage.getItem('gemini_api_key');
    if (localKey && localKey.trim().startsWith('AIzaSy')) return localKey.trim();

    // Priority 2: Environment Variables (from .env or Vercel dashboard)
    const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (envKey && envKey.trim().startsWith('AIzaSy')) return envKey.trim();

    // If no key is found, will return empty which triggers an error in analyzeProduct
    return "";
}

// Helper to list models to console if something fails
async function logAvailableModels(ai: any) {
    try {
        const models = await ai.models.list();
        console.log("AVAILABLE_MODELS_LIST:", models);
    } catch (e) {
        console.error("Could not list models:", e);
    }
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

    try {
        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash", // Reverting to exact name but with fallback attempt
            contents: [{
                role: 'user',
                parts: [
                    ...parts,
                    {
                        text: `Analise estas imagens de produto com precisão CIRÚRGICA. Você é um Diretor de Arte sênior preparando um blueprint para o Sora 2.
                    Extraia um DNA VISUAL COMPLETO. O objetivo é que o mockup gerado depois seja IDENTICO ao produto real.
                    
                    No campo 'description', forneça um "Visual Blueprint" detalhando:
                    1. GEOMETRIA: Formatos exatos, proporções (ex: "cilindro alto com tampa arredondada"), cantos (raio de curvatura).
                    2. MATERIAIS: Textura exata (Alumínio escovado, vidro translúcido, plástico fosco), reflexividade, transparência.
                    3. BRANDING: Localização exata de logos e textos (ex: "Logo centralizado no terço superior em fonte Sans Serif prateada").
                    4. CORES: Use nomes técnicos e aproximações de tons (ex: "Azul Marinho meia-noite", "Branco Pérola acetinado").
                    5. DETALHES ÚNICOS: Ranhuras, costuras, botões, reflexos específicos.
    
                    REGRA DE IDIOMA: 'productType' e os cenários em Português. 'description' em INGLÊS TÉCNICO para máxima fidelidade na geração.`
                    }
                ]
            }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING, description: "Highly precise technical visual description." },
                        productType: { type: Type.STRING },
                        suggestedSceneriesProductOnly: { type: Type.ARRAY, items: { type: Type.STRING } },
                        suggestedSceneriesLifestyle: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["description", "productType", "suggestedSceneriesProductOnly", "suggestedSceneriesLifestyle"]
                }
            }
        });

        const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
        return JSON.parse(text || "{}");
    } catch (e: any) {
        console.error("ANALYSIS_FULL_API_ERROR_OBJECT:", e);
        if (e.message?.includes("404")) {
            console.warn("Model not found. Attempting to list available models...");
            await logAvailableModels(ai);
        }
        throw e;
    }
}

export async function generatePrompts(productDescription: string, options: any, previousPrompts?: string[]): Promise<string[]> {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });

    let taskDescription = `Task: Create a cohesive 3-part commercial video sequence for Sora 2. 3 scenes of 10s each.`;
    if (previousPrompts && previousPrompts.length > 0) {
        taskDescription = `Task: CONTINUE the commercial. Previous: ${previousPrompts.join('\n')}. Generate next 3 scenes.`;
    }

    const promptContext = `Product Description: ${productDescription}\nOptions: ${JSON.stringify(options)}\n${taskDescription}\nOutput only JSON array of 3 English prompts.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [{
                role: 'user',
                parts: [{ text: promptContext }]
            }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });

        const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
        return JSON.parse(text || "[]");
    } catch (e) {
        console.error("Failed to generate prompts", e);
        return [];
    }
}

export async function generateMockup(productDescription: string, options: any, promptIndex: number, imagesBase64?: string[]): Promise<string | null> {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });

    const sequenceTypes = ["Wide Shot", "Action Shot", "Macro Shot", "Alternative", "B-Roll", "Outro"];
    const imagePrompt = `REFERENCE PHOTOS ATTACHED. Produce a mockup IDENTICAL to these photos. 
    Product: ${productDescription}. Scene: ${sequenceTypes[promptIndex] || "Dynamic"}. Env: ${options.environment}. Style: ${options.style}. 8k photorealistic.`;

    const imageParts = (imagesBase64 || []).map(base64 => {
        const data = base64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
        return { inlineData: { data, mimeType: 'image/jpeg' } };
    });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [{
                role: 'user',
                parts: [
                    ...imageParts,
                    { text: imagePrompt }
                ]
            }]
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
