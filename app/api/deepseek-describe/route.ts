import { NextRequest, NextResponse } from "next/server";
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

// DeepSeek (OpenAI Compatible) Image Description API
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const imageBase64: string | undefined = body?.imageBase64;
        const systemPrompt: string | undefined = body?.systemPrompt;
        const apiKey: string | undefined = body?.apiKey; // Optional: passed from client if not env

        // Use systemPrompt if provided, otherwise fallback to default
        const promptText: string =
            systemPrompt ||
            "What is in this image? Describe the main objects and context.";

        if (!imageBase64 || typeof imageBase64 !== "string") {
            return NextResponse.json({ error: "Missing image data" }, { status: 400 });
        }

        // Prioritize API key from body (settings), then env
        const deepseekKey = apiKey || process.env.DEEPSEEK_API_KEY || "";
        if (!deepseekKey) {
            return NextResponse.json(
                { error: "Missing DeepSeek API Key. Please configure it in Settings." },
                { status: 401 }
            );
        }

        let mimeType = "image/jpeg";
        let pureBase64 = imageBase64;

        if (imageBase64.includes(";base64,")) {
            const parts = imageBase64.split(";base64,");
            pureBase64 = parts[1];
            const mimePart = parts[0].split(":");
            if (mimePart.length > 1) {
                mimeType = mimePart[1];
            }
        }

        const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
        const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

        // DeepSeek API Endpoint
        const url = "https://api.deepseek.com/chat/completions";

        // Construct OpenAI-compatible vision payload
        // Note: Standard deepseek-chat might not support images yet, but this is the standard vision format.
        const messages = [
            {
                role: "user",
                content: [
                    { type: "text", text: promptText },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:${mimeType};base64,${pureBase64}`
                        }
                    }
                ]
            }
        ];

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${deepseekKey}`
            },
            body: JSON.stringify({
                model: "deepseek-chat", // Or user's preferred model if configurable
                messages: messages,
                temperature: 0.7,
                max_tokens: 1024
            }),
            agent: agent
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("DeepSeek API Error:", response.status, errorText);

            // Handle specific DeepSeek errors or format discrepancies
            if (response.status === 400 && errorText.includes("image")) {
                throw new Error("DeepSeek API currently does not support image input (Vision) via this endpoint.");
            }

            throw new Error(`DeepSeek API Failed: ${response.status} - ${errorText}`);
        }

        interface OpenAIResponse {
            choices: Array<{
                message: {
                    content: string;
                };
            }>;
        }

        const data = await response.json() as OpenAIResponse;
        const text = data.choices?.[0]?.message?.content || "";

        if (!text) {
            return NextResponse.json(
                { error: "No description text received from DeepSeek" },
                { status: 500 }
            );
        }

        return NextResponse.json({ text });

    } catch (error) {
        console.error("DeepSeek Describe Route Error:", error);
        const message = error instanceof Error ? error.message : "Unknown Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
