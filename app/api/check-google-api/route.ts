import { NextResponse } from 'next/server';

export async function GET() {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

    if (!apiKey) {
        return NextResponse.json({ status: 'error', message: 'Missing API Key' }, { status: 500 });
    }

    try {
        // 尝试直接 fetch Google API 的模型列表接口（轻量级检查）
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
            signal: controller.signal,
            method: 'GET',
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            return NextResponse.json({ status: 'connected', latency: 'ok' });
        } else {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json({
                status: 'blocked',
                message: errorData.error?.message || 'API rejected',
                code: response.status
            });
        }
    } catch (error) {
        return NextResponse.json({
            status: 'offline',
            message: 'Network connection failed'
        });
    }
}
