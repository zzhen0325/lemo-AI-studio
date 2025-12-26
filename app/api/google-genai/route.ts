import { NextResponse } from 'next/server'
import { z } from 'zod'
import { fetchGoogleGenAIImage } from '@/lib/api/google-genai'

const googleGenAiRequestSchema = z.object({
  prompt: z.string().min(1),
  images: z.array(z.string()).optional(),
  aspectRatio: z.string().optional(),
  imageSize: z.string().optional(),
})



const googleGenAiResponseSchema = z.object({
  imageUrl: z.string().min(1).optional(),
  text: z.string().optional(),
  error: z.string().optional(),
})



export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = googleGenAiRequestSchema.parse(body)
    const result = await fetchGoogleGenAIImage(parsed)
    const validated = googleGenAiResponseSchema.parse(result)
    return NextResponse.json(validated)
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
