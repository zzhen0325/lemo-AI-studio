import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const OUTPUTS_DIR = path.join(process.cwd(), 'public', 'outputs');
const HISTORY_FILE = path.join(OUTPUTS_DIR, 'history.json');
const BACKUP_FILE = path.join(OUTPUTS_DIR, 'history.bak.json');
const OLD_FILE = path.join(OUTPUTS_DIR, 'history.old.json');

export interface HistoryItem {
    imageUrl: string;
    prompt: string;
    timestamp: string;
}

// Helper to ensure outputs directory exists
async function ensureOutputsDir() {
    try {
        await fs.access(OUTPUTS_DIR);
    } catch {
        await fs.mkdir(OUTPUTS_DIR, { recursive: true });
    }
}

// Robust helper to read history from multiple possible sources
async function readHistory() {
    const filesToTry = [HISTORY_FILE, OLD_FILE, BACKUP_FILE];

    for (const file of filesToTry) {
        try {
            await fs.access(file);
            const content = await fs.readFile(file, 'utf-8');
            const data = JSON.parse(content);
            if (Array.isArray(data)) return data;
        } catch {
            // console.warn(`Failed to read history from ${path.basename(file)}`);
        }
    }
    return null;
}

// Atomic write helper with backup
async function saveHistory(history: HistoryItem[]) {
    const tmpFile = `${HISTORY_FILE}.tmp`;
    const content = JSON.stringify(history, null, 2);

    try {
        // 1. 先写入临时文件
        await fs.writeFile(tmpFile, content, 'utf-8');

        // 2. 如果原文件存在，将其备份为 old
        try {
            await fs.access(HISTORY_FILE);
            await fs.copyFile(HISTORY_FILE, OLD_FILE);
        } catch { /* ignore if not exists */ }

        // 3. 将 tmp 重命名为正式文件 (原子操作)
        await fs.rename(tmpFile, HISTORY_FILE);

        // 4. 定期备份 (如果记录数是 50 的倍数，或者 bak 不存在)
        if (history.length % 50 === 0) {
            await fs.copyFile(HISTORY_FILE, BACKUP_FILE);
        } else {
            try {
                await fs.access(BACKUP_FILE);
            } catch {
                await fs.copyFile(HISTORY_FILE, BACKUP_FILE);
            }
        }

        return true;
    } catch (e) {
        console.error("Atomic save failed:", e);
        // 清理临时文件
        try { await fs.unlink(tmpFile); } catch { }
        return false;
    }
}

// Helper to scan public/outputs for initial migration
async function scanOutputsDir() {
    try {
        await fs.access(OUTPUTS_DIR);
        const files = await fs.readdir(OUTPUTS_DIR);
        const imageFiles = files.filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f));

        const history = await Promise.all(imageFiles.map(async (filename) => {
            const baseName = filename.split('.')[0];
            const jsonFilename = `${baseName}.json`;
            const jsonPath = path.join(OUTPUTS_DIR, jsonFilename);

            let metadata = null;
            try {
                const jsonContent = await fs.readFile(jsonPath, 'utf-8');
                metadata = JSON.parse(jsonContent);
            } catch {
                // No metadata file
            }

            return {
                timestamp: metadata?.timestamp || new Date(parseInt(baseName.split('_')[1]) || Date.now()).toISOString(),
                imageUrl: `/outputs/${filename}`,
                prompt: metadata?.prompt || ''
            };
        }));

        return history as HistoryItem[];
    } catch {
        // console.warn("Outputs dir not found or empty");
        return [];
    }
}

export async function GET() {
    try {
        await ensureOutputsDir();

        let history = await readHistory();

        // If no history files found, migrate from public/outputs
        if (!history) {
            console.log("No history found in JSON files. Scanning directory...");
            history = await scanOutputsDir();

            if (history.length > 0) {
                await saveHistory(history);
            }
        }

        // Sort by timestamp descending
        const sortedHistory = Array.isArray(history) ? (history as HistoryItem[]).sort((a: HistoryItem, b: HistoryItem) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ) : [];

        return NextResponse.json({ history: sortedHistory });
    } catch (error) {
        console.error('Failed to load history:', error);
        return NextResponse.json({ error: 'Failed to load history' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const item = await request.json();

        if (!item || (!item.imageUrl && !item.id)) {
            return NextResponse.json({ error: 'Invalid item' }, { status: 400 });
        }

        await ensureOutputsDir();
        const history = (await readHistory() || []) as HistoryItem[];

        const imageUrl = item.imageUrl || (item.id ? `/outputs/${item.id}.png` : '');

        const historyItem = {
            timestamp: item.timestamp || new Date().toISOString(),
            imageUrl: imageUrl,
            prompt: item.prompt || item.config?.prompt || ''
        };

        const existsIndex = history.findIndex((h: HistoryItem) => h.imageUrl === historyItem.imageUrl);
        if (existsIndex > -1) {
            history[existsIndex] = historyItem;
        } else {
            history.unshift(historyItem);
        }

        const success = await saveHistory(history);
        if (!success) {
            throw new Error("Failed to perform atomic save");
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to save history item:', error);
        return NextResponse.json({ error: 'Failed to save history item' }, { status: 500 });
    }
}
