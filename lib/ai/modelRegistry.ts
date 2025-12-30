import { TextProvider, VisionProvider, ImageProvider, ModelConfig } from './types';
import { OpenAICompatibleProvider, GoogleGenAIProvider, BytedanceAfrProvider } from './providers';
import { REGISTRY } from './registry';

export function getProvider(modelId: string, overrideConfig?: Partial<ModelConfig>): TextProvider | VisionProvider | ImageProvider {
    // 1. Find registry entry
    // We support wildcard matching if needed, but for now exact match or fallback
    let entry = REGISTRY.find(r => r.id === modelId);

    // Default fallback logic? or strict?
    if (!entry) {
        // Fallback: Check if it looks like a doubao model
        if (modelId.startsWith('doubao-')) {
            entry = REGISTRY.find(r => r.id === 'doubao-pro-4k');
            if (entry) {
                // Return a copy with modified modelId
                const config = { ...entry.defaultConfig, modelId, ...overrideConfig };
                return new OpenAICompatibleProvider(config);
            }
        }
        // Fallback for Gemini
        if (modelId.startsWith('gemini-')) {
            entry = REGISTRY.find(r => r.providerType === 'google-genai');
            if (entry) {
                const config = { ...entry.defaultConfig, modelId, ...overrideConfig };
                return new GoogleGenAIProvider(config);
            }
        }

        throw new Error(`Model ${modelId} not found in registry`);
    }

    const config = { ...entry.defaultConfig, ...overrideConfig };

    if (entry.providerType !== 'bytedance-afr' && !config.apiKey) {
        throw new Error(`Missing API Key for model ${modelId} (Provider: ${entry.providerType})`);
    }

    if (entry.providerType === 'google-genai') {
        return new GoogleGenAIProvider(config);
    } else if (entry.providerType === 'bytedance-afr') {
        return new BytedanceAfrProvider(config);
    } else {
        return new OpenAICompatibleProvider(config);
    }
}
