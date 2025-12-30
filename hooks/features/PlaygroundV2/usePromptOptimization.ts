import { useToast } from '@/hooks/common/use-toast';
import { useAIService } from '@/hooks/ai/useAIService';

export type AIModel = 'gemini' | 'doubao' | 'gpt' | 'auto';

interface UsePromptOptimizationOptions {
  systemInstruction: string;
}

interface UsePromptOptimizationReturn {
  isOptimizing: boolean;
  optimizePrompt: (text: string, model?: AIModel, image?: string) => Promise<string | null>;
}

export function usePromptOptimization(options: UsePromptOptimizationOptions): UsePromptOptimizationReturn {
  const { callText, callVision, isLoading: isOptimizing } = useAIService();
  const { toast } = useToast();

  const optimizePrompt = async (text: string, model: AIModel = 'auto', image?: string): Promise<string | null> => {
    if (!text.trim() && !image) {
      toast({ title: '错误', description: '请先输入提示词内容或上传图片', variant: 'destructive' });
      return null;
    }

    try {
      // Map legacy model names to registry IDs
      let modelId: string | undefined = undefined;
      if (model === 'doubao') modelId = 'doubao-pro-4k';
      if (model === 'gpt') modelId = 'deepseek-chat';
      if (model === 'gemini') modelId = 'gemini-1.5-flash';

      let resultText = "";

      if (image) {
        // Use vision service
        const result = await callVision({
          model: modelId || 'gemini-1.5-flash', // Default to Gemini for vision
          image: image,
          input: text,
          profileId: 'optimization-with-image'
        });
        resultText = result.text;
      } else {
        // Use text service
        const result = await callText({
          model: modelId, // If undefined, useAIService will pick the optimized model from settings
          input: text,
          systemPrompt: options.systemInstruction,
          profileId: 'optimization'
        });
        resultText = result.text;
      }

      if (!resultText) throw new Error('未收到优化结果');

      return resultText;
    } catch (error) {
      console.error("Prompt Optimization Error:", error);
      // useAIService already shows a toast, so we just return null here
      return null;
    }
  };

  return { isOptimizing, optimizePrompt };
}
