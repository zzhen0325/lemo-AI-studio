import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
    try {
        const outputsDir = path.join(process.cwd(), 'public', 'outputs');

        // 确保目录存在
        try {
            await fs.access(outputsDir);
        } catch {
            return NextResponse.json({ history: [] });
        }

        const files = await fs.readdir(outputsDir);

        // 筛选出所有图片文件
        const imageFiles = files.filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f));

        const history = await Promise.all(imageFiles.map(async (filename) => {
            const baseName = filename.split('.')[0];
            const jsonFilename = `${baseName}.json`;
            const jsonPath = path.join(outputsDir, jsonFilename);

            let metadata = null;
            try {
                const jsonContent = await fs.readFile(jsonPath, 'utf-8');
                metadata = JSON.parse(jsonContent);
            } catch {
                // 无元数据文件
            }

            return {
                id: baseName,
                url: `/outputs/${filename}`,
                timestamp: metadata?.timestamp || new Date(parseInt(baseName.split('_')[1]) || Date.now()).toISOString(),
                metadata: metadata
            };
        }));

        // 按时间降序排列
        const sortedHistory = history.sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        return NextResponse.json({ history: sortedHistory });
    } catch (error) {
        console.error('Failed to load history:', error);
        return NextResponse.json({ error: 'Failed to load history' }, { status: 500 });
    }
}
