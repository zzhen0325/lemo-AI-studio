import { ProviderOptions } from './types';

export interface ClientGenerationParams {
    model: string; // e.g. doubao-pro-4k
    input: string;
    profileId?: string;
    systemPrompt?: string;
    provider?: string; // Optional, usually inferred from model
    options?: {
        temperature?: number;
        maxTokens?: number;
        topP?: number;
        stream?: boolean;
    };
}

export interface ClientDescribeParams {
    model: string;
    image: string; // Base64 or URL
    input?: string; // Optional prompt along with image
    profileId?: string;
    systemPrompt?: string;
    options?: ProviderOptions;
}

export interface ClientImageParams {
    model: string;
    prompt: string;
    width?: number;
    height?: number;
    batchSize?: number;
    aspectRatio?: string;
    image?: string; // for i2i
    images?: string[]; // Multiple images support
    options?: ProviderOptions & {
        seed?: number;
        steps?: number;
        cfgScale?: number;
        sampler?: string;
        scheduler?: string;
    };
}

export async function generateText(params: ClientGenerationParams): Promise<{ text: string }> {
    const response = await fetch('/api/ai/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
    });

    if (!response.ok) {
        let errorMsg = response.statusText;
        try {
            const err = await response.json();
            errorMsg = err.error || errorMsg;
        } catch { }
        throw new Error(errorMsg);
    }

    return await response.json();
}

export async function describeImage(params: ClientDescribeParams): Promise<{ text: string }> {
    const response = await fetch('/api/ai/describe', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
    });

    if (!response.ok) {
        let errorMsg = response.statusText;
        try {
            const err = await response.json();
            errorMsg = err.error || errorMsg;
        } catch { }
        throw new Error(errorMsg);
    }

    return await response.json();
}

export async function generateImage(params: ClientImageParams): Promise<{ images: string[]; metadata?: Record<string, unknown> }> {
    const response = await fetch('/api/ai/image', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
    });

    if (!response.ok) {
        let errorMsg = response.statusText;
        try {
            const err = await response.json();
            errorMsg = err.error || errorMsg;
        } catch { }
        throw new Error(errorMsg);
    }

    return await response.json();
}
