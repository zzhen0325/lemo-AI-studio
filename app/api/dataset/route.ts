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

// Helper to get collection metadata
async function getMetadata(collectionPath: string): Promise<{ prompts: Record<string, string>, systemPrompt: string }> {
    const metaPath = path.join(collectionPath, 'metadata.json');
    try {
        const content = await fs.readFile(metaPath, 'utf-8');
        const data = JSON.parse(content);
        return {
            prompts: data.prompts || {},
            systemPrompt: data.systemPrompt || ""
        };
    } catch {
        return { prompts: {}, systemPrompt: "" };
    }
}

// Helper to save collection metadata
async function saveMetadata(collectionPath: string, data: { prompts: Record<string, string> }) {
    const metaPath = path.join(collectionPath, 'metadata.json');
    await fs.writeFile(metaPath, JSON.stringify(data, null, 2), 'utf-8');
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
            const metadata = await getMetadata(collectionPath);

            // Filter image files
            const imageFiles = files.filter(file => /\.(jpg|jpeg|png|webp|gif)$/i.test(file));

            const images = await Promise.all(imageFiles.map(async (file) => {
                let prompt = metadata.prompts[file] || "";

                // Backward compatibility: check for .txt file if not in metadata
                if (!prompt) {
                    const nameWithoutExt = file.replace(/\.[^/.]+$/, "");
                    const txtFile = `${nameWithoutExt}.txt`;
                    try {
                        const txtContent = await fs.readFile(path.join(collectionPath, txtFile), 'utf-8');
                        prompt = txtContent.trim();
                        // Optional: Migrate to metadata if found
                        if (prompt) {
                            metadata.prompts[file] = prompt;
                        }
                    } catch {
                        // No prompt found
                    }
                }

                return {
                    id: file,
                    filename: file,
                    url: `/dataset/${collectionName}/${file}`,
                    prompt
                };
            }));

            // If we migrated any prompts, save it back to metadata.json
            // Check if metadata.prompts has new entries or if it was empty and now has entries
            // A simple check for length > 0 might not be enough if it was already populated.
            // A more robust check would be to compare before and after, but for this context,
            // if any prompt was potentially migrated, we save.
            // The instruction implies saving if there are any prompts, which is covered by the initial check.
            if (Object.keys(metadata.prompts).length > 0) {
                await saveMetadata(collectionPath, metadata);
            }

            return NextResponse.json({
                images,
                systemPrompt: metadata.systemPrompt || ""
            });

        } else {
            // List all collections (subdirectories)
            const items = await fs.readdir(DATASET_DIR, { withFileTypes: true });
            const collections = [];

            for (const item of items) {
                if (item.isDirectory()) {
                    const dirPath = path.join(DATASET_DIR, item.name);
                    const files = await fs.readdir(dirPath);
                    const imageCount = files.filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f)).length;

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

        if (!collectionName) {
            return NextResponse.json({ error: 'Collection name is required' }, { status: 400 });
        }

        const collectionPath = path.join(DATASET_DIR, collectionName);
        await ensureDir(collectionPath);

        if (!file) {
            return NextResponse.json({ success: true, message: 'Collection created', collectionPath });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = path.join(collectionPath, safeName);

        await fs.writeFile(filePath, buffer);

        return NextResponse.json({ success: true, path: `/dataset/${collectionName}/${safeName}` });
    } catch (error) {
        console.error('Dataset Upload Error:', error);
        return NextResponse.json({ error: 'Upload Failed', details: String(error) }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const collectionName = searchParams.get('collection');
        const filename = searchParams.get('filename');

        if (!collectionName || !filename) {
            return NextResponse.json({ error: 'Collection and filename are required' }, { status: 400 });
        }

        const collectionPath = path.join(DATASET_DIR, collectionName);
        const filePath = path.join(collectionPath, filename);

        // Delete image
        try {
            await fs.unlink(filePath);
        } catch (e) {
            console.warn(`Could not delete image file: ${filePath}`, e);
        }

        // Update metadata.json
        try {
            const metadata = await getMetadata(collectionPath);
            if (metadata.prompts[filename]) {
                delete metadata.prompts[filename];
                await saveMetadata(collectionPath, metadata);
            }
        } catch (e) {
            console.error("Failed to update metadata on delete", e);
        }

        return NextResponse.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
        console.error('Dataset Delete Error:', error);
        return NextResponse.json({ error: 'Delete Failed', details: String(error) }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { collection, filename, prompt, systemPrompt } = body;

        if (!collection) {
            return NextResponse.json({ error: 'Collection name is required' }, { status: 400 });
        }

        const collectionPath = path.join(DATASET_DIR, collection);
        await ensureDir(collectionPath);

        const metadata = await getMetadata(collectionPath);

        if (filename) {
            // Update individual image prompt
            metadata.prompts[filename] = prompt;
        }

        if (body.prompts) {
            // Batch update prompts
            Object.assign(metadata.prompts, body.prompts);
        }

        if (systemPrompt !== undefined) {
            // Update collection system prompt
            metadata.systemPrompt = systemPrompt;
        }

        if (body.newCollectionName && body.newCollectionName !== collection) {
            // Rename collection
            const newCollectionPath = path.join(DATASET_DIR, body.newCollectionName);
            try {
                // Check if target name already exists
                await fs.access(newCollectionPath);
                return NextResponse.json({ error: 'Collection with this name already exists' }, { status: 409 });
            } catch {
                // Rename directory
                await fs.rename(collectionPath, newCollectionPath);
                // Since we renamed, we should use the new path for saving metadata if we were to continue, 
                // but usually renaming is a standalone or final operation in this flow.
                // However, we also updated metadata object in memory. We should save it to the NEW path.
                await saveMetadata(newCollectionPath, metadata);

                return NextResponse.json({
                    success: true,
                    message: 'Collection renamed and metadata updated',
                    newCollectionName: body.newCollectionName
                });
            }
        }

        await saveMetadata(collectionPath, metadata);

        return NextResponse.json({ success: true, message: 'Metadata updated' });
    } catch (error) {
        console.error('Dataset Update Error:', error);
        return NextResponse.json({ error: 'Update Failed', details: String(error) }, { status: 500 });
    }
}
