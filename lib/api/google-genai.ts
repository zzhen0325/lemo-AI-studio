import { GoogleGenAI } from "@google/genai";

export interface GoogleGenAIConfig {
  prompt: string;
  images?: string[]; // base64 encoded images
  aspectRatio?: string; // 图片比例，如 "16:9", "1:1", "9:16" 等
}

export interface GoogleGenAIResponse {
  imageUrl?: string;
  text?: string;
  error?: string;
}

export async function fetchGoogleGenAIImage(config: GoogleGenAIConfig): Promise<GoogleGenAIResponse> {
  console.log("🚀 开始调用 Google GenAI API");
  console.log("📝 配置参数:", { 
    prompt: config.prompt?.substring(0, 50) + "...", 
    imageCount: config.images?.length || 0 
  });

  try {
    console.log("🔑 初始化 GoogleGenAI 客户端");
    const ai = new GoogleGenAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY || "",
    });

    console.log("📦 构建请求内容数组");
    const prompt = [];

    // 如果有输入图片，添加到请求中
    if (config.images && config.images.length > 0) {
      console.log(`🖼️ 添加 ${config.images.length} 张输入图片`);
      config.images.forEach((imageBase64, index) => {
        console.log(`📸 处理第 ${index + 1} 张图片`);
        prompt.push({
          inlineData: {
            mimeType: "image/png",
            data: imageBase64,
          },
        });
      });
    }

    // 添加文本提示
    console.log("💬 添加文本提示到请求中");
    prompt.push({ text: config.prompt });

    console.log("📤 发送请求到 Google GenAI API");
    console.log("🎯 使用模型: gemini-2.5-flash-image");
    console.log("🖼️ 配置响应模式: 仅返回图片");
    
    // 构建请求配置
    const requestConfig: any = {
      model: "gemini-2.5-flash-image",
      contents: prompt,
      config: {
        responseModalities: ['Image']
      }
    };

    // 如果指定了比例，添加到配置中
    if (config.aspectRatio) {
      console.log(`📏 设置图片比例: ${config.aspectRatio}`);
      requestConfig.config.imageConfig = {
        aspectRatio: config.aspectRatio
      };
    }
    
    const response = await ai.models.generateContent(requestConfig);

    console.log("📥 收到 API 响应");
    console.log("🔍 响应结构:", {
      hasCandidates: !!response.candidates,
      candidatesLength: response.candidates?.length || 0,
      firstCandidate: response.candidates?.[0] ? "存在" : "不存在"
    });

    // 处理响应 - 根据 generateContent 的响应格式
    if (!response.candidates || response.candidates.length === 0) {
      console.error("❌ API响应格式无效或没有候选结果");
      console.log("📋 完整响应:", JSON.stringify(response, null, 2));
      return { error: "API响应格式无效或没有候选结果" };
    }

    const candidate = response.candidates[0];
    
    // 检查finishReason
    if (candidate.finishReason === "NO_IMAGE") {
      console.error("❌ API无法生成图片，原因: NO_IMAGE");
      console.log("📋 候选结果:", JSON.stringify(candidate, null, 2));
      return { error: "API无法生成图片，请检查提示词是否适合图片生成，或尝试不同的输入图片" };
    }

    // 检查是否有内容部分
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      console.error("❌ 候选结果中没有内容部分");
      console.log("📋 候选结果:", JSON.stringify(candidate, null, 2));
      return { error: "未收到有效的内容数据" };
    }

    console.log("✅ 响应格式有效，开始处理内容部分");
    
    // 遍历内容部分，查找图片数据
     for (const part of candidate.content.parts) {
       if (part.inlineData && part.inlineData.data) {
         console.log("🖼️ 找到图片数据，MIME类型:", part.inlineData.mimeType);
         const imageData = part.inlineData.data;
         console.log("🖼️ 返回图片响应，数据长度:", imageData.length);
         
         const dataUrl = `data:${part.inlineData.mimeType};base64,${imageData}`;
         console.log("✨ 图片数据URL生成成功，长度:", dataUrl.length);
         return { imageUrl: dataUrl };
       } else if (part.text) {
         console.log("💬 找到文本内容:", part.text.substring(0, 100) + "...");
         // 如果配置了仅返回图片，但收到了文本，记录警告
         console.warn("⚠️ 配置了仅返回图片，但收到了文本内容");
       }
     }

    console.error("❌ 内容部分中没有找到图片数据");
    return { error: "未收到有效的图片数据" };
  } catch (error) {
    console.error("💥 Google GenAI API 调用失败:", error);
    return { 
      error: error instanceof Error ? error.message : "未知错误" 
    };
  }
}