import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/ai/modelRegistry";
import { getSystemPrompt } from "@/config/system-prompts";
import { TextProvider, TextGenerationInput } from "@/lib/ai/types";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            input,
            model,
            profileId,
            systemPrompt: explicitSystemPrompt,
            options
        } = body;

        if (!input) {
            return NextResponse.json({ error: "Missing input text" }, { status: 400 });
        }

        if (!model) {
            return NextResponse.json({ error: "Missing model ID" }, { status: 400 });
        }

        // 1. Get Provider instance
        // We pass empty config override for now, can be extended if Client sends specific overrides
        const providerInstance = getProvider(model);

        // 2. Resolve System Prompt
        // Priority: Explicit > Profile > Default (empty)
        let resolvedSystemPrompt = explicitSystemPrompt;

        if (!resolvedSystemPrompt && profileId) {
            // We need to know the providerId to pick the right override from profile
            // Use a temporary way to guess or extract providerId from the instance or modelId
            // The instance doesn't easily expose ID unless we cast, or we just look up the registry again.
            // Simplified: The 'getProvider' logic already determined the provider.
            // We'll pass the 'provider' input from body if available, or derive from modelId

            // Re-deriving providerId for prompt resolution logic
            let providerIdForPrompt = 'unknown';
            if (model.includes('doubao')) providerIdForPrompt = 'doubao';
            else if (model.includes('deepseek')) providerIdForPrompt = 'deepseek';
            else if (model.includes('gemini')) providerIdForPrompt = 'doubao'; // wait, gemini->google.
            else if (model.includes('gemini')) providerIdForPrompt = 'google'; // Corrected gemini to google
            else if (model.includes('google')) providerIdForPrompt = 'google';

            resolvedSystemPrompt = getSystemPrompt(profileId, providerIdForPrompt);
        }

        const params: TextGenerationInput = {
            input,
            systemPrompt: resolvedSystemPrompt,
            options
        };

        if (!('generateText' in providerInstance)) {
            return NextResponse.json({ error: `Model ${model} does not support text generation` }, { status: 400 });
        }

        const result = await (providerInstance as TextProvider).generateText(params);

        // 4. Return
        if (result.stream) {
            // TODO: Stream support
            return new NextResponse(result.stream, {
                headers: { 'Content-Type': 'text/event-stream' }
            });
        } else {
            return NextResponse.json({ text: result.text });
        }

    } catch (error: unknown) {
        console.error("Unified Text API Error:", error);
        const msg = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json(
            { error: msg },
            { status: 500 }
        );
    }
}
