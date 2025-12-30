import { NextRequest, NextResponse } from "next/server";
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

// Doubao (Volcengine) Text Generation API
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { text, systemInstruction } = body;

        if (!text) {
            return NextResponse.json({ error: "缺少文本内容" }, { status: 400 });
        }

        const doubaoKey = process.env.DOUBAO_API_KEY || "";
        if (!doubaoKey) {
            return NextResponse.json(
                { error: "缺少 豆包 API Key，请在后端环境变量中配置。" },
                { status: 500 }
            );
        }

        const doubaoModel = process.env.DOUBAO_MODEL || "doubao-pro-4k";
        const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
        const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

        // Doubao API Endpoint (Ark)
        const url = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

        const messages = [];
        if (systemInstruction) {
            messages.push({ role: "system", content: systemInstruction });
        }
        messages.push({ role: "user", content: text });

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${doubaoKey}`
            },
            body: JSON.stringify({
                model: doubaoModel,
                messages: messages,
            }),
            agent: agent
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Doubao Text API Error:", response.status, errorText);
            throw new Error(`豆包 API 调用失败: ${response.status}`);
        }

        interface ArkResponse {
            choices: Array<{
                message: {
                    content: string;
                };
            }>;
        }

        const data = await response.json() as ArkResponse;
        const optimizedText = data.choices?.[0]?.message?.content || "";

        if (!optimizedText) {
            return NextResponse.json(
                { error: "未收到有效的优化结果" },
                { status: 500 }
            );
        }

        return NextResponse.json({ optimizedText });

    } catch (error) {
        console.error("Doubao Text Route Error:", error);
        const message = error instanceof Error ? error.message : "未知错误";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
