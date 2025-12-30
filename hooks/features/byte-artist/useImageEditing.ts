import { useState } from 'react';
import { useAIService } from '@/hooks/ai/useAIService';
import { useToast } from '@/hooks/common/use-toast';

export interface ImageEditingConfig {
  instruction: string;
  originalImage: string; // base64
  referenceImages?: string[];
  aspectRatio?: string; // 图片比例，如 "16:9", "1:1", "9:16" 等
}

export interface ImageEditingResult {
  imageUrl: string;
  config: ImageEditingConfig;
  timestamp: string;
}

export function useImageEditing() {
  const { callImage, isLoading: isEditing } = useAIService();
  const [result, setResult] = useState<ImageEditingResult | null>(null);
  const { toast } = useToast();

  const editImage = async (config: ImageEditingConfig): Promise<ImageEditingResult | null> => {
    if (!config.instruction.trim()) {
      toast({
        title: "错误",
        description: "请输入编辑指令",
        variant: "destructive",
      });
      return null;
    }

    if (!config.originalImage) {
      toast({
        title: "错误",
        description: "请提供原始图像",
        variant: "destructive",
      });
      return null;
    }

    try {
      const response = await callImage({
        model: 'gemini-3-pro-image-preview',
        prompt: `Edit this image according to the following instruction: ${config.instruction}`,
        images: [config.originalImage, ...(config.referenceImages || [])],
        aspectRatio: config.aspectRatio,
      });

      if (!response.images || response.images.length === 0) {
        throw new Error("未收到有效图片数据");
      }

      // 将base64转换为data URL
      const imageUrl = response.images[0].startsWith("data:")
        ? response.images[0]
        : `data:image/png;base64,${response.images[0]}`;

      const editingResult: ImageEditingResult = {
        imageUrl,
        config,
        timestamp: new Date().toISOString(),
      };

      setResult(editingResult);

      toast({
        title: "编辑成功",
        description: "图像已成功编辑！",
      });

      return editingResult;
    } catch (error) {
      return null;
    }
  };

  return {
    editImage,
    isEditing,
    result,
  };
}