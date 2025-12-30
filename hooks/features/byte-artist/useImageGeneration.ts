import { useState } from 'react';
import { useAIService } from '@/hooks/ai/useAIService';
import { useToast } from '@/hooks/common/use-toast';

export interface ImageGenerationConfig {
  prompt: string;
  referenceImages?: string[];
  aspectRatio?: string; // 图片比例，如 "16:9", "1:1", "9:16" 等
}

export interface ImageGenerationResult {
  imageUrl: string;
  config: ImageGenerationConfig;
  timestamp: string;
}

export function useImageGeneration() {
  const { callImage, isLoading: isGenerating } = useAIService();
  const [result, setResult] = useState<ImageGenerationResult | null>(null);
  const { toast } = useToast();

  const generateImage = async (config: ImageGenerationConfig): Promise<ImageGenerationResult | null> => {
    if (!config.prompt.trim()) {
      toast({
        title: "错误",
        description: "请输入图像描述文本",
        variant: "destructive",
      });
      return null;
    }

    try {
      const response = await callImage({
        model: 'gemini-3-pro-image-preview', // Legacy behavior was using geminiService which maps to google-genai
        prompt: config.prompt,
        images: config.referenceImages,
        aspectRatio: config.aspectRatio,
      });

      if (!response.images || response.images.length === 0) {
        throw new Error("未收到有效图片数据");
      }

      // 将base64转换为data URL
      const imageUrl = response.images[0].startsWith("data:")
        ? response.images[0]
        : `data:image/png;base64,${response.images[0]}`;

      const generationResult: ImageGenerationResult = {
        imageUrl,
        config,
        timestamp: new Date().toISOString(),
      };

      setResult(generationResult);

      toast({
        title: "生成成功",
        description: "图像已成功生成！",
      });

      return generationResult;
    } catch (error) {
      // toast is already handled by useAIService, but we can add more context if needed
      return null;
    }
  };

  return {
    generateImage,
    isGenerating,
    result,
  };
}