import { NextRequest, NextResponse } from "next/server";
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

// Doubao (Volcengine) Image Description API
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const imageBase64: string | undefined = body?.imageBase64;
        const systemPrompt: string | undefined = body?.systemPrompt;

        // Credentials passed from client settings
        const apiKey: string | undefined = body?.apiKey;
        const model: string | undefined = body?.model; // specific endpoint/model ID

        // Use systemPrompt if provided, otherwise fallback to default
        const promptText: string =
            systemPrompt ||
            "What is in this image? Describe the main objects and context.";

        if (!imageBase64 || typeof imageBase64 !== "string") {
            return NextResponse.json({ error: "Missing image data" }, { status: 400 });
        }

        // Prioritize API key from body, then env
        const doubaoKey = apiKey || process.env.DOUBAO_API_KEY || "";
        if (!doubaoKey) {
            return NextResponse.json(
                { error: "Missing Doubao API Key. Please configure it in Settings." },
                { status: 401 }
            );
        }

        // Doubao requires specific model/endpoint ID
        const doubaoModel = model || process.env.DOUBAO_MODEL || "doubao-seed-1-6-251015";

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

        // Doubao API Endpoint (Ark)
        const url = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

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
                'Authorization': `Bearer ${doubaoKey}`
            },
            body: JSON.stringify({
                model: doubaoModel,
                messages: messages,
                max_completion_tokens: 65535,
                reasoning_effort: "medium"
            }),
            agent: agent
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Doubao API Error:", response.status, errorText);
            throw new Error(`Doubao API Failed: ${response.status} - ${errorText}`);
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
                { error: "No description text received from Doubao" },
                { status: 500 }
            );
        }

        return NextResponse.json({ text });

    } catch (error) {
        console.error("Doubao Describe Route Error:", error);
        const message = error instanceof Error ? error.message : "Unknown Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
