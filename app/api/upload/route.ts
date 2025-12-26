import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';

const AllowedExt = ['png', 'jpg', 'jpeg'] as const;

const FileInfoSchema = z.object({
  name: z.string().min(1),
  type: z.string().regex(/^image\//),
});

function getExtFromName(name: string): string {
  const idx = name.lastIndexOf('.');
  if (idx !== -1) return name.slice(idx + 1).toLowerCase();
  return 'png';
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const infoParse = FileInfoSchema.safeParse({ name: file.name, type: file.type });
    if (!infoParse.success) {
      return NextResponse.json({ error: 'Invalid file', details: infoParse.error.flatten() }, { status: 400 });
    }

    const ext = getExtFromName(file.name);
    if (!AllowedExt.includes(ext as typeof AllowedExt[number])) {
      return NextResponse.json({ error: 'Unsupported extension' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const publicDir = path.join(process.cwd(), 'public');
    const uploadDir = path.join(publicDir, 'upload');
    await fs.mkdir(uploadDir, { recursive: true });

    const stamp = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    const filename = `ref_${stamp}_${rand}.${ext}`;
    const filePath = path.join(uploadDir, filename);

    await fs.writeFile(filePath, buffer);

    const pathForClient = `/upload/${filename}`;
    return NextResponse.json({ path: pathForClient });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to upload image', details: String(error) }, { status: 500 });
  }
}

