import { create } from 'zustand';
import { GenerationConfig, UploadedImage } from '@/components/features/playground-v2/types';
import { IViewComfy } from '@/lib/providers/view-comfy-provider';
import { SelectedLora } from '@/components/features/playground-v2/LoraSelectorDialog';

interface PlaygroundState {
    config: GenerationConfig;
    uploadedImages: UploadedImage[];
    selectedModel: string;
    selectedWorkflowConfig: IViewComfy | undefined;
    selectedLoras: SelectedLora[];

    // Actions
    updateConfig: (config: Partial<GenerationConfig>) => void;
    setUploadedImages: (images: UploadedImage[] | ((prev: UploadedImage[]) => UploadedImage[])) => void;
    setSelectedModel: (model: string) => void;
    setSelectedWorkflowConfig: (workflow: IViewComfy | undefined) => void;
    setSelectedLoras: (loras: SelectedLora[]) => void;

    // High-level Actions
    applyPrompt: (prompt: string) => void;
    applyImage: (imageUrl: string) => Promise<void>;
    applyModel: (model: string, configData?: GenerationConfig) => void;
    remix: (result: { config: GenerationConfig, workflow?: IViewComfy, loras?: SelectedLora[] }) => void;
}

// Assuming 'toast' is imported or defined elsewhere, e.g., from a UI library like shadcn/ui
// import { toast } from '@/components/ui/use-toast'; // Example import

export const usePlaygroundStore = create<PlaygroundState>()((set) => ({
    config: {
        prompt: '',
        img_width: 1376,
        image_height: 768,
        gen_num: 1,
        base_model: 'Nano banana',
        image_size: '1K',
        lora: ''
    },
    uploadedImages: [],
    selectedModel: 'Nano banana',
    selectedWorkflowConfig: undefined,
    selectedLoras: [],

    updateConfig: (newConfig) => set((state) => ({
        config: { ...state.config, ...newConfig }
    })),

    setUploadedImages: (updater) => set((state) => ({
        uploadedImages: typeof updater === 'function' ? updater(state.uploadedImages) : updater
    })),

    setSelectedModel: (model) => set({ selectedModel: model }),
    setSelectedWorkflowConfig: (workflow) => set({ selectedWorkflowConfig: workflow }),
    setSelectedLoras: (loras) => set({ selectedLoras: loras }),

    applyPrompt: (prompt) => {
        set((state) => ({ config: { ...state.config, prompt } }));
        // toast({ title: "已应用提示词" }); // Uncomment if toast is available
    },

    applyImage: async (imageUrl) => {
        try {
            const resp = await fetch(imageUrl);
            const blob = await resp.blob();
            const file = new File([blob], `image-${Date.now()}.png`, { type: 'image/png' });
            const reader = new FileReader();
            const dataUrl = await new Promise<string>((resolve) => {
                reader.onload = (e) => resolve(String(e.target?.result));
                reader.readAsDataURL(blob);
            });
            const base64Data = dataUrl.split(',')[1];

            set((state) => ({
                uploadedImages: [...state.uploadedImages, {
                    file,
                    base64: base64Data,
                    previewUrl: dataUrl
                }]
            }));
            // toast({ title: "图片已添加为参考图" }); // Uncomment if toast is available
        } catch (error) {
            console.error("Failed to apply image", error);
            // toast({ title: "添加图片失败", variant: "destructive" }); // Uncomment if toast is available
        }
    },

    applyModel: (model, configData) => {
        set((state) => {
            const newConfig = configData ? { ...state.config, ...configData, base_model: model } : { ...state.config, base_model: model };
            return {
                selectedModel: model,
                config: newConfig
            };
        });
        // toast({ title: `已切换至模型: ${model}` }); // Uncomment if toast is available
    },

    remix: (result) => {
        set((state) => ({
            selectedModel: result.config.base_model || state.selectedModel,
            selectedWorkflowConfig: result.workflow || state.selectedWorkflowConfig,
            selectedLoras: result.loras || state.selectedLoras,
            config: { ...state.config, ...result.config }
        }));
    }
}));
