import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const DATASET_DIR = path.join(process.cwd(), 'public/dataset');

// Helper to ensure directory exists
async function ensureDir(dirPath: string) {
    try {
        await fs.access(dirPath);
    } catch {
        await fs.mkdir(dirPath, { recursive: true });
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const collectionName = searchParams.get('collection');

    try {
        await ensureDir(DATASET_DIR);

        if (collectionName) {
            // List images in a specific collection
            const collectionPath = path.join(DATASET_DIR, collectionName);
            try {
                await fs.access(collectionPath);
            } catch {
                return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
            }

            const files = await fs.readdir(collectionPath);

            // Filter image files
            const imageFiles = files.filter(file => /\.(jpg|jpeg|png|webp|gif)$/i.test(file));

            // Read prompts from corresponding .txt files
            const images = await Promise.all(imageFiles.map(async (file) => {
                const nameWithoutExt = file.replace(/\.[^/.]+$/, "");
                const txtFile = `${nameWithoutExt}.txt`;
                let prompt = "";

                try {
                    const txtContent = await fs.readFile(path.join(collectionPath, txtFile), 'utf-8');
                    prompt = txtContent.trim();
                } catch {
                    // No prompt file found, ignore
                }

                return {
                    id: file, // Use filename as ID for simplicity
                    filename: file,
                    url: `/dataset/${collectionName}/${file}`,
                    prompt
                };
            }));

            return NextResponse.json({ images });

        } else {
            // List all collections (subdirectories)
            const items = await fs.readdir(DATASET_DIR, { withFileTypes: true });
            const collections = [];

            for (const item of items) {
                if (item.isDirectory()) {
                    const dirPath = path.join(DATASET_DIR, item.name);
                    const files = await fs.readdir(dirPath);
                    const imageCount = files.filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f)).length;

                    // Get first 4 images for preview
                    const previews = files
                        .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
                        .slice(0, 4)
                        .map(f => `/dataset/${item.name}/${f}`);

                    collections.push({
                        id: item.name,
                        name: item.name,
                        imageCount,
                        previews
                    });
                }
            }

            return NextResponse.json({ collections });
        }
    } catch (error) {
        console.error('Dataset API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: String(error) }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const collectionName = formData.get('collection') as string;
        const isText = formData.get('isText') === 'true'; // Flag for uploading pure text/prompt file directly?
        // Actually the prompt is usually associated with an image name.
        // Let's stick to the plan: explicit upload.

        if (!file || !collectionName) {
            return NextResponse.json({ error: 'File and collection name are required' }, { status: 400 });
        }

        const collectionPath = path.join(DATASET_DIR, collectionName);
        await ensureDir(collectionPath);

        const buffer = Buffer.from(await file.arrayBuffer());
        // Safe filename
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = path.join(collectionPath, safeName);

        await fs.writeFile(filePath, buffer);

        return NextResponse.json({ success: true, path: `/dataset/${collectionName}/${safeName}` });

    } catch (error) {
        console.error('Dataset Upload Error:', error);
        return NextResponse.json({ error: 'Upload Failed', details: String(error) }, { status: 500 });
    }
}
