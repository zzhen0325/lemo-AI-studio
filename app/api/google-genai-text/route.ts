import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { text, systemInstruction } = body;

        if (!text) {
            return NextResponse.json({ error: "缺少文本内容" }, { status: 400 });
        }

        const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY || "";
        if (!apiKey) {
            return NextResponse.json({ error: "缺少 Google API Key" }, { status: 500 });
        }

        const ai = new GoogleGenAI({ apiKey });
        // 使用 gemini-1.5-flash 模型以获得更快的响应速度，适合提示词优化
        const model = "gemini-3-flash-preview";

        const result = await ai.models.generateContent({
            model: model,
            contents: [{
                role: "user",
                parts: [
                    { text: systemInstruction || "" },
                    { text: text }
                ]
            }]
        });
        const resultObj = result as any;
        let optimizedText = "";

        if (resultObj.response && typeof resultObj.response.text === 'function') {
            optimizedText = resultObj.response.text();
        } else {
            // 备选方案，手动遍历 parts
            const candidate = resultObj.candidates?.[0];
            const parts = candidate?.content?.parts;
            if (Array.isArray(parts)) {
                optimizedText = parts
                    .map((p: any) => p.text || "")
                    .join("");
            }
        }

        if (!optimizedText) {
            return NextResponse.json({ error: "未收到有效的优化结果" }, { status: 500 });
        }

        return NextResponse.json({ optimizedText });
    } catch (error) {
        console.error("Google GenAI Text Error:", error);
        const message = error instanceof Error ? error.message : "未知错误";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
