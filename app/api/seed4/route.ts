import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from "zod";

// API 配置
const API_CONFIG = {
    BASE_URL: 'https://effect.bytedance.net/media/api/pic/afr',
    AID: '6834',
    APP_KEY: 'a89de09e9bca4723943e8830a642464d',
    APP_SECRET: '8505d553a24c485fb7d9bb336a3651a8',
    SERVICE_NAME: 'seed4_lemo1230-dedicated-ft_43f385bb411cfb0eca61c4b407de'
};

// 工具函数
function sha1(message: string): string {
    return crypto.createHash('sha1').update(message).digest('hex');
}

// 生成签名 - 修复为正确的排序算法
function generateSign(nonce: string, timestamp: string, secretKey: string): string {
    const stringList = [nonce, timestamp, secretKey];
    stringList.sort();
    const concatenatedString = stringList.join('');
    return sha1(concatenatedString);
}

// 生成随机字符串 - 修复为32位整数格式
function generateNonce(): string {
    return Math.floor(Math.random() * 2147483647).toString();
}

// 生成时间戳
function generateTimestamp(): string {
    return Math.floor(Date.now() / 1000).toString();
}

// 构建查询字符串
function buildQueryString(params: Record<string, string>): string {
    return Object.entries(params).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
}

// 请求参数验证 Schema
const RequestSchema = z.object({
    conf: z.object({
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        batch_size: z.number().int().min(1).default(1),
        seed: z.number().int().optional(),
        is_random_seed: z.boolean().optional(),
        prompt: z.string().min(1),
    }),
    algorithms: z.string().min(1),
    img_return_format: z.enum(["png", "jpeg", "jpg"]).default("png").optional(),
    imgReturnFormat: z.enum(["png", "jpeg", "jpg"]).optional(),
});

// 响应数据验证 Schema
export const ResponseSchema = z.object({
    success: z.boolean(),
    message: z.string().optional(),
    algo_status_code: z.number().nullable().optional(),
    algo_status_message: z.string().nullable().optional(),
    data: z.object({
        afr_data: z
            .array(
                z.object({
                    pic: z.string(),
                })
            )
            .default([]),
    }),
    raw: z.any().optional(),
});

export type ByteArtistAPIRequest = z.infer<typeof RequestSchema>;
export type ByteArtistAPIResponse = z.infer<typeof ResponseSchema>;

export async function POST(request: NextRequest) {
    try {
        console.log('ByteArtist API 代理请求开始');

        // 解析请求体并校验
        const body = await request.json();
        const parsed = RequestSchema.safeParse(body);
        if (!parsed.success) {
            console.error('参数验证失败:', parsed.error.flatten());
            return NextResponse.json(
                {
                    success: false,
                    message: "参数错误",
                    data: { afr_data: [] },
                    issues: parsed.error.flatten(),
                },
                { status: 400 }
            );
        }

        const { conf, algorithms } = parsed.data;
        const img_return_format = parsed.data.img_return_format ?? parsed.data.imgReturnFormat ?? "png";

        console.log('参数验证成功:', {
            conf: { ...conf, prompt: conf.prompt?.substring(0, 50) + '...' },
            algorithms,
            img_return_format
        });

        // 生成鉴权参数
        const nonce = generateNonce();
        const timestamp = generateTimestamp();
        const sign = generateSign(nonce, timestamp, API_CONFIG.APP_SECRET);

        console.log('鉴权参数生成:', { nonce, timestamp, sign: sign.substring(0, 8) + '...' });

        // 构建查询参数
        const queryParams = {
            aid: API_CONFIG.AID,
            app_key: API_CONFIG.APP_KEY,
            timestamp,
            nonce,
            sign
        };

        // 构建完整的 URL
        const url = `${API_CONFIG.BASE_URL}?${buildQueryString(queryParams)}`;
        console.log('请求 URL:', url);

        // 构建表单数据
        const formData = new URLSearchParams();
        formData.append('conf', JSON.stringify(conf));
        formData.append('algorithms', algorithms);
        formData.append('img_return_format', img_return_format);

        console.log('表单数据:', {
            conf: JSON.stringify(conf).substring(0, 100) + '...',
            algorithms,
            img_return_format
        });

        // 发送请求到 ByteArtist API
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'get-svc': '1',
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'ByteArtist-Client/1.0'
            },
            body: formData
        });

        console.log('ByteArtist API 响应状态:', response.status, response.statusText);

        // 检查响应状态
        if (!response.ok) {
            const errorText = await response.text();
            console.error('ByteArtist API 错误响应:', errorText);
            return NextResponse.json(
                {
                    error: `ByteArtist API 错误: ${response.status} ${response.statusText}`,
                    details: errorText
                },
                { status: response.status }
            );
        }

        // 解析响应并规范化返回
        type ByteArtistRaw = {
            success?: boolean;
            message?: string;
            data?: {
                data?: { afr_data?: Array<{ pic: string }> };
                afr_data?: Array<{ pic: string }>;
                algo_status_code?: number;
                algo_status_message?: string;
            };
        };
        let apiResponse: ByteArtistRaw | null = null;
        try {
            apiResponse = (await response.json()) as ByteArtistRaw;
        } catch {
            const txt = await response.text();
            return NextResponse.json(
                { success: false, message: '上游返回非JSON', data: { afr_data: [] }, raw: txt },
                { status: 502 }
            );
        }

        const success =
            apiResponse?.success === true ||
            apiResponse?.message === 'success' ||
            apiResponse?.data?.algo_status_code === 0;

        const afr_data = apiResponse?.data?.data?.afr_data ?? apiResponse?.data?.afr_data ?? [];
        const algo_status_code = apiResponse?.data?.algo_status_code ?? null;
        const algo_status_message = apiResponse?.data?.algo_status_message ?? apiResponse?.message ?? null;

        console.log('ByteArtist 规范化响应:', { success, algo_status_code, algo_status_message, dataCount: afr_data.length });
        if (!success) {
            console.error('ByteArtist 业务逻辑失败详情:', JSON.stringify(apiResponse, null, 2));
        }

        return NextResponse.json(
            {
                success,
                message: success ? 'success' : algo_status_message ?? '图片处理失败，请稍后重试',
                algo_status_code,
                algo_status_message,
                data: { afr_data },
                raw: apiResponse,
            },
            { status: 200 }
        );

    } catch (error) {
        console.error('ByteArtist API 代理错误:', error);
        return NextResponse.json(
            {
                error: '内部服务器错误',
                details: error instanceof Error ? error.message : '未知错误'
            },
            { status: 500 }
        );
    }
}

// 处理 CORS 预检请求
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
