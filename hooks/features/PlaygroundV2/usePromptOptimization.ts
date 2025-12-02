import { useState } from 'react';
import { useToast } from '@/hooks/common/use-toast';

export type AIModel = 'gemini' | 'doubao' | 'gpt';

interface UsePromptOptimizationOptions {
  systemInstruction: string;
}

interface UsePromptOptimizationReturn {
  isOptimizing: boolean;
  optimizePrompt: (text: string, model?: AIModel) => Promise<string | null>;
}

export function usePromptOptimization(options: UsePromptOptimizationOptions): UsePromptOptimizationReturn {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const { toast } = useToast();

  const optimizePrompt = async (text: string, model: AIModel = 'gemini'): Promise<string | null> => {
    if (!text.trim()) {
      toast({ title: '错误', description: '请先输入提示词内容', variant: 'destructive' });
      return null;
    }

    setIsOptimizing(true);
    try {
      let apiEndpoint = '/api/google-genai-text';
      switch (model) {
        case 'gemini': apiEndpoint = '/api/google-genai-text'; break;
        case 'doubao': apiEndpoint = '/api/doubao-text'; break;
        case 'gpt': apiEndpoint = '/api/gpt-text'; break;
      }

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, systemInstruction: options.systemInstruction }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '优化失败');
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (!data.optimizedText) throw new Error('未收到优化结果');

      toast({ title: '优化完成', description: '提示词已成功优化' });
      return data.optimizedText as string;
    } catch (error) {
      toast({ title: '优化失败', description: error instanceof Error ? error.message : 'AI优化服务暂时不可用，请稍后重试', variant: 'destructive' });
      return null;
    } finally {
      setIsOptimizing(false);
    }
  };

  return { isOptimizing, optimizePrompt };
}
