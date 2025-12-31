"use client";


import { useState, useEffect, useRef, RefObject, useLayoutEffect } from "react";
import { useToast } from "@/hooks/common/use-toast";
import { Button } from "@/components/ui/button";

import { usePromptOptimization, AIModel } from "@/hooks/features/PlaygroundV2/usePromptOptimization";


import { useGenerationService } from "@/hooks/features/PlaygroundV2/useGenerationService";
import { useAIService } from "@/hooks/ai/useAIService";
import { GoogleApiStatus } from "@/components/features/playground-v2/GoogleApiStatus";
import PromptInput from "@/components/features/playground-v2/PromptInput";
import ControlToolbar from "@/components/features/playground-v2/ControlToolbar";
import HistoryList from "@/components/features/playground-v2/HistoryList";
import GalleryView from "@/components/features/playground-v2/GalleryView";
import Spiral from "@/components/ui/spiral";
import ImagePreviewModal from "@/components/features/playground-v2/ImagePreviewModal";
import ImageEditorModal from "@/components/features/playground-v2/ImageEditorModal";
import WorkflowSelectorDialog from "@/components/features/playground-v2/WorkflowSelectorDialog";
import BaseModelSelectorDialog from "@/components/features/playground-v2/BaseModelSelectorDialog";
import LoraSelectorDialog, { SelectedLora } from "@/components/features/playground-v2/LoraSelectorDialog";
import { PresetCarousel } from "@/components/features/playground-v2/PresetCarousel";
import { PresetManagerDialog } from "@/components/features/playground-v2/PresetManagerDialog";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import type { IViewComfy } from "@/lib/providers/view-comfy-provider";
import type { WorkflowApiJSON } from "@/lib/workflow-api-parser";
import type { UIComponent } from "@/types/features/mapping-editor";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { X, Plus, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlaygroundStore } from "@/lib/store/playground-store";
import { StylesMarquee } from "@/components/features/playground-v2/StylesMarquee";
import type { GenerationConfig, GenerationResult } from "@/components/features/playground-v2/types";

import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(Flip, useGSAP);

export interface PlaygroundV2PageProps {
  onEditMapping?: (workflow: IViewComfy) => void;
  onGenerate?: () => void;
  onHistoryChange?: (history: GenerationResult[]) => void;
  backgroundRefs?: {
    cloud: RefObject<HTMLDivElement | null>;
    tree: RefObject<HTMLDivElement | null>;
    dog: RefObject<HTMLDivElement | null>;
    man: RefObject<HTMLDivElement | null>;
    front: RefObject<HTMLDivElement | null>;
    bg: RefObject<HTMLDivElement | null>;
  };
}

export function PlaygroundV2Page({
  onEditMapping,
  onGenerate,
}: PlaygroundV2PageProps) {

  const { toast } = useToast();
  const config = usePlaygroundStore(s => s.config);
  const updateConfig = usePlaygroundStore(s => s.updateConfig);
  const containerRef = useRef<HTMLDivElement>(null);
  const uploadedImages = usePlaygroundStore(s => s.uploadedImages);
  const setUploadedImages = usePlaygroundStore(s => s.setUploadedImages);
  const selectedModel = usePlaygroundStore(s => s.selectedModel);
  const setSelectedModel = usePlaygroundStore(s => s.setSelectedModel);
  const selectedWorkflowConfig = usePlaygroundStore(s => s.selectedWorkflowConfig);
  const setSelectedWorkflowConfig = usePlaygroundStore(s => s.setSelectedWorkflowConfig);
  const selectedLoras = usePlaygroundStore(s => s.selectedLoras);
  const setSelectedLoras = usePlaygroundStore(s => s.setSelectedLoras);
  const presets = usePlaygroundStore(s => s.presets);
  const initPresets = usePlaygroundStore(s => s.initPresets);
  const generationHistory = usePlaygroundStore(s => s.generationHistory);
  const setGenerationHistory = usePlaygroundStore(s => s.setGenerationHistory);

  const setConfig = (val: GenerationConfig | ((prev: GenerationConfig) => GenerationConfig)) => {
    const currentConfig = usePlaygroundStore.getState().config;
    if (typeof val === 'function') {
      updateConfig(val(currentConfig));
    } else {
      updateConfig(val);
    }
  };

  const hasGenerated = usePlaygroundStore(s => s.hasGenerated);
  const setHasGenerated = usePlaygroundStore(s => s.setHasGenerated);
  const remix = usePlaygroundStore(s => s.remix);
  const isAspectRatioLocked = usePlaygroundStore(s => s.isAspectRatioLocked);
  const setIsAspectRatioLocked = usePlaygroundStore(s => s.setAspectRatioLocked);
  const isMockMode = usePlaygroundStore(s => s.isMockMode);
  const setMockMode = usePlaygroundStore(s => s.setMockMode);
  const isSelectorExpanded = usePlaygroundStore(s => s.isSelectorExpanded);
  const setIsSelectorExpanded = usePlaygroundStore(s => s.setSelectorExpanded);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedAIModel, setSelectedAIModel] = useState<AIModel>('gemini');
  const [isWorkflowDialogOpen, setIsWorkflowDialogOpen] = useState(false);
  const [isBaseModelDialogOpen, setIsBaseModelDialogOpen] = useState(false);
  const [isLoraDialogOpen, setIsLoraDialogOpen] = useState(false);
  const [workflows, setWorkflows] = useState<IViewComfy[]>([]);
  const [isStackHovered, setIsStackHovered] = useState(false);
  const [isPresetManagerOpen, setIsPresetManagerOpen] = useState(false);
  const [isPresetExpanded] = useState(false);
  const [isDescribing, setIsDescribing] = useState(false);
  const [activeGalleryTab, setActiveGalleryTab] = useState<'gallery' | 'prompts' | 'styles'>('gallery');





  // To properly capture state before change:
  const lastState = useRef<Flip.FlipState | null>(null);

  // Capture state whenever we are in the "Center" mode, so we have it ready when we switch.
  useGSAP(() => {
    if (!hasGenerated) {
      const state = Flip.getState("[data-flip-id='prompt-input-container']");
      lastState.current = state;
    }
  }, [hasGenerated, uploadedImages.length]); // Update state if images change (resizes container)


  useGSAP(() => {
    if (hasGenerated) {
      const hasFromState = !!lastState.current;

      // 1. Flip Input (only if we have a previous state to flip from)
      if (hasFromState && lastState.current) {
        Flip.from(lastState.current, {
          targets: "[data-flip-id='prompt-input-container']",
          duration: 0.8,
          ease: "power2.out",
          absolute: true,
          zIndex: 50,
        });
      }

      // 2. Animate History/Gallery Enter
      const delay = hasFromState ? 0.3 : 0;
      const duration = hasFromState ? 0.8 : 0.4;

      // Ensure container has opacity (if it was hidden by default)
      gsap.set(".history-enter-container", { opacity: 1 });

      // Animate from invisible if we are transitioning
      if (hasFromState) {
        gsap.fromTo(".history-enter-container",
          { opacity: 0 },
          { opacity: 1, duration: 0.4, delay: 0 }
        );
      } else {
        // If just loading/refreshing, ensure it's visible. 
        // We can do a quick fade in for polish
        gsap.fromTo(".history-enter-container",
          { opacity: 0 },
          { opacity: 1, duration: 0.3 }
        );
      }

      gsap.fromTo([".history-list-content", ".gallery-view-content"],
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: duration,
          stagger: 0.1,
          ease: "power3.out",
          delay: delay
        }
      );
    }
  }, [hasGenerated]);

  useEffect(() => {
    initPresets();
  }, [initPresets]);

  // Helper to save history to backend
  const saveHistoryToBackend = async (item: GenerationResult) => {
    try {
      // Ensure we send essential fields for the lean history.json
      const historyItem = {
        imageUrl: item.savedPath || item.imageUrl || '',
        prompt: item.config?.prompt || '',
        timestamp: item.timestamp || new Date().toISOString()
      };
      await fetch('/api/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(historyItem),
      });
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  };

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const res = await fetch('/api/view-comfy');
        if (res.ok) {
          const data = await res.json();
          setWorkflows(data.viewComfys || []);
        }
      } catch (error) {
        console.error("Failed to fetch workflows", error);
      }
    };
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/history');
        if (res.ok) {
          const data = await res.json();
          if (data.history && data.history.length > 0) {
            setGenerationHistory(data.history);
          }
        }
      } catch (error) {
        console.error("Failed to fetch history", error);
      }
    };
    fetchWorkflows();
    fetchHistory();
  }, [setGenerationHistory]);

  useEffect(() => {
    const path = uploadedImages[0]?.path;
    updateConfig({ ref_image: path });
  }, [uploadedImages, updateConfig]);

  const baseSystemInstruction = `
  # 角色
你是备受赞誉的提示词大师Lemo-prompt，专为AI绘图工具flux打造提示词。

## 技能
### 技能1: 理解用户意图
利用先进的自然语言处理技术，准确剖析用户输入自然语言背后的真实意图，精准定位用户对于图像生成的核心需求。在描述物品时，避免使用"各种""各类"等概称，要详细列出具体物品。若用户提供图片，你会精准描述图片中的内容信息与构图，并按照图片信息完善提示词。

### 2: 优化构图与细节
运用专业的构图知识和美学原理，自动为场景增添丰富且合理的细节，精心调整构图，显著提升生成图像的构图完整性、故事性和视觉吸引力。

### 技能3: 概念转化
熟练运用丰富的视觉语言库，将用户提出的抽象概念快速且准确地转化为可执行的视觉描述，让抽象想法能通过图像生动、直观地呈现。

## 输出格式
1. 仅输出完整提示词中文版本
2. 使用精炼且生动的语言表达
3. 文字控制在200字以内`


  const applyWorkflowDefaults = (workflow: IViewComfy) => {
    const mappingConfig = workflow.viewComfyJSON.mappingConfig as { components: UIComponent[] } | undefined;
    const newConfig = { ...config };
    const newLoras: SelectedLora[] = [];

    if (mappingConfig?.components && Array.isArray(mappingConfig.components) && mappingConfig.components.length > 0) {
      const components = mappingConfig.components;
      const workflowApiJSON = workflow.workflowApiJSON as WorkflowApiJSON | undefined;
      components.forEach((comp: UIComponent) => {
        const paramName = comp.properties?.paramName;
        const defaultValue = comp.properties?.defaultValue;
        const workflowPath = comp.mapping?.workflowPath;
        if (!paramName) return;
        const getActualValue = () => {
          if (workflowApiJSON && Array.isArray(workflowPath) && workflowPath.length >= 3) {
            const [nodeId, section, key] = workflowPath;
            if (section === "inputs") {
              return workflowApiJSON[nodeId]?.inputs?.[key];
            }
          }
          return undefined;
        };
        const actualValue = getActualValue();
        if (paramName === 'prompt') {
          if (actualValue && typeof actualValue === 'string') newConfig.prompt = actualValue;
          else if (defaultValue) newConfig.prompt = defaultValue;
        } else if (paramName === 'width') {
          if (actualValue && (typeof actualValue === 'number' || typeof actualValue === 'string')) newConfig.img_width = Number(actualValue);
          else if (defaultValue) newConfig.img_width = Number(defaultValue);
        } else if (paramName === 'height') {
          if (actualValue && (typeof actualValue === 'number' || typeof actualValue === 'string')) newConfig.image_height = Number(actualValue);
          else if (defaultValue) newConfig.image_height = Number(defaultValue);
        } else if (paramName === 'batch_size') {
          if (actualValue && (typeof actualValue === 'number' || typeof actualValue === 'string')) newConfig.gen_num = Number(actualValue);
          else if (defaultValue) newConfig.gen_num = Number(defaultValue);
        } else if (paramName === 'base_model' || paramName === 'model') {
          if (actualValue && typeof actualValue === 'string') newConfig.base_model = actualValue;
          else if (defaultValue) newConfig.base_model = defaultValue;
        } else if (['lora', 'lora1', 'lora2', 'lora3'].includes(paramName)) {
          const val = (actualValue && typeof actualValue === 'string') ? actualValue : defaultValue;
          if (val && typeof val === 'string') {
            newLoras.push({ model_name: val, strength: 1.0 });
          }
        }
      });
    } else {
      const allInputs = [
        ...(workflow.viewComfyJSON.inputs || []),
        ...(workflow.viewComfyJSON.advancedInputs || [])
      ].flatMap(group => group.inputs);
      allInputs.forEach(input => {
        const title = (input.title || "").toLowerCase();
        const val = input.value;
        if (title.includes("prompt") || title.includes("文本") || title.includes("提示")) {
          if (typeof val === "string") newConfig.prompt = val;
        } else if (title === "width" || title.includes("width")) {
          if (typeof val === "number" || typeof val === "string") newConfig.img_width = Number(val);
        } else if (title === "height" || title.includes("height")) {
          if (typeof val === "number" || typeof val === "string") newConfig.image_height = Number(val);
        } else if (title === "batch_size" || title.includes("batch") || title.includes("数量")) {
          if (typeof val === "number" || typeof val === "string") newConfig.gen_num = Number(val);
        } else if (title.includes("model") || title.includes("模型")) {
          if (!title.includes("lora")) {
            if (typeof val === "string") newConfig.base_model = val;
          }
        }
        if (title.includes("lora")) {
          if (typeof val === "string" && val) {
            newLoras.push({ model_name: val, strength: 1.0 });
          }
        }
      });
    }
    setConfig(newConfig);
    if (selectedModel !== 'Workflow') setSelectedModel('Workflow');
    if (newLoras.length > 0) setSelectedLoras(newLoras);
  };

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<GenerationResult | undefined>(undefined);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingImageUrl, setEditingImageUrl] = useState<string>("");

  const { handleGenerate, isGenerating } = useGenerationService();
  const { callVision } = useAIService();
  const { optimizePrompt, isOptimizing } = usePromptOptimization({ systemInstruction: baseSystemInstruction });

  const handleFilesUpload = async (files: File[] | FileList) => {
    const uploads = Array.from(files).filter(f => f.type.startsWith('image/'));
    for (const file of uploads) {
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve) => { reader.onload = (e) => resolve(String(e.target?.result)); reader.readAsDataURL(file); });
      const form = new FormData();
      form.append('file', file);
      try {
        const resp = await fetch('/api/upload', { method: 'POST', body: form });
        const json = await resp.json();
        const path = resp.ok && json?.path ? String(json.path) : undefined;
        const base64Data = dataUrl.split(',')[1];
        setUploadedImages(prev => [...prev, { file, base64: base64Data, previewUrl: dataUrl, path }]);
      } catch {
        const base64Data = dataUrl.split(',')[1];
        setUploadedImages(prev => [...prev, { file, base64: base64Data, previewUrl: dataUrl }]);
      }
    }
  };
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files; if (!files) return;
    await handleFilesUpload(files);
  };
  const removeImage = (index: number) => { setUploadedImages(prev => prev.filter((_, i) => i !== index)); };

  const AR_MAP: Record<string, Record<string, { w: number; h: number }>> = {
    '1:1': { '1K': { w: 1024, h: 1024 }, '2K': { w: 2048, h: 2048 }, '4K': { w: 4096, h: 4096 } },
    '2:3': { '1K': { w: 848, h: 1264 }, '2K': { w: 1696, h: 2528 }, '4K': { w: 3392, h: 5056 } },
    '3:2': { '1K': { w: 1264, h: 848 }, '2K': { w: 2528, h: 1696 }, '4K': { w: 5056, h: 3392 } },
    '3:4': { '1K': { w: 896, h: 1200 }, '2K': { w: 1792, h: 2400 }, '4K': { w: 3584, h: 4800 } },
    '4:3': { '1K': { w: 1200, h: 896 }, '2K': { w: 2400, h: 1792 }, '4K': { w: 4800, h: 3584 } },
    '4:5': { '1K': { w: 928, h: 1152 }, '2K': { w: 1856, h: 2304 }, '4K': { w: 3712, h: 4608 } },
    '5:4': { '1K': { w: 1152, h: 928 }, '2K': { w: 2304, h: 1856 }, '4K': { w: 4608, h: 3712 } },
    '9:16': { '1K': { w: 768, h: 1376 }, '2K': { w: 1536, h: 2752 }, '4K': { w: 3072, h: 5504 } },
    '16:9': { '1K': { w: 1376, h: 768 }, '2K': { w: 2752, h: 1536 }, '4K': { w: 5504, h: 3072 } },
    '21:9': { '1K': { w: 1584, h: 672 }, '2K': { w: 3168, h: 1344 }, '4K': { w: 6336, h: 2688 } },
  };

  const aspectRatioPresets = Object.keys(AR_MAP).map(name => ({
    name,
    width: AR_MAP[name]['1K'].w,
    height: AR_MAP[name]['1K'].h
  }));

  const getCurrentAspectRatio = () => {
    const sizeKeys = ['1K', '2K', '4K'];
    for (const [ar, sizes] of Object.entries(AR_MAP)) {
      for (const size of sizeKeys) {
        if (sizes[size].w === config.img_width && sizes[size].h === config.image_height) return ar;
      }
    }
    return "16:9";
  };
  const handleWidthChange = (newWidth: number) => { if (isAspectRatioLocked && config.image_height > 0) { const ratio = config.img_width / config.image_height; const newHeight = Math.round(newWidth / ratio); setConfig(prev => ({ ...prev, img_width: newWidth, image_height: newHeight })); } else { setConfig(prev => ({ ...prev, img_width: newWidth })); } };
  const handleHeightChange = (newHeight: number) => { if (isAspectRatioLocked && config.image_height > 0) { const ratio = config.img_width / config.image_height; const newWidth = Math.round(newHeight * ratio); setConfig(prev => ({ ...prev, image_height: newHeight, img_width: newWidth })); } else { setConfig(prev => ({ ...prev, image_height: newHeight })); } };
  const handleOptimizePrompt = async () => {
    const optimizedText = await optimizePrompt(config.prompt, selectedAIModel);
    if (optimizedText) setConfig(prev => ({ ...prev, prompt: optimizedText }));
  };

  const handleDescribe = async () => {
    if (uploadedImages.length === 0) {
      toast({ title: "错误", description: "请先上传图片", variant: "destructive" });
      return;
    }

    setIsDescribing(true);
    setHasGenerated(true); // Trigger split layout immediately like generate

    // Create a temporary loading card
    const loadingId = `describe-loading-${Date.now()}`;
    const loadingCard: GenerationResult = {
      id: loadingId,
      imageUrl: uploadedImages[0].previewUrl,
      config: {
        ...config,
        prompt: "Analyzing image...",
      },
      timestamp: new Date().toISOString(),
      isLoading: true,
      type: 'text',
      sourceImage: uploadedImages[0].previewUrl,
    };

    // Insert loading card
    setGenerationHistory(prev => [loadingCard, ...prev]);

    try {
      // 1. Convert the first image to base64 if needed, or use existing base64
      let base64 = uploadedImages[0].base64;
      if (!base64 && uploadedImages[0].previewUrl.startsWith('data:')) {
        base64 = uploadedImages[0].previewUrl.split(',')[1];
      }

      if (!base64) {
        throw new Error("无法获取图片数据");
      }

      // 2. Call unified Vision service
      const result = await callVision({
        image: `data:image/png;base64,${base64}`,
        systemPrompt: `## 角色
您是一位专业的AI图像标注员，专门为生成式AI模型创建高质量、精准的训练数据集。您的目标是使用自然语言准确、客观地描述图像。

## 任务
分析提供的图像，并生成 4 份内容侧重点略有不同的描述。

## 标注指南
1. **格式：**自然语言，80字左右。
2. **客观性：**仅描述图像中呈现的主要视觉内容。
3. **分段：**请一次性返回 4 个结果，每个结果之间使用 '|||' 作为分隔符。
4. **精确性：**使用精确的术语（例如，不要用“花”，而应使用“红玫瑰”；不要用“枪”，而应使用“AK-47”）。

仅返回中文结果

## 输出结构优先级
[主体] -> [动作/姿势] -> [服装] -> [背景] -> [文字信息]

注意：**除了 4 个描述内容及其之间的 '|||' 分隔符外，不要返回任何额外文字。**`
      });

      const text = result?.text || "";
      const results = text.split('|||').map((s: string) => s.trim()).filter(Boolean);

      if (results.length > 0) {
        // Create history cards for each description result
        const newHistoryItems: GenerationResult[] = results.map((prompt: string, index: number) => ({
          id: `describe-${Date.now()}-${index}`,
          imageUrl: uploadedImages[0].previewUrl, // Use uploaded image as preview
          config: {
            ...config,
            prompt: prompt, // Each card has its own description
          },
          timestamp: new Date().toISOString(),
          isLoading: false,
          type: 'text',
          sourceImage: uploadedImages[0].previewUrl,
        }));

        // Remove loading card and add real results
        setGenerationHistory(prev => [...newHistoryItems, ...prev.filter(item => item.id !== loadingId)]);

        // Also save each description to backend
        newHistoryItems.forEach(item => saveHistoryToBackend(item));

        toast({ title: "描述成功", description: `已生成 ${results.length} 组描述卡片` });
      } else {
        throw new Error("解析描述结果失败");
      }
    } catch (error) {
      console.error("Describe Error:", error);
      // Remove loading card on error
      setGenerationHistory(prev => prev.filter(item => item.id !== loadingId));
      toast({ title: "描述失败", description: error instanceof Error ? error.message : "未知错误", variant: "destructive" });
    } finally {
      setIsDescribing(false);
    }
  };

  const handleBatchUse = async (results: GenerationResult[]) => {
    if (!results || results.length === 0) return;
    toast({ title: "批量生成中", description: `即将开始 ${results.length} 个生成任务...` });
    for (const result of results) {
      const newConfig = { ...config, prompt: result.config.prompt };
      await handleGenerate(newConfig);
      await new Promise(r => setTimeout(r, 200));
    }
  };

  // Removed executeBackgroundGeneration and the old handleGenerate functions.
  // The new handleGenerate from useGenerationService will be used.

  const handleRegenerate = async (result: GenerationResult) => {
    // 补全 config 中的 prompt 字段，因为 history 对象中它们可能是分开存储的
    const fullConfig = {
      ...result.config,
      prompt: result.prompt || result.config?.prompt || ''
    } as GenerationConfig;

    // 使用专用的 remix action 同步所有状态 (模型、Lora、配置)
    remix({
      config: fullConfig,
      loras: (result as GenerationResult & { loras?: SelectedLora[] }).loras,
      workflow: (result as GenerationResult & { workflow?: IViewComfy }).workflow
    });

    // 直接传递补全后的 config 避免竞态
    handleGenerate(fullConfig);
  };

  const handleDownload = (imageUrl: string) => { const link = document.createElement("a"); link.href = imageUrl; link.download = `PlaygroundV2-${Date.now()}.png`; document.body.appendChild(link); link.click(); document.body.removeChild(link); };

  const openImageModal = (result: GenerationResult) => { setSelectedResult(result); setIsImageModalOpen(true); };
  const closeImageModal = () => {
    setIsImageModalOpen(false);
    // Don't clear selectedResult here to allow exit animation to use the data
  };

  const handleEditImage = (result: GenerationResult) => {
    const url = result.imageUrl || (result.imageUrls && result.imageUrls[0]) || "";
    if (url) {
      setEditingImageUrl(url);
      setIsEditorOpen(true);
      setIsImageModalOpen(false);
    }
  };

  const handleSaveEditedImage = async (dataUrl: string) => {
    setIsEditorOpen(false);
    try {
      // 1. Convert dataUrl to Blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `edited-${Date.now()}.png`, { type: 'image/png' });

      // 2. Upload to server to get a path (consistent with standard upload flow)
      const form = new FormData();
      form.append('file', file);
      const uploadResp = await fetch('/api/upload', { method: 'POST', body: form });
      const uploadJson = await uploadResp.json();
      const path = uploadResp.ok && uploadJson?.path ? String(uploadJson.path) : undefined;

      // 3. Add to playground state
      const base64Data = dataUrl.split(',')[1];
      setUploadedImages(prev => [
        ...prev,
        { file, base64: base64Data, previewUrl: dataUrl, path }
      ]);

      toast({ title: "Image Saved", description: "The edited image has been added to your uploads." });
    } catch (error) {
      console.error("Failed to save edited image:", error);
      toast({ title: "Error", description: "Failed to save edited image", variant: "destructive" });
    }
  };


  // 样式定义

  const Inputbg = "relative z-10 flex items-center justify-center w-full text-black flex-col rounded-[30px] bg-black/40 backdrop-blur-xl border border-white/20 p-2 mx-auto";

  /**
   * Refactored to inline into the main input container for aggregation + hover expansion
   */



  // Input UI Helper to avoid duplication
  const renderInputUI = (isSidebar: boolean) => (
    <div className={cn(
      "flex flex-col items-center w-full transition-all duration-500 ease-in-out px-4 pointer-events-auto",
      isSidebar ? "w-full" : "max-w-4xl -mt-36"
    )}>
      {!isSidebar && (
        <h1
          className="text-[6rem] text-white font-medium text-center mb-4 h-auto opacity-100 transition-all duration-300  whitespace-nowrap"
          style={{ fontFamily: "'InstrumentSerif', serif" }}
        >
          ✨Turn any idea into a stunning image
        </h1>
      )}

      <div
        className="relative w-full rounded-[10px] transition-all duration-300"
      >
        <div className={Inputbg}>
          <div className="flex items-start gap-0 bg-black/80 border border-white/20 rounded-3xl w-full pl-2">
            <div
              className="flex items-center"
              onMouseEnter={() => setIsStackHovered(true)}
              onMouseLeave={() => setIsStackHovered(false)}
            >
              <div className="relative flex items-center h-[94px] ml-3 z-[200]">
                <div
                  className="relative flex items-center transition-all"
                  style={{ width: uploadedImages.length > 0 ? (isStackHovered ? (uploadedImages.length * 60 + 20) : 64) : 40 }}
                >
                  {uploadedImages.map((image, index) => {
                    const rotations = [-6, 4, -2, 3];
                    const rotation = rotations[index % rotations.length];
                    return (
                      <div
                        key={index}
                        style={{
                          transform: `translateX(${isStackHovered ? (index * 60) : (index * 4)}px) translateY(${isStackHovered ? 0 : (index * 2)}px) rotate(${isStackHovered ? 0 : rotation}deg)`,
                          zIndex: (uploadedImages.length - index) + 100,
                          opacity: 1
                        }}
                        className="absolute left-0 transition-transform duration-100"
                      >
                        <div className="relative group">
                          <Image
                            src={image.previewUrl}
                            alt={`Uploaded ${index + 1}`}
                            width={56}
                            height={56}
                            className="w-14 h-14 object-cover rounded-sm  bg-black shadow-lg transition-transform duration-100"
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                            className="absolute -top-2 -right-2 bg-black text-white border border-white/40 rounded-full w-6 h-6 flex items-center justify-center scale-0 group-hover:scale-100 transition-transform duration-100 hover:bg-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {/* 上传按钮 */}
                  <motion.button
                    onClick={() => fileInputRef.current?.click()}
                    initial={{ rotate: -6 }}
                    animate={{ rotate: -6 }}
                    whileHover={{
                      rotate: 0,

                    }}
                    transition={{
                      type: "tween",
                      ease: "linear",
                      duration: 0.2
                    }}


                    style={{
                      transform: uploadedImages.length > 0
                        ? `translateX(${isStackHovered ? (uploadedImages.length * 60 - 0) : 34}px) translateY(16px) scale(0.8)`
                        : 'none'
                    }}
                    className={cn(
                      "flex items-center justify-center rounded-2xl text-white border-2 border-white/20 bg-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]  hover:translate-y-2 hover:bg-white/20 transition-all group z-[1100]",
                      uploadedImages.length > 0 ? "w-8 h-8 absolute top-0 -right-3 bg-black/40 backdrop-blur-md " : "w-14 h-14 absolute"
                    )}
                  >
                    <Plus className={cn("w-4 h-4", uploadedImages.length > 0 ? "w-4 h-4" : "w-5 h-5")} />
                  </motion.button>
                </div>
              </div>
            </div>

            <div className="flex-1 mt-1 ml-4 flex items-center gap-2">
              <div className="flex-1">
                <PromptInput
                  prompt={config.prompt}
                  onPromptChange={(val) => setConfig(prev => ({ ...prev, prompt: val }))}
                  uploadedImages={uploadedImages}
                  onRemoveImage={removeImage}
                  isOptimizing={isOptimizing}
                  onOptimize={handleOptimizePrompt}
                  selectedAIModel={selectedAIModel}
                  onAIModelChange={setSelectedAIModel}
                  onAddImages={handleFilesUpload}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 absolute right-4 w-auto top-4 text-white rounded-2xl hover:bg-white/10 "
                disabled={isOptimizing}
                onClick={() => {
                  if (!isOptimizing) {
                    handleOptimizePrompt();
                  }
                }}
              >
                <motion.div
                  animate={isOptimizing ? {
                    filter: [
                      "drop-shadow(0 0 2px rgba(255, 255, 255, 0.4))",
                      "drop-shadow(0 0 10px rgba(255, 255, 255, 0.8))",
                      "drop-shadow(0 0 2px rgba(255, 255, 255, 0.4))"
                    ]
                  } : {}}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="flex items-center justify-center"
                >
                  <Sparkles className="w-2 h-2" />
                </motion.div>
              </Button>
            </div>
          </div>

          <ControlToolbar
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            config={config}
            onConfigChange={(newConf) => setConfig(prev => ({ ...prev, ...newConf }))}
            onWidthChange={handleWidthChange}
            onHeightChange={handleHeightChange}
            aspectRatioPresets={aspectRatioPresets}
            currentAspectRatio={getCurrentAspectRatio()}
            onAspectRatioChange={(ar: string) => {
              const size = (config.base_model === 'Nano banana') ? (config.image_size || '1K') : '1K';
              const resolution = AR_MAP[ar]?.[size] || AR_MAP[ar]?.['1K'];
              if (resolution) {
                updateConfig({ img_width: resolution.w, image_height: resolution.h });
              }
            }}
            currentImageSize={(config.image_size as '1K' | '2K' | '4K') || '1K'}
            onImageSizeChange={(size: '1K' | '2K' | '4K') => {
              const ar = getCurrentAspectRatio();
              const resolution = AR_MAP[ar]?.[size];
              if (resolution) {
                updateConfig({ image_size: size, img_width: resolution.w, image_height: resolution.h });
              }
            }}
            isAspectRatioLocked={isAspectRatioLocked}
            onToggleAspectRatioLock={() => setIsAspectRatioLocked(!isAspectRatioLocked)}
            onGenerate={() => { onGenerate?.(); handleGenerate(); }}
            isGenerating={isGenerating}
            uploadedImagesCount={uploadedImages.length}
            loadingText={selectedModel === "Seed 4.0" ? "Seed 4.0 生成中..." : "生成中..."}
            onOpenWorkflowSelector={() => setIsWorkflowDialogOpen(true)}
            onOpenBaseModelSelector={() => setIsBaseModelDialogOpen(true)}
            onOpenLoraSelector={() => setIsLoraDialogOpen(true)}
            selectedWorkflowName={selectedWorkflowConfig?.viewComfyJSON.title}
            selectedBaseModelName={config.base_model}
            selectedLoraNames={selectedLoras.map(l => l.model_name)}
            workflows={workflows}
            onWorkflowSelect={(wf) => { setSelectedWorkflowConfig(wf); applyWorkflowDefaults(wf); }}
            isMockMode={isMockMode}
            onMockModeChange={setMockMode}
            isSelectorExpanded={isSelectorExpanded}
            onSelectorExpandedChange={setIsSelectorExpanded}
            onDescribe={handleDescribe}
            isDescribing={isDescribing}
            uploadedImages={uploadedImages}
          />
          {/* 
          预设按钮
          <Button
            variant="ghost"
            size="sm"
            className="h-4 gap-1 text-white/30 hover:text-white/60 hover:bg-white/5 rounded-full px-3 transition-all"
            onClick={() => setIsPresetExpanded(!isPresetExpanded)}
          >
            {isPresetExpanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                <span className="text-xs">收起预设</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                <span className="text-xs">展开预设</span>
              </>
            )}
          </Button> */}

          <div className="w-full px-4">
            {/* <div className="flex justify-center mb-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-4 gap-1 text-white/30 hover:text-white/60 hover:bg-white/5 rounded-full px-3 transition-all"
                onClick={() => setIsPresetExpanded(!isPresetExpanded)}
              >
                {isPresetExpanded ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    <span className="text-xs">收起预设</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />

                  </>
                )}
              </Button>
            </div> */}

            <AnimatePresence>
              {isPresetExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <PresetCarousel
                    presets={presets}
                    onSelectPreset={(preset) => {
                      setConfig(prev => ({
                        ...prev,
                        prompt: preset.prompt,
                        base_model: preset.base_model,
                        img_width: preset.width,
                        image_height: preset.height,
                        image_size: preset.image_size
                      }));
                      setSelectedModel(preset.base_model);
                      toast({ title: "已应用预设", description: `使用了预设: ${preset.title}` });
                    }}
                    onOpenManager={() => setIsPresetManagerOpen(true)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div >
  );

  return (
    <main className="relative h-screen flex bg-transparent overflow-hidden">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        multiple
        onChange={handleImageUpload}
      />

      <div ref={containerRef} className="relative w-full h-full">
        {/* Input Container - Persists across views */}
        <div
          className={cn(
            "fixed z-[40] transition-none flex justify-center pointer-events-none", // Fixed positioning to help Flip calculation, pointer-events-none so it doesn't block
            !hasGenerated
              ? "top-[40vh] left-0 right-0 -translate-y-1/2 w-full"
              : "top-24 left-0 w-[70%] " // Position at top of left panel (assuming 70% default width)
          )}
        >
          <div
            data-flip-id="prompt-input-container"
            className={cn(
              "w-full relative",
              !hasGenerated ? "max-w-4xl" : "max-w-[65vw]"
            )}
          >
            {renderInputUI(hasGenerated)}
          </div>
        </div>


        {!hasGenerated ? (
          // Initial State Content
          <motion.div
            key="initial-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative flex-1 flex flex-col items-center justify-center h-full pb-20 pointer-events-none" // pointer-events-none to let input click through if needed, though input is z-40
          >
            {/* Only show StylesMarquee in initial state */}
            <div className="absolute bottom-4 left-0 right-0 z-20 overflow-visible pointer-events-auto">
              <StylesMarquee />
            </div>
          </motion.div>
        ) : (
          // Split Layout Content
          <div className="flex flex-1 w-full h-full overflow-hidden opacity-0 history-enter-container p-0 relative">
            {/* Spiral Background */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-50">
              <Spiral
                totalDots={300}
                dotColor="#ffffff"
                backgroundColor="transparent"
                minOpacity={0.1}
                maxOpacity={0.3}
                duration={8}
              />
            </div>

            <ResizablePanelGroup orientation="horizontal" className="w-full h-full p-6 z-10 relative">
              {/* Left Column: Spacer for Input + History */}
              <ResizablePanel defaultSize={70} minSize={20}>
                <div className="h-full flex flex-col border-b border-white/10 z-20">
                  {/* Spacer for the Input Box which is now fixed/absolute */}
                  <div className="h-[200px] w-full shrink-0" /> {/* Adjust height as needed for input box reservation */}

                  <div className="flex-1 overflow-hidden history-list-content">
                    <HistoryList
                      variant="sidebar"
                      history={generationHistory}
                      onRegenerate={handleRegenerate}
                      onDownload={handleDownload}
                      onImageClick={openImageModal}
                      onBatchUse={handleBatchUse}
                    />
                  </div>
                </div>
              </ResizablePanel>

              {/* <ResizableHandle withHandle /> */}

              {/* Right Column: Gallery */}
              <ResizablePanel defaultSize={30} minSize={10} className=" bg-white/20 rounded-3xl">
                <div className="h-full overflow-y-auto custom-scrollbar relative flex flex-col gallery-view-content">

                  {/* Tab Switcher Header */}
                  <div className="flex items-center gap-1 px-4 pt-6 pb-2 sticky top-0 z-10">
                    <div className="flex items-center bg-black/40 backdrop-blur-md p-1 rounded-full border border-white/10">
                      {(['gallery', 'prompts', 'styles'] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setActiveGalleryTab(tab)}
                          className={cn(
                            "px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300",
                            activeGalleryTab === tab
                              ? "bg-white text-black shadow-lg"
                              : "text-white/50 hover:text-white hover:bg-white/10"
                          )}
                        >
                          {tab === 'gallery' && "全部作品"}
                          {tab === 'prompts' && "Prompt"}
                          {tab === 'styles' && "Style"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1">
                    <GalleryView variant="sidebar" activeTab={activeGalleryTab} />
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        )}
      </div>

      <GoogleApiStatus className="fixed bottom-4 right-4 z-[60]" />

      <div className="top-0 left-0 right-0 pt-24 pointer-events-none">
        <ImagePreviewModal
          isOpen={isImageModalOpen}
          onClose={closeImageModal}
          result={selectedResult}
          onEdit={handleEditImage}
        />

        <ImageEditorModal
          isOpen={isEditorOpen}
          imageUrl={editingImageUrl}
          onClose={() => setIsEditorOpen(false)}
          onSave={handleSaveEditedImage}
        />

      </div>


      <WorkflowSelectorDialog open={isWorkflowDialogOpen} onOpenChange={setIsWorkflowDialogOpen} onSelect={(wf) => setSelectedWorkflowConfig(wf)} onEdit={onEditMapping} />
      <BaseModelSelectorDialog open={isBaseModelDialogOpen} onOpenChange={setIsBaseModelDialogOpen} value={config.base_model || selectedModel} onConfirm={(m) => updateConfig({ base_model: m })} />
      <LoraSelectorDialog open={isLoraDialogOpen} onOpenChange={setIsLoraDialogOpen} value={selectedLoras} onConfirm={(list) => setSelectedLoras(list)} />
      <PresetManagerDialog open={isPresetManagerOpen} onOpenChange={setIsPresetManagerOpen} />
    </main>
  );
}


export default function PlaygroundV2Route() {
  return <PlaygroundV2Page />;
}
