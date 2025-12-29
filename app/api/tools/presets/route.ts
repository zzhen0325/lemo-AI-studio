import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const TOOLS_PRESET_DIR = path.join(process.cwd(), 'public/tools');

async function ensureDir(dirPath: string) {
    try {
        await fs.access(dirPath);
    } catch {
        await fs.mkdir(dirPath, { recursive: true });
    }
}

// GET: List presets for a tool
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const toolId = searchParams.get('toolId');

    if (!toolId) {
        return NextResponse.json({ error: 'Missing toolId' }, { status: 400 });
    }

    const toolDir = path.join(TOOLS_PRESET_DIR, toolId);
    await ensureDir(toolDir);

    try {
        const files = await fs.readdir(toolDir);
        const jsonFiles = files.filter(f => f.endsWith('.json'));

        const presets = [];
        for (const file of jsonFiles) {
            try {
                const filePath = path.join(toolDir, file);
                const content = await fs.readFile(filePath, 'utf-8');
                presets.push(JSON.parse(content));
            } catch (e) {
                console.error(`Failed to parse preset ${file}`, e);
            }
        }

        // Sort by timestamp descending
        presets.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        return NextResponse.json(presets);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch presets' }, { status: 500 });
    }
}

// POST: Save a preset with thumbnail
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const toolId = formData.get('toolId') as string;
        const name = formData.get('name') as string;
        const valuesStr = formData.get('values') as string;
        const screenshot = formData.get('screenshot') as File | null;

        if (!toolId || !name || !valuesStr) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const toolDir = path.join(TOOLS_PRESET_DIR, toolId);
        await ensureDir(toolDir);

        const id = uuidv4();
        const timestamp = Date.now();
        const values = JSON.parse(valuesStr);

        let thumbnailPath = '';

        // Handle screenshot upload
        if (screenshot) {
            const buffer = Buffer.from(await screenshot.arrayBuffer());
            const fileName = `${id}.png`;
            const filePath = path.join(toolDir, fileName);
            await fs.writeFile(filePath, buffer);
            thumbnailPath = `/tools/${toolId}/${fileName}`;
        }

        const preset = {
            id,
            name,
            values,
            thumbnail: thumbnailPath,
            timestamp
        };

        const jsonPath = path.join(toolDir, `${id}.json`);
        await fs.writeFile(jsonPath, JSON.stringify(preset, null, 2));

        return NextResponse.json(preset);
    } catch (error) {
        console.error('Save tool preset error:', error);
        return NextResponse.json({ error: 'Failed to save preset' }, { status: 500 });
    }
}

// DELETE: Remove a preset
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const toolId = searchParams.get('toolId');

        if (!id || !toolId) {
            return NextResponse.json({ error: 'Missing id or toolId' }, { status: 400 });
        }

        const toolDir = path.join(TOOLS_PRESET_DIR, toolId);
        const jsonPath = path.join(toolDir, `${id}.json`);

        // Try to delete thumbnail if recorded
        try {
            const content = await fs.readFile(jsonPath, 'utf-8');
            const preset = JSON.parse(content);
            if (preset.thumbnail) {
                const thumbName = path.basename(preset.thumbnail);
                const thumbPath = path.join(toolDir, thumbName);
                await fs.unlink(thumbPath).catch(() => { });
            }
        } catch { }

        await fs.unlink(jsonPath);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete preset' }, { status: 500 });
    }
}
