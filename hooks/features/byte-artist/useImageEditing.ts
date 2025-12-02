import { useState } from 'react';
import { geminiService, EditRequest } from '@/lib/api/geminiService';
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
  const [isEditing, setIsEditing] = useState(false);
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

    setIsEditing(true);
    
    try {
      console.log("✏️ 开始图像编辑流程");
      console.log("📋 编辑配置:", {
        instruction: config.instruction,
        hasOriginalImage: !!config.originalImage,
        referenceImagesCount: config.referenceImages?.length || 0
      });

      const request: EditRequest = {
        instruction: config.instruction,
        originalImage: config.originalImage,
        referenceImages: config.referenceImages,
        aspectRatio: config.aspectRatio,
      };

      const images = await geminiService.editImage(request);
      
      if (!images || images.length === 0) {
        throw new Error("未收到有效图片数据");
      }

      // 将base64转换为data URL
      const imageUrl = images[0].startsWith("data:") 
        ? images[0] 
        : `data:image/png;base64,${images[0]}`;

      const editingResult: ImageEditingResult = {
        imageUrl,
        config,
        timestamp: new Date().toISOString(),
      };

      setResult(editingResult);
      
      console.log("✅ 图像编辑成功");
      toast({
        title: "编辑成功",
        description: "图像已成功编辑！",
      });

      return editingResult;
    } catch (error) {
      console.error("💥 图像编辑失败:", error);
      
      toast({
        title: "编辑失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
      
      return null;
    } finally {
      setIsEditing(false);
    }
  };

  return {
    editImage,
    isEditing,
    result,
  };
}