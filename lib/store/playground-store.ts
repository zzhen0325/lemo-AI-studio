import { create } from 'zustand';
import { GenerationConfig, UploadedImage, Preset } from '@/components/features/playground-v2/types';
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

    // Presets
    presets: Preset[];
    initPresets: () => void;
    addPreset: (preset: Preset, coverFile?: File) => void;
    removePreset: (id: string) => void;
    updatePreset: (preset: Preset, coverFile?: File) => void;
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
                config: newConfig,
                // 如果切换到通用模型，清理掉选中的工作流配置
                selectedWorkflowConfig: model === 'Workflow' ? state.selectedWorkflowConfig : undefined
            };
        });
    },

    remix: (result) => {
        set((state) => {
            const finalModel = result.config.base_model || state.selectedModel;
            return {
                selectedModel: finalModel,
                selectedWorkflowConfig: result.workflow || (finalModel === 'Workflow' ? state.selectedWorkflowConfig : undefined),
                selectedLoras: result.loras || state.selectedLoras,
                config: { ...state.config, ...result.config, base_model: finalModel }
            };
        });
    },

    // Presets
    presets: [],

    // Initialize Presets (Fetching from API)
    initPresets: async () => {
        try {
            const res = await fetch('/api/presets');
            if (res.ok) {
                const data = await res.json();
                set({ presets: data });
            } else {
                console.error("Failed to fetch presets");
            }
        } catch (e) {
            console.error("Error fetching presets:", e);
        }
    },

    addPreset: async (preset: Preset, coverFile?: File) => {
        try {
            const formData = new FormData();
            formData.append('json', JSON.stringify(preset));
            if (coverFile) {
                formData.append('cover', coverFile);
            }

            const res = await fetch('/api/presets', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const savedPreset = await res.json();
                set((state) => ({ presets: [savedPreset, ...state.presets] }));
            }
        } catch (e) {
            console.error("Failed to add preset", e);
        }
    },

    removePreset: async (id: string) => {
        try {
            await fetch(`/api/presets?id=${id}`, { method: 'DELETE' });
            set((state) => ({ presets: state.presets.filter(p => p.id !== id) }));
        } catch (e) {
            console.error("Failed to delete preset", e);
        }
    },

    updatePreset: async (preset: Preset, coverFile?: File) => {
        try {
            const formData = new FormData();
            formData.append('json', JSON.stringify(preset));
            if (coverFile) {
                formData.append('cover', coverFile);
            }

            const res = await fetch('/api/presets', {
                method: 'POST', // Reusing POST for update as it overwrites
                body: formData
            });

            if (res.ok) {
                const savedPreset = await res.json();
                set((state) => ({
                    presets: state.presets.map(p => p.id === savedPreset.id ? savedPreset : p)
                }));
            }
        } catch (e) {
            console.error("Failed to update preset", e);
        }
    },
}));
