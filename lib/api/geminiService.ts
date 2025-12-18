// Using Next.js API route instead of direct client access

export interface GenerationRequest {
  prompt: string;
  referenceImages?: string[]; // base64 array
  aspectRatio?: string; // 图片比例，如 "16:9", "1:1", "9:16" 等
  imageSize?: string; // 分辨率，如 "1K", "2K", "4K"
  // temperature?: number;
  // seed?: number;
}

export interface EditRequest {
  instruction: string;
  originalImage: string; // base64
  referenceImages?: string[]; // base64 array
  aspectRatio?: string; // 图片比例，如 "16:9", "1:1", "9:16" 等
  imageSize?: string; // 分辨率，如 "1K", "2K", "4K"
  // temperature?: number;
  // seed?: number;
}



export class GeminiService {
  async generateImage(request: GenerationRequest): Promise<string[]> {
    try {
      const response = await fetch('/api/google-genai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: request.prompt,
          images: request.referenceImages,
          aspectRatio: request.aspectRatio,
          imageSize: request.imageSize,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.error) throw new Error(result.error);
      if (result.imageUrl) return [result.imageUrl];

      return [];
    } catch (error) {
      console.error('Error generating image:', error);
      // 保留原始错误信息，不使用通用错误消息
      throw error;
    }
  }

  async editImage(request: EditRequest): Promise<string[]> {
    try {
      const response = await fetch('/api/google-genai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: this.buildEditPrompt(request),
          images: [request.originalImage, ...(request.referenceImages || [])],
          aspectRatio: request.aspectRatio,
          imageSize: request.imageSize,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.error) throw new Error(result.error);
      if (result.imageUrl) return [result.imageUrl];

      return [];
    } catch (error) {
      console.error('Error editing image:', error);
      // 保留原始错误信息，不使用通用错误消息
      throw error;
    }
  }



  private buildEditPrompt(request: EditRequest): string {
    return `Edit this image according to the following instruction: ${request.instruction}

Maintain the original image's lighting, perspective, and overall composition. Make the changes look natural and seamlessly integrated.

Preserve image quality and ensure the edit looks professional and realistic.`;
  }
}

export const geminiService = new GeminiService();
