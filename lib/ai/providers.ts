import {
    TextProvider,
    VisionProvider,
    ImageProvider,
    TextGenerationInput,
    VisionGenerationInput,
    ImageGenerationInput,
    TextResult,
    ImageResult,
    ModelConfig
} from './types';
import { GoogleGenAI, Part } from "@google/genai";
import { generateNonce, generateSign, generateTimestamp, getProxyAgent } from './utils';
import { RequestInit } from "node-fetch";

export class OpenAICompatibleProvider implements TextProvider {
    private config: ModelConfig;

    constructor(config: ModelConfig) {
        this.config = config;
    }

    async generateText(params: TextGenerationInput): Promise<TextResult> {
        const { input, systemPrompt, options } = params;

        const messages: { role: string; content: string }[] = [];
        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }
        messages.push({ role: 'user', content: input });

        const body = {
            model: this.config.modelId,
            messages: messages,
            temperature: options?.temperature,
            max_tokens: options?.maxTokens,
            top_p: options?.topP,
            stream: options?.stream || false
        };

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
        };

        const agent = getProxyAgent();
        const fetchOptions: RequestInit = {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        };

        if (agent) {
            // @ts-expect-error - node-fetch RequestInit might not have agent in all type definitions
            fetchOptions.agent = agent;
        }

        const response = await fetch(`${this.config.baseURL}/chat/completions`, fetchOptions);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Provider API Error: ${response.status} - ${errorText}`);
        }

        if (options?.stream) {
            // TODO: Implement standardized stream handling
            // For now fallback to text json
            throw new Error("Stream not fully implemented in adapter yet");
        }

        const data = await response.json() as { choices?: { message?: { content?: string } }[] };
        const text = data.choices?.[0]?.message?.content || "";

        return { text };
    }
}

export class GoogleGenAIProvider implements TextProvider, VisionProvider, ImageProvider {
    private client: GoogleGenAI;
    private modelId: string;

    constructor(config: ModelConfig) {
        console.log(`[GoogleGenAIProvider] Initializing with model: ${config.modelId}, hasApiKey: ${!!config.apiKey}, API Version: v1`);

        this.client = new GoogleGenAI(config.apiKey!);
        this.modelId = config.modelId;
    }

    async generateText(params: TextGenerationInput): Promise<TextResult> {
        const { input, systemPrompt } = params;

        const contents = [];
        if (systemPrompt) {
            contents.push({ role: "user", parts: [{ text: systemPrompt }, { text: input }] });
        } else {
            contents.push({ role: "user", parts: [{ text: input }] });
        }

        try {
            const model = this.client.getGenerativeModel({ model: this.modelId });
            const result = await model.generateContent({
                contents: contents
            });

            const text = result.response.text();
            return { text };
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            throw new Error(`Google GenAI Error: ${msg}`);
        }
    }

    async describeImage(params: VisionGenerationInput): Promise<TextResult> {
        const { image, prompt, systemPrompt } = params;

        let base64Data = image;
        let mimeType = "image/png";

        if (image.startsWith("data:")) {
            const matches = image.match(/^data:(.+);base64,(.+)$/);
            if (matches) {
                mimeType = matches[1];
                base64Data = matches[2];
            }
        }

        const parts: Part[] = [
            { inlineData: { mimeType, data: base64Data } }
        ];

        if (systemPrompt) parts.push({ text: systemPrompt });
        if (prompt) parts.push({ text: prompt });

        try {
            const model = this.client.getGenerativeModel({ model: this.modelId });
            const result = await model.generateContent({
                contents: [{ role: "user", parts }]
            });

            const text = result.response.text();
            return { text };
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            throw new Error(`Google GenAI Vision Error: ${msg}`);
        }
    }

    async generateImage(params: ImageGenerationInput): Promise<ImageResult> {
        const { prompt, aspectRatio, imageSize, image } = params;
        const parts: Part[] = [];

        if (image || (params.images && params.images.length > 0)) {
            const imageList = image ? [image] : (params.images || []);
            for (const img of imageList) {
                let base64Data = img;
                if (img.startsWith("data:")) {
                    base64Data = img.split(',')[1];
                }
                parts.push({
                    inlineData: {
                        mimeType: "image/png",
                        data: base64Data,
                    },
                });
            }
        }

        parts.push({ text: prompt });

        const configParams: Record<string, unknown> = {
            responseModalities: ["IMAGE"],
        };

        if (aspectRatio || imageSize) {
            configParams.imageConfig = {
                ...(aspectRatio ? { aspectRatio } : {}),
                ...(imageSize ? { imageSize } : {})
            };
        }

        try {
            const model = this.client.getGenerativeModel({ model: "gemini-3-pro-image-preview" });
            const result = await model.generateContent({
                contents: [{ role: "user", parts }],
                // @ts-expect-error - imageConfig might not be in standard GenerateConfig type yet
                generationConfig: configParams
            });

            const candidate = result.response.candidates?.[0];
            const resParts = candidate?.content?.parts;

            if (!resParts) throw new Error("No image data returned from Google GenAI");

            for (const part of resParts) {
                if (part.inlineData && part.inlineData.data) {
                    const dataUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                    return { images: [dataUrl] };
                }
            }
            throw new Error("No image data found in response parts");
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            throw new Error(`Google GenAI Image Gen Error: ${msg}`);
        }
    }
}

/**
 * Bytedance Standard Image Generation API (Seed4 / ByteArtist)
 */
export class BytedanceAfrProvider implements ImageProvider {
    private config: ModelConfig;

    constructor(config: ModelConfig) {
        this.config = config;
    }

    async generateImage(params: ImageGenerationInput): Promise<ImageResult> {
        const { prompt, width, height, batchSize, options } = params;

        const API_CONFIG = {
            BASE_URL: 'https://effect.bytedance.net/media/api/pic/afr',
            AID: process.env.BYTEDANCE_AID || '6834',
            APP_KEY: process.env.BYTEDANCE_APP_KEY || 'a89de09e9bca4723943e8830a642464d',
            APP_SECRET: process.env.BYTEDANCE_APP_SECRET || '8505d553a24c485fb7d9bb336a3651a8',
        };

        const nonce = generateNonce();
        const timestamp = generateTimestamp();
        const sign = generateSign(nonce, timestamp, API_CONFIG.APP_SECRET);

        const queryParams = new URLSearchParams({
            aid: API_CONFIG.AID,
            app_key: API_CONFIG.APP_KEY,
            timestamp,
            nonce,
            sign
        });

        const url = `${API_CONFIG.BASE_URL}?${queryParams.toString()}`;

        const conf = {
            width: width || 1024,
            height: height || 1024,
            batch_size: batchSize || 1,
            seed: options?.seed || Math.floor(Math.random() * 2147483647),
            prompt: prompt,
        };

        const formData = new URLSearchParams();
        formData.append('conf', JSON.stringify(conf));
        formData.append('algorithms', this.config.modelId); // Use modelId as the algorithm name
        formData.append('img_return_format', 'png');

        const agent = getProxyAgent();
        const fetchOptions: RequestInit = {
            method: 'POST',
            headers: {
                'get-svc': '1',
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'ByteArtist-Client/1.0'
            },
            body: formData.toString()
        };

        if (agent) {
            // @ts-expect-error - node-fetch RequestInit might not have agent in all type definitions
            fetchOptions.agent = agent;
        }

        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ByteArtist API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const success = data.success || data.message === 'success' || data.data?.algo_status_code === 0;

        if (!success) {
            throw new Error(`ByteArtist Generation Failed: ${data.message || data.algo_status_message}`);
        }

        const afr_data = (data.data?.data?.afr_data ?? data.data?.afr_data ?? []) as { pic: string }[];
        const images = afr_data.map((item) => {
            return item.pic.startsWith('http') ? item.pic : `data:image/png;base64,${item.pic}`;
        });

        return { images, metadata: data as Record<string, unknown> };
    }
}
