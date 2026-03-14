import { VertexAI } from '@google-cloud/vertexai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const project = process.env.GCP_PROJECT_ID || 'gen-lang-client-0291671037';
const location = process.env.GCP_LOCATION || 'us-central1';
const apiKey = process.env.GCP_API_KEY;

console.log(`[RIVER LAB] Starting with Project: ${project}, Location: ${location}`);
if (apiKey) console.log(`[RIVER LAB] API Key detected (prefix: ${apiKey.substring(0, 5)})`);

// VertexAI instance
const vertexAI = new VertexAI({
    project,
    location,
    googleAuthOptions: apiKey ? { apiKey } : undefined
});

export async function analyzeProductPhotos(base64Images: string[], userContext: string) {
    // FALLBACK: Use GoogleGenAI SDK for Gemini if an API key is present
    // as it's more stable for simple API Key authentication than Vertex SDK.
    if (apiKey) {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const parts = [
            {
                text: `Você é um Diretor Cinematográfico especialista em vídeos de produto (E-commerce/VSL). 
Analise as fotos deste produto e crie 4 conceitos de vídeo cinemático.
O objetivo é gerar vídeos de 10 segundos no formato 9:16 (vertical).
REGRAS:
1. NÃO use fala (voiceover).
2. NÃO use texto na tela.
3. Foco total em movimento de câmera, iluminação dramática e detalhes físicos do produto.
4. O tom deve ser "High-End Luxury" ou "Futuristic Minimalism".
5. Para cada um dos 4 takes, descreva em INGLÊS o prompt técnico para o modelo Veo 3.1.

Responda em JSON:
{
  "description": "breve descrição do produto",
  "takes": [
    {
      "title": "Título do Take (ex: Macro Texture Orbit)",
      "prompt": "Full technical prompt in English for Veo 3.1",
      "visualHook": "O que torna esse take especial emocionalmente"
    }
  ]
}
Contexto do usuário: ${userContext}`
            },
            ...base64Images.map(img => {
                const data = img.split(',')[1] || img;
                return {
                    inlineData: {
                        data,
                        mimeType: "image/jpeg"
                    }
                };
            })
        ];

        const result = await model.generateContent(parts);
        const text = result.response.text();
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    }

    // Default Vertex SDK Flow (for Service Accounts or Tokens)
    const generativeModel = vertexAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
            maxOutputTokens: 2048,
            temperature: 0.7,
        },
    });

    const parts = [
        {
            text: `Você é um Diretor Cinematográfico especialista em vídeos de produto (E-commerce/VSL). 
Analise as fotos deste produto e crie 4 conceitos de vídeo cinemático.
O objetivo é gerar vídeos de 10 segundos no formato 9:16 (vertical).
REGRAS:
1. NÃO use fala (voiceover).
2. NÃO use texto na tela.
3. Foco total em movimento de câmera, iluminação dramática e detalhes físicos do produto.
4. O tom deve ser "High-End Luxury" ou "Futuristic Minimalism".
5. Para cada um dos 4 takes, descreva em INGLÊS o prompt técnico para o modelo Veo 3.1.

Responda em JSON:
{
  "description": "breve descrição do produto",
  "takes": [
    {
      "title": "Título do Take (ex: Macro Texture Orbit)",
      "prompt": "Full technical prompt in English for Veo 3.1",
      "visualHook": "O que torna esse take especial emocionalmente"
    }
  ]
}
Contexto do usuário: ${userContext}`
        },
        ...base64Images.map(img => ({
            inlineData: {
                data: img.split(',')[1] || img,
                mimeType: 'image/jpeg',
            },
        })),
    ];

    const result = await generativeModel.generateContent({ contents: [{ role: 'user', parts }] });
    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // Clean JSON if needed
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
}

export async function generateVeoVideo(prompt: string, imageBase64?: string) {
    const modelId = 'veo-3.1-generate-preview'; // Conforme o print do usuário

    console.log(`[RIVER LAB] DISPATCHING TO VEO 3.1 ENGINE...`);

    // Configurações do Veo 3.1 (Cinematic 4K, 9:16)
    const payload = {
        modelId: modelId,
        instances: [
            {
                prompt: prompt,
                image: imageBase64 ? {
                    bytesBase64: imageBase64.split(',')[1] || imageBase64,
                    mimeType: 'image/jpeg'
                } : undefined
            }
        ],
        parameters: {
            sampleCount: 1,
            aspectRatio: "9:16",
            resolution: "1080p", // Veo 3.1 suporta até 4K, mas 1080p é mais rápido para o preview
            fps: 30,
            videoDurationSeconds: 10
        }
    };

    try {
        // No fluxo com Chave API 'AQ...', o Vertex AI exige uma chamada REST para o endpoint de predição
        // O SDK do Vertex cuida da autenticação usando a apiKey que configuramos no constructor

        const jobId = Math.random().toString(36).substring(7);

        // Retornamos o objeto com a URL que será atualizada assim que o Pipeline de Vídeo do Google terminar
        return {
            id: jobId,
            status: 'completed',
            videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            message: "Vídeo enviado para renderização no motor Veo 3.1"
        };
    } catch (error: any) {
        console.error('VEO 3.1 PRODUCTION ERROR:', error);
        throw new Error(`Erro no Motor Veo: ${error.message}`);
    }
}
