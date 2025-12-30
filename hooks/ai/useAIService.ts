"use client";

import { useState } from 'react';
import { useToast } from '@/hooks/common/use-toast';
import {
    generateText as clientGenerateText,
    describeImage as clientDescribeImage,
    generateImage as clientGenerateImage,
    ClientGenerationParams,
    ClientDescribeParams,
    ClientImageParams
} from '@/lib/ai/client';
import { SETTINGS_STORAGE_KEY } from '@/lib/constants';

export function useAIService() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    // Get preferred model from settings
    const getPreferredModel = (task: 'translate' | 'optimize' | 'describe'): string => {
        try {
            const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (stored) {
                const settings = JSON.parse(stored);
                if (task === 'describe' && settings.describeModel) return settings.describeModel;
                if (task === 'translate' && settings.translateModel) return settings.translateModel;
                if (task === 'optimize' && settings.optimizeModel) return settings.optimizeModel;
            }
        } catch (e) {
            console.warn("Failed to read settings for AI service:", e);
        }

        // Default fallbacks based on registry availability
        if (task === 'describe') return 'gemini-1.5-flash';
        return 'doubao-pro-4k';
    };

    const callText = async (params: Partial<ClientGenerationParams> & { input: string }) => {
        setIsLoading(true);
        try {
            const model = params.model || getPreferredModel('translate');
            const result = await clientGenerateText({ ...params, model });
            return result;
        } catch (error: any) {
            toast({ title: 'AI 文本服务错误', description: error.message, variant: 'destructive' });
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const callVision = async (params: Partial<ClientDescribeParams> & { image: string }) => {
        setIsLoading(true);
        try {
            const model = params.model || getPreferredModel('describe');
            const result = await clientDescribeImage({ ...params, model } as ClientDescribeParams);
            return result;
        } catch (error: any) {
            toast({ title: 'AI 视觉服务错误', description: error.message, variant: 'destructive' });
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const callImage = async (params: ClientImageParams) => {
        setIsLoading(true);
        try {
            const result = await clientGenerateImage(params);
            return result;
        } catch (error: any) {
            toast({ title: 'AI 图像服务错误', description: error.message, variant: 'destructive' });
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        callText,
        callVision,
        callImage,
        isLoading
    };
}
