"use client";

import { useTransition } from "react";
import { usePlaygroundStore } from "@/lib/store/playground-store";
import { useImageGeneration } from "./useImageGeneration";
import { useImageEditing } from "./useImageEditing";
import { usePostPlayground } from "@/hooks/features/playground/use-post-playground";
import { fetchByteArtistImage } from "@/lib/api/PlaygroundV2";
import { useToast } from "@/hooks/common/use-toast";
import { GenerationConfig, GenerationResult } from "@/components/features/playground-v2/types";
import { IMultiValueInput } from "@/lib/workflow-api-parser";
import { UIComponent } from "@/types/features/mapping-editor";

export function useGenerationService() {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const selectedModel = usePlaygroundStore(s => s.selectedModel);
    const selectedWorkflowConfig = usePlaygroundStore(s => s.selectedWorkflowConfig);
    const isMockMode = usePlaygroundStore(s => s.isMockMode);
    const setGenerationHistory = usePlaygroundStore(s => s.setGenerationHistory);
    const setHasGenerated = usePlaygroundStore(s => s.setHasGenerated);

    const { generateImage } = useImageGeneration();
    const { editImage } = useImageEditing();
    const { doPost: runComfyWorkflow } = usePostPlayground();

    // Helper: URL to DataURL
    const blobToDataURL = (blob: Blob) => new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onloadend = () => resolve(String(r.result));
        r.readAsDataURL(blob);
    });

    const urlToDataURL = async (url: string) => {
        if (url.startsWith('data:')) return url;
        const res = await fetch(url);
        const blob = await res.blob();
        return blobToDataURL(blob);
    };

    // Helper: Save to outputs
    const saveImageToOutputs = async (dataUrl: string, metadata?: Record<string, unknown>) => {
        const resp = await fetch('/api/save-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: dataUrl, ext: 'png', subdir: 'outputs', metadata })
        });
        const json = await resp.json();
        return resp.ok && json?.path ? String(json.path) : dataUrl;
    };

    // Helper: Save to history.json
    const saveHistoryToBackend = async (item: GenerationResult) => {
        try {
            const historyItem = {
                imageUrl: item.savedPath || item.imageUrl || '',
                prompt: item.config?.prompt || '',
                timestamp: item.timestamp || new Date().toISOString()
            };
            await fetch('/api/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(historyItem),
            });
        } catch (error) {
            console.error('Failed to save history:', error);
        }
    };

    const handleGenerate = async (configOverride?: GenerationConfig) => {
        const freshConfig = usePlaygroundStore.getState().config;
        const finalConfig = configOverride && typeof configOverride === 'object' && 'prompt' in configOverride
            ? configOverride
            : freshConfig;

        if (!finalConfig.prompt?.trim()) {
            toast({ title: "错误", description: "请输入图像描述文本", variant: "destructive" });
            return;
        }

        startTransition(async () => {
            setHasGenerated(true);
            const taskId = Date.now().toString() + Math.random().toString(36).substring(2, 7);

            const loadingResult: GenerationResult = {
                id: taskId,
                imageUrl: "",
                prompt: finalConfig.prompt,
                config: { ...finalConfig, base_model: finalConfig.base_model || selectedModel },
                timestamp: new Date().toISOString(),
                isLoading: true
            };

            setGenerationHistory(prev => [loadingResult, ...prev]);

            try {
                if (isMockMode) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    const mockImageUrl = `/uploads/1750263630880_smwzxy6h4ws.png`;
                    const result: GenerationResult = {
                        id: taskId,
                        imageUrl: mockImageUrl,
                        savedPath: mockImageUrl,
                        prompt: finalConfig.prompt,
                        config: { ...finalConfig },
                        timestamp: new Date().toISOString(),
                    };
                    updateHistoryAndSave(taskId, result);
                    return;
                }

                if (selectedModel === "Nano banana") {
                    await handleNanoBanana(taskId, finalConfig);
                } else if (selectedModel === "Seed 4.0") {
                    await handleSeed4(taskId, finalConfig);
                } else if (selectedModel === "Workflow") {
                    await handleWorkflow(taskId, finalConfig);
                } else {
                    await handleByteArtist(taskId, finalConfig);
                }
            } catch (error) {
                console.error("Generation failed:", error);
                setGenerationHistory(prev => prev.filter(item => item.id !== taskId));
                toast({ title: "生成失败", description: error instanceof Error ? error.message : "未知错误", variant: "destructive" });
            }
        });
    };

    const updateHistoryAndSave = (taskId: string, result: GenerationResult) => {
        setGenerationHistory(prev => prev.map(item => item.id === taskId ? result : item));
        saveHistoryToBackend(result);
    };

    const handleNanoBanana = async (taskId: string, currentConfig: GenerationConfig) => {
        const currentUploadedImages = usePlaygroundStore.getState().uploadedImages;
        let genResult;
        if (currentUploadedImages.length > 0) {
            genResult = await editImage({
                instruction: currentConfig.prompt,
                originalImage: currentUploadedImages[0].base64,
                referenceImages: currentUploadedImages.slice(1).map(img => img.base64),
                aspectRatio: "16:9",
                imageSize: currentConfig.image_size || '1K'
            });
        } else {
            genResult = await generateImage({
                prompt: currentConfig.prompt,
                aspectRatio: "16:9",
                imageSize: currentConfig.image_size || '1K'
            });
        }

        if (genResult) {
            const dataUrl = await urlToDataURL(genResult.imageUrl);
            const savedPath = await saveImageToOutputs(dataUrl, { ...currentConfig, base_model: "Nano banana" });
            updateHistoryAndSave(taskId, { id: taskId, imageUrl: dataUrl, savedPath, prompt: currentConfig.prompt, config: { ...currentConfig }, timestamp: genResult.timestamp });
        } else {
            throw new Error("Nano banana returned empty result");
        }
    };

    const handleSeed4 = async (taskId: string, currentConfig: GenerationConfig) => {
        const payload = {
            conf: {
                prompt: currentConfig.prompt,
                width: Number(currentConfig.img_width),
                height: Number(currentConfig.image_height),
                batch_size: currentConfig.gen_num || 1,
                seed: Math.floor(Math.random() * 2147483647),
                is_random_seed: true
            },
            algorithms: "seed4_lemo1230",
            img_return_format: "png"
        };
        const res = await fetch('/api/seed4', { method: 'POST', body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Seed 4 generation failed");

        const imageUrl = data.data?.afr_data?.[0]?.pic;
        if (!imageUrl) throw new Error("Seed 4 returned no image");

        const dataUrl = await urlToDataURL(imageUrl);
        const savedPath = await saveImageToOutputs(dataUrl, { ...currentConfig, base_model: "Seed 4.0" });
        updateHistoryAndSave(taskId, { id: taskId, imageUrl: dataUrl, savedPath, prompt: currentConfig.prompt, config: { ...currentConfig }, timestamp: new Date().toISOString() });
    };

    const handleWorkflow = async (taskId: string, currentConfig: GenerationConfig) => {
        if (!selectedWorkflowConfig) throw new Error("未选择工作流");

        const flattenInputs = (arr: IMultiValueInput[]) => arr.flatMap(g => g.inputs.map(i => ({ key: i.key, value: i.value, valueType: i.valueType, title: i.title })));
        const allInputs = [...flattenInputs(selectedWorkflowConfig.viewComfyJSON.inputs), ...flattenInputs(selectedWorkflowConfig.viewComfyJSON.advancedInputs)];
        const mappingConfig = selectedWorkflowConfig.viewComfyJSON.mappingConfig as { components: UIComponent[] } | undefined;

        let mappedInputs: { key: string; value: unknown }[] = [];
        if (mappingConfig?.components?.length) {
            const paramMap = new Map<string, unknown>();
            mappingConfig.components.forEach(comp => {
                if (!comp.properties?.paramName || !comp.mapping?.workflowPath) return;
                const pathKey = comp.mapping.workflowPath.join("-");
                const pName = comp.properties.paramName;
                if (pName === 'prompt' && currentConfig.prompt) paramMap.set(pathKey, currentConfig.prompt);
                else if (pName === 'width') paramMap.set(pathKey, currentConfig.img_width);
                else if (pName === 'height') paramMap.set(pathKey, currentConfig.image_height);
                else if (pName === 'batch_size') paramMap.set(pathKey, currentConfig.gen_num);
            });
            mappedInputs = allInputs.map(item => ({ key: item.key, value: paramMap.has(item.key) ? paramMap.get(item.key) : item.value }));
        } else {
            mappedInputs = allInputs.map(item => {
                const title = item.title || "";
                if (/prompt|文本|提示/i.test(title)) return { key: item.key, value: currentConfig.prompt };
                if (/width/i.test(title)) return { key: item.key, value: currentConfig.img_width };
                if (/height/i.test(title)) return { key: item.key, value: currentConfig.image_height };
                return { key: item.key, value: item.value };
            });
        }

        await runComfyWorkflow({
            viewComfy: { inputs: mappedInputs, textOutputEnabled: false },
            workflow: selectedWorkflowConfig.workflowApiJSON || undefined,
            viewcomfyEndpoint: selectedWorkflowConfig.viewComfyJSON.viewcomfyEndpoint || null,
            onSuccess: async (outputs) => {
                if (outputs.length > 0) {
                    const dataUrl = await blobToDataURL(outputs[0]);
                    const savedPath = await saveImageToOutputs(dataUrl, { ...currentConfig, base_model: "Workflow" });
                    updateHistoryAndSave(taskId, { id: taskId, imageUrl: dataUrl, savedPath, prompt: currentConfig.prompt, config: { ...currentConfig }, timestamp: new Date().toISOString() });
                }
            },
            onError: (err) => {
                setGenerationHistory(prev => prev.filter(item => item.id !== taskId));
                toast({ title: "生成失败", description: err?.message || "工作流执行失败", variant: "destructive" });
            }
        });
    };

    const handleByteArtist = async (taskId: string, currentConfig: GenerationConfig) => {
        const response = await fetchByteArtistImage({
            conf: {
                width: currentConfig.img_width,
                height: currentConfig.image_height,
                batch_size: currentConfig.gen_num,
                seed: Math.floor(Math.random() * 2147483647),
                prompt: currentConfig.prompt
            },
            algorithms: "lemo_2dillustator",
            img_return_format: "png"
        });
        const afr = (response as { data: { afr_data: { pic: string }[] } }).data?.afr_data;
        if (!afr?.[0]?.pic) throw new Error("ByteArtist returned no image");

        const dataUrl = afr[0].pic.startsWith("data:") ? afr[0].pic : `data:image/png;base64,${afr[0].pic}`;
        const savedPath = await saveImageToOutputs(dataUrl, { ...currentConfig });
        updateHistoryAndSave(taskId, { id: taskId, imageUrl: dataUrl, savedPath, prompt: currentConfig.prompt, config: { ...currentConfig }, timestamp: new Date().toISOString() });
    };

    return {
        handleGenerate,
        isGenerating: isPending
    };
}
