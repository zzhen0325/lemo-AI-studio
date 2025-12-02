import { GoogleGenAIConfig, GoogleGenAIResponse } from './google-genai';

export async function fetchGoogleGenAIImageClient(config: GoogleGenAIConfig): Promise<GoogleGenAIResponse> {
  console.log("🌐 客户端调用 Google GenAI API 路由");
  console.log("📝 请求配置:", { 
    prompt: config.prompt?.substring(0, 50) + "...", 
    imageCount: config.images?.length || 0 
  });

  try {
    const response = await fetch('/api/google-genai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API路由响应错误:", response.status, errorText);
      throw new Error(`API调用失败: ${response.status} ${errorText}`);
    }

    const result: GoogleGenAIResponse = await response.json();
    
    console.log("📥 客户端收到API路由响应:", {
      hasError: !!result.error,
      hasImageUrl: !!result.imageUrl,
      hasText: !!result.text
    });

    return result;
  } catch (error) {
    console.error("💥 客户端API调用失败:", error);
    return {
      error: error instanceof Error ? error.message : "客户端调用失败"
    };
  }
}