import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { text, target = "en" } = await req.json();

        if (!text) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        const apiKey = process.env.GOOGLE_TRANS_API_KEY || process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
        }

        const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                q: text,
                target: target,
                format: "text",
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { error: data.error?.message || "Translation failed" },
                { status: response.status }
            );
        }

        if (data.data?.translations?.[0]?.translatedText) {
            return NextResponse.json({
                translatedText: data.data.translations[0].translatedText,
            });
        }

        return NextResponse.json(
            { error: "No translation returned" },
            { status: 500 }
        );

    } catch (error) {
        console.error("Translation error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
