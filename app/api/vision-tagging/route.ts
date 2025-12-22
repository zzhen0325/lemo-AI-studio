import { NextRequest, NextResponse } from "next/server";
import { ImageAnnotatorClient } from "@google-cloud/vision";

// Initializing the client. 
// Note: In a production environment, you'd want to use service account credentials or ADC.
// For this studio mock, we assume the environment is set up or using an API Key via ADC.
const client = new ImageAnnotatorClient();

export async function POST(req: NextRequest) {
    try {
        const { imageBase64 } = await req.json();

        if (!imageBase64) {
            return NextResponse.json({ error: "Missing image data" }, { status: 400 });
        }

        // Remove the data area if present
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

        const [result] = await client.annotateImage({
            image: { content: base64Data },
            features: [
                { type: "LABEL_DETECTION", maxResults: 10 },
                { type: "IMAGE_PROPERTIES" },
                { type: "WEB_DETECTION" }, // Useful for finding descriptive names
            ],
        });

        const labels = result.labelAnnotations?.map(label => label.description) || [];
        const webEntities = result.webDetection?.webEntities?.map(entity => entity.description) || [];

        // Combine labels and web entities for a rich prompt
        const uniqueTags = Array.from(new Set([...labels, ...webEntities])).slice(0, 15);
        const generatedPrompt = uniqueTags.join(", ");

        return NextResponse.json({ prompt: generatedPrompt });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to tag image";
        console.error("Vision API Error:", error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
