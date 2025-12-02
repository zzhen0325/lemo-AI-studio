import { useState } from 'react';
import { geminiService, GenerationRequest } from '@/lib/api/geminiService';
import { useToast } from '@/hooks/common/use-toast';

export interface ImageGenerationConfig {
  prompt: string;
  referenceImages?: string[];
  aspectRatio?: string;
}

export interface ImageGenerationResult {
  imageUrl: string;
  config: ImageGenerationConfig;
  timestamp: string;
}

export function useImageGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<ImageGenerationResult | null>(null);
  const { toast } = useToast();

  const generateImage = async (config: ImageGenerationConfig): Promise<ImageGenerationResult | null> => {
    if (!config.prompt.trim()) {
      toast({ title: '错误', description: '请输入图像描述文本', variant: 'destructive' });
      return null;
    }

    setIsGenerating(true);
    try {
      const request: GenerationRequest = { prompt: config.prompt, referenceImages: config.referenceImages, aspectRatio: config.aspectRatio };
      const images = await geminiService.generateImage(request);
      if (!images || images.length === 0) throw new Error('未收到有效图片数据');
      const imageUrl = images[0].startsWith('data:') ? images[0] : `data:image/png;base64,${images[0]}`;
      const generationResult: ImageGenerationResult = { imageUrl, config, timestamp: new Date().toISOString() };
      setResult(generationResult);
      toast({ title: '生成成功', description: '图像已成功生成！' });
      return generationResult;
    } catch (error) {
      const msg = error instanceof Error ? error.message : '未知错误';
      toast({ title: '生成失败', description: `💥 图像生成失败: Error: ${msg}`, variant: 'destructive' });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return { generateImage, isGenerating, result };
}
