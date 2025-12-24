import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import type { ContentListUnion, PartMediaResolutionLevel } from "@google/genai";


// AI反推图片API


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const imageBase64: string | undefined = body?.imageBase64;
    const systemPrompt: string | undefined = body?.systemPrompt;

    // Use systemPrompt if provided, otherwise fallback to promptText or default
    const promptText: string =
      systemPrompt ||
      body?.promptText ||
      "What is in this image? Describe the main objects and context.";

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return NextResponse.json({ error: "缺少图片数据" }, { status: 400 });
    }

    const apiKey =
      process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY || "";
    if (!apiKey) {
      return NextResponse.json(
        { error: "缺少 Google API Key" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey, apiVersion: "v1alpha" });

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

    const contents: ContentListUnion = [
      {
        role: "user",
        parts: [
          { text: promptText },
          {
            inlineData: {
              mimeType,
              data: pureBase64,
            },
            mediaResolution: {
              level: "MEDIA_RESOLUTION_HIGH" as PartMediaResolutionLevel,
            },
          },
        ],
      },
    ] as const;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
    });

    let text = "";
    const maybeText = (response as { text?: unknown }).text;
    if (typeof maybeText === "string") {
      text = maybeText;
    }
    if (!text) {
      const maybeCandidates = (response as { candidates?: unknown }).candidates;
      if (Array.isArray(maybeCandidates) && maybeCandidates.length > 0) {
        const firstCandidate = maybeCandidates[0] as {
          content?: { parts?: unknown };
        };
        const parts = firstCandidate?.content?.parts;
        if (Array.isArray(parts)) {
          const textPart = parts.find((p) => {
            const t = (p as { text?: unknown }).text;
            return typeof t === "string" && t.length > 0;
          }) as { text?: string } | undefined;
          text = textPart?.text || "";
        }
      }
    }

    if (!text) {
      return NextResponse.json(
        { error: "未收到有效的文本描述" },
        { status: 500 }
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
