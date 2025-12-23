"use client";


import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/common/use-toast";

import { useImageGeneration } from "@/hooks/features/PlaygroundV2/useImageGeneration";
import { useImageEditing } from "@/hooks/features/PlaygroundV2/useImageEditing";
import { usePromptOptimization, AIModel } from "@/hooks/features/PlaygroundV2/usePromptOptimization";
import { useCozeWorkflow } from "@/hooks/features/useCozeWorkflow";
import { fetchByteArtistImage } from "@/lib/api/PlaygroundV2";
import type { ByteArtistResponse } from "@/lib/api/PlaygroundV2";


import { GoogleApiStatus } from "@/components/features/playground-v2/GoogleApiStatus";
import PromptInput from "@/components/features/playground-v2/PromptInput";
import ControlToolbar from "@/components/features/playground-v2/ControlToolbar";
import HistoryList from "@/components/features/playground-v2/HistoryList";
import ImagePreviewModal from "@/components/features/playground-v2/ImagePreviewModal";
import ImageEditorModal from "@/components/features/playground-v2/ImageEditorModal";
import { GenerationConfig, GenerationResult, UploadedImage } from "@/components/features/playground-v2/types";
import WorkflowSelectorDialog from "@/components/features/playground-v2/WorkflowSelectorDialog";
import BaseModelSelectorDialog from "@/components/features/playground-v2/BaseModelSelectorDialog";
import LoraSelectorDialog, { SelectedLora } from "@/components/features/playground-v2/LoraSelectorDialog";
import type { IViewComfy } from "@/lib/providers/view-comfy-provider";
import type { IMultiValueInput, IInputField } from "@/lib/workflow-api-parser";
import type { WorkflowApiJSON } from "@/lib/workflow-api-parser";
import type { UIComponent } from "@/types/features/mapping-editor";
import type { CozeWorkflowParams } from "@/types/coze-workflow";
import { usePostPlayground } from "@/hooks/features/playground/use-post-playground";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { X, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlaygroundStore } from "@/lib/store/playground-store";


import { RefObject } from "react";

export function PlaygroundV2Page({
  onEditMapping,
  onGenerate,

}: {
  onEditMapping?: (workflow: IViewComfy) => void;
  onGenerate?: () => void;
  backgroundRefs?: {
    cloud: RefObject<HTMLDivElement | null>;
    tree: RefObject<HTMLDivElement | null>;
    dog: RefObject<HTMLDivElement | null>;
    man: RefObject<HTMLDivElement | null>;
    front: RefObject<HTMLDivElement | null>;
    bg: RefObject<HTMLDivElement | null>;
  }
}) {

  const { toast } = useToast();
  const {
    config,
    updateConfig,
    uploadedImages,
    setUploadedImages,
    selectedModel,
    setSelectedModel,
    selectedWorkflowConfig,
    setSelectedWorkflowConfig,
    selectedLoras,
    setSelectedLoras,
  } = usePlaygroundStore();

  const setConfig = (val: GenerationConfig | ((prev: GenerationConfig) => GenerationConfig)) => {
    if (typeof val === 'function') {
      updateConfig(val(config));
    } else {
      updateConfig(val);
    }
  };

  const [hasGenerated, setHasGenerated] = useState(false);
  const [isMockMode, setIsMockMode] = useState(false);
  const [isSelectorExpanded, setIsSelectorExpanded] = useState(false);

  const [isInputHovered, setIsInputHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedAIModel, setSelectedAIModel] = useState<AIModel>('gemini');
  const [algorithm] = useState("lemo_2dillustator");
  const [imageFormat] = useState("png");
  const [generationHistory, setGenerationHistory] = useState<GenerationResult[]>([]);
  const [isAspectRatioLocked, setIsAspectRatioLocked] = useState(false);
  const [isWorkflowDialogOpen, setIsWorkflowDialogOpen] = useState(false);
  const [isBaseModelDialogOpen, setIsBaseModelDialogOpen] = useState(false);
  const [isLoraDialogOpen, setIsLoraDialogOpen] = useState(false);
  const [workflows, setWorkflows] = useState<IViewComfy[]>([]);

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
    fetchWorkflows();
  }, []);

  useEffect(() => {
    const path = uploadedImages[0]?.path;
    updateConfig({ ref_image: path });
  }, [uploadedImages, updateConfig]);

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

  const { generateImage, isGenerating: isGeneratingNano } = useImageGeneration();
  const { editImage, isEditing: isEditingNano } = useImageEditing();
  const { optimizePrompt, isOptimizing } = usePromptOptimization({ systemInstruction: `# 角色\n你是备受赞誉的提示词大师Lemo-prompt，专为AI绘图工具flux打造提示词。\n\n## 技能\n### 技能1: 理解用户意图\n利用先进的自然语言处理技术，准确剖析用户输入自然语言背后的真实意图，精准定位用户对于图像生成的核心需求。在描述物品时，避免使用"各种""各类"等概称，要详细列出具体物品。若用户提供图片，你会精准描述图片中的内容信息与构图，并按照图片信息完善提示词。\n\n### 2: 优化构图与细节\n运用专业的构图知识和美学原理，自动为场景增添丰富且合理的细节，精心调整构图，显著提升生成图像的构图完整性、故事性和视觉吸引力。\n\n### 技能3: 概念转化\n熟练运用丰富的视觉语言库，将用户提出的抽象概念快速且准确地转化为可执行的视觉描述，让抽象想法能通过图像生动、直观地呈现。\n\n### 技能4: 描述纬度\n1. **版式分析**：能准确判断版面率（高版面率：留白少、信息密集，适合促销、营销场景；低版面率：留白多、气质高级，适合文艺、静态设计）；识别构图方式（上下构图、左右构图、中心构图、对角线构图、四角构图、曲线（S线）构图、散点式构图、包围式构图）；分辨网格系统（通栏网格、分栏网格、模块网格、基线网格、层级网格）。\n2. **层级关系**：清晰区分主标题、副标题、正文、辅助文字，通过强调层级信息的大小、颜色、字重，使用不同字号、字重、灰度制造视觉主次。\n3. **字体搭配**：根据字体气质分类进行搭配，如轻盈现代（细、无衬线）、厚重力量（黑体、笔画重）、文艺清新（舒展、居中）、柔和可爱（曲线笔画）、古典沉稳（仿宋、书法感）、现代简洁（极简无装饰）。\n4. **色彩搭配**：准确识别并运用单色（一个色相展开，简洁高级）、相似色（色环上相邻色，柔和统一）、互补色（色环对向色，强对比）、Duotone双色调（叠加两种对比色调，印刷感或冲击力）。\n6.**画面内容**：准确描述画面中的主体 and 辅助元素的主要内容和详细细节。\n\n## 限制\n1. 严禁生成涉及暴力、色情、恐怖等不良内容的描述，确保内容积极健康。\n2. 不提供技术参数相关内容，专注于图像内容和风格的描述。\n3. 不提供与图像生成无关的建议，保持回答的针对性。\n4. 描述必须客观、准确，符合实际情况和大众审美标准。\n\n## 输出格式\n1. 输出完整提示词中文版本\n2. 使用精炼且生动的语言表达\n3. 文字控制在500字以内\n4. lemo是一个卡通角色的名字，不要描述lemo的角色特质，可以描述lemo的穿搭动作表情等！！！` });
  const { runWorkflow, loading: isGeneratingCoze, uploadFile } = useCozeWorkflow({ retryCount: 3, retryDelay: 2000, onSuccess: (result) => { console.log('🎉 Coze Workflow 生成成功:', result); toast({ title: "生成成功", description: "Seed 4.0 图像已成功生成！" }); }, onError: (error) => { console.error('💥 Coze Workflow 生成失败:', error); toast({ title: "生成失败", description: error.message || "Seed 4.0 生成失败", variant: "destructive" }); } });
  const { doPost: runComfyWorkflow, loading: isRunningComfy } = usePostPlayground();
  const isLoading = isGeneratingNano || isEditingNano || isGeneratingCoze || isRunningComfy;

  const blobToDataURL = useCallback((blob: Blob) => new Promise<string>((resolve) => { const r = new FileReader(); r.onloadend = () => resolve(String(r.result)); r.readAsDataURL(blob); }), []);
  const urlToDataURL = async (url: string) => { if (url.startsWith('data:')) return url; const res = await fetch(url); const blob = await res.blob(); return blobToDataURL(blob); };
  const saveImageToOutputs = async (dataUrl: string, metadata?: Record<string, unknown>) => {
    const resp = await fetch('/api/save-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: dataUrl, ext: 'png', subdir: 'outputs', metadata })
    });
    const json = await resp.json();
    return resp.ok && json?.path ? String(json.path) : dataUrl;
  };

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
  const handleOptimizePrompt = async () => { const optimizedText = await optimizePrompt(config.prompt, selectedAIModel); if (optimizedText) setConfig(prev => ({ ...prev, prompt: optimizedText })); };

  const handleGenerate = async () => {
    if (!config.prompt.trim()) {
      toast({ title: "错误", description: "请输入图像描述文本", variant: "destructive" });
      return;
    }

    // 触发外部生成回调（用于播放背景动画等）
    onGenerate?.();
    setHasGenerated(true);

    const taskId = Date.now().toString() + Math.random().toString(36).substring(2, 7);

    // 显式解构当前最新的状态值，防止 executeBackgroundGeneration 内部捕获闭包中的旧值
    const { selectedModel: latestModel, selectedWorkflowConfig: latestWorkflow } = usePlaygroundStore.getState();

    const loadingResult: GenerationResult = {
      id: taskId,
      imageUrl: "",
      // 这里应该使用 config.base_model (真实的路径)，而不是 UI 状态名 latestModel ("Workflow")
      config: { ...config, base_model: config.base_model || latestModel },
      timestamp: new Date().toISOString(),
      isLoading: true
    };

    setGenerationHistory(prev => [loadingResult, ...prev]);

    // 启动后台生成任务 (不等待)
    // 确保传递的是 config.base_model，而不是覆盖掉它的 latestModel ("Workflow")
    executeBackgroundGeneration(taskId, { ...config }, [...uploadedImages], latestModel, isMockMode, latestWorkflow);
  };

  const executeBackgroundGeneration = async (
    taskId: string,
    currentConfig: GenerationConfig,
    currentUploadedImages: UploadedImage[],
    currentModel: string,
    useMock?: boolean,
    currentWorkflowConfig?: IViewComfy,
  ) => {
    try {
      if (useMock) {
        // 模拟生成延迟 (2-4秒)
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
        const mockImageUrl = `/uploads/1750263630880_smwzxy6h4ws.png`;
        const result: GenerationResult = {
          id: taskId,
          imageUrl: mockImageUrl,
          imageUrls: [mockImageUrl],
          config: { ...currentConfig },
          timestamp: new Date().toISOString(),
        };

        setGenerationHistory(prev => prev.map(item => item.id === taskId ? result : item));
        toast({ title: "模拟生成成功", description: "Mock Mode: 已返回占位图" });
        return;
      }

      if (currentUploadedImages.length > 0 && currentModel === "Nano banana") {
        const editingResult = await editImage({
          instruction: currentConfig.prompt,
          originalImage: currentUploadedImages[0].base64,
          referenceImages: currentUploadedImages.slice(1).map(img => img.base64),
          aspectRatio: getCurrentAspectRatio(),
          imageSize: currentConfig.image_size || '1K'
        });
        if (editingResult) {
          const dataUrl = await urlToDataURL(editingResult.imageUrl);
          const savedPath = await saveImageToOutputs(dataUrl, { ...currentConfig, base_model: currentModel, timestamp: editingResult.timestamp });
          const result: GenerationResult = { id: taskId, imageUrl: dataUrl, savedPath, config: { ...currentConfig, base_model: currentModel }, timestamp: editingResult.timestamp };
          setGenerationHistory(prev => prev.map(item => item.id === taskId ? result : item));
        } else {
          setGenerationHistory(prev => prev.filter(item => item.id !== taskId));
        }
      } else if (currentModel === "Nano banana") {
        const genResult = await generateImage({
          prompt: currentConfig.prompt,
          aspectRatio: getCurrentAspectRatio(),
          imageSize: currentConfig.image_size || '1K'
        });
        if (genResult) {
          const dataUrl = await urlToDataURL(genResult.imageUrl);
          const savedPath = await saveImageToOutputs(dataUrl, { ...currentConfig, base_model: currentModel, timestamp: genResult.timestamp });
          const result: GenerationResult = { id: taskId, imageUrl: dataUrl, savedPath, config: { ...currentConfig, base_model: currentModel }, timestamp: genResult.timestamp };
          setGenerationHistory(prev => prev.map(item => item.id === taskId ? result : item));
        } else {
          setGenerationHistory(prev => prev.filter(item => item.id !== taskId));
        }
      } else if (currentModel === "Seed 4.0") {
        let image1FileId: string | undefined;
        let image2FileId: string | undefined;
        if (currentUploadedImages.length > 0) {
          const file1Result = await uploadFile(currentUploadedImages[0].file);
          if (file1Result) image1FileId = JSON.stringify({ file_id: file1Result });
          if (currentUploadedImages.length > 1) {
            const file2Result = await uploadFile(currentUploadedImages[1].file);
            if (file2Result) image2FileId = JSON.stringify({ file_id: file2Result });
          }
        }
        let imageParam: string | string[] | undefined;
        if (currentUploadedImages.length === 2) {
          const imageArray: string[] = [];
          if (image1FileId) imageArray.push(image1FileId);
          if (image2FileId) imageArray.push(image2FileId);
          imageParam = imageArray;
        } else if (currentUploadedImages.length === 1) {
          imageParam = image1FileId;
        }
        const workflowParams: CozeWorkflowParams = { prompt: currentConfig.prompt, width: Number(currentConfig.img_width), height: Number(currentConfig.image_height) };
        if (currentUploadedImages.length === 2) { workflowParams.image = imageParam as string[]; } else if (currentUploadedImages.length === 1) { workflowParams.image1 = imageParam as string; }

        const workflowResult = await runWorkflow(workflowParams);
        if (workflowResult) {
          const dataUrl = await urlToDataURL(workflowResult);
          const savedPath = await saveImageToOutputs(dataUrl, { ...currentConfig, base_model: currentModel, timestamp: new Date().toISOString() });
          const result: GenerationResult = { id: taskId, imageUrl: dataUrl, savedPath, config: { ...currentConfig, base_model: currentModel }, timestamp: new Date().toISOString() };
          setGenerationHistory(prev => prev.map(item => item.id === taskId ? result : item));
          toast({ title: "生成成功", description: "Seed 4.0 图像已成功生成！" });
        } else {
          throw new Error("未收到有效图片数据");
        }
      } else if (currentModel === "Workflow") {
        if (!currentWorkflowConfig) {
          toast({ title: "错误", description: "请先选择工作流", variant: "destructive" });
          setGenerationHistory(prev => prev.filter(item => item.id !== taskId));
          return;
        }
        const flattenInputs = (arr: IMultiValueInput[]) => {
          const list: { key: string; value: unknown; valueType?: string; title?: string }[] = [];
          arr.forEach(group => {
            group.inputs.forEach((input: IInputField) => {
              list.push({ key: input.key, value: input.value, valueType: input.valueType, title: input.title });
            });
          });
          return list;
        };
        const allInputs = [...flattenInputs(currentWorkflowConfig.viewComfyJSON.inputs), ...flattenInputs(currentWorkflowConfig.viewComfyJSON.advancedInputs)];
        const mappingConfig = currentWorkflowConfig.viewComfyJSON.mappingConfig as { components: UIComponent[] } | undefined;

        let mappedInputs: { key: string; value: unknown }[] = [];
        if (mappingConfig?.components?.length) {
          const paramMap = new Map<string, unknown>();
          mappingConfig.components.forEach((comp: UIComponent) => {
            if (!comp.properties?.paramName || !comp.mapping?.workflowPath) return;
            const key = comp.mapping.workflowPath.join("-");
            const pName = comp.properties.paramName;
            if (pName === 'prompt' && currentConfig.prompt) paramMap.set(key, currentConfig.prompt);
            else if (pName === 'width') paramMap.set(key, currentConfig.img_width);
            else if (pName === 'height') paramMap.set(key, currentConfig.image_height);
            else if (pName === 'batch_size') paramMap.set(key, currentConfig.gen_num);
            else if (pName === 'base_model') paramMap.set(key, currentConfig.base_model || selectedModel);
            else if (['lora', 'lora1', 'lora2', 'lora3'].includes(pName)) {
              let idx = 0; if (pName === 'lora2') idx = 1; else if (pName === 'lora3') idx = 2;
              if (selectedLoras.length > idx) {
                const lora = selectedLoras[idx];
                const last = comp.mapping.workflowPath[comp.mapping.workflowPath.length - 1];
                if (last === 'strength_model' || last === 'strength_clip' || typeof comp.properties.defaultValue === 'number') {
                  paramMap.set(key, lora.strength);
                } else {
                  paramMap.set(key, lora.model_name);
                }
              }
            }
          });
          mappedInputs = allInputs.map(item => ({ key: item.key, value: paramMap.has(item.key) ? paramMap.get(item.key) : item.value }));
        } else {
          mappedInputs = allInputs.map(item => {
            if ((item.valueType === "long-text" || /prompt|文本|提示/i.test(item.title || "")) && currentConfig.prompt) return { key: item.key, value: currentConfig.prompt };
            if (/width/i.test(item.title || "")) return { key: item.key, value: currentConfig.img_width };
            if (/height/i.test(item.title || "")) return { key: item.key, value: currentConfig.image_height };
            if (/batch|数量|batch_size/i.test(item.title || "")) return { key: item.key, value: currentConfig.gen_num };
            if (/model|模型|path|unet/i.test(item.title || "") && !/lora/i.test(item.title || "")) return { key: item.key, value: currentConfig.base_model || selectedModel };
            if (selectedLoras.length > 0 && /lora/i.test(item.title || "")) {
              if (/strength|weight|强度/i.test(item.title || "")) return { key: item.key, value: selectedLoras[0].strength };
              return { key: item.key, value: selectedLoras[0].model_name };
            }
            return { key: item.key, value: item.value };
          });
        }

        await runComfyWorkflow({
          viewComfy: { inputs: mappedInputs, textOutputEnabled: false },
          workflow: currentWorkflowConfig.workflowApiJSON || undefined,
          viewcomfyEndpoint: currentWorkflowConfig.viewComfyJSON.viewcomfyEndpoint || null,
          onSuccess: async (outputs) => {
            if (outputs.length > 0) {
              const dUrl = await blobToDataURL(outputs[0]);
              const sPath = await saveImageToOutputs(dUrl, { ...currentConfig, base_model: currentModel, workflow: currentWorkflowConfig.viewComfyJSON.title });
              const result: GenerationResult = { id: taskId, imageUrl: dUrl, savedPath: sPath, config: { ...currentConfig, base_model: currentModel }, timestamp: new Date().toISOString() };
              setGenerationHistory(prev => prev.map(item => item.id === taskId ? result : item));
            } else {
              setGenerationHistory(prev => prev.filter(item => item.id !== taskId));
            }
          },
          onError: (error) => {
            setGenerationHistory(prev => prev.filter(item => item.id !== taskId));
            toast({ title: "生成失败", description: error?.errorMsg || error?.message || "工作流执行失败", variant: "destructive" });
          }
        });
      } else {
        // 默认使用 ByteArtist 接口 (Lemo 2D/3D 等)
        const response: ByteArtistResponse = await fetchByteArtistImage({
          conf: {
            width: currentConfig.img_width,
            height: currentConfig.image_height,
            batch_size: currentConfig.gen_num,
            seed: Math.floor(Math.random() * 2147483647),
            prompt: currentConfig.prompt
          },
          algorithms: algorithm,
          img_return_format: imageFormat
        });

        interface ByteArtistAFRItem { pic: string;[key: string]: unknown; }
        const afr = (response as { data?: { afr_data?: ByteArtistAFRItem[] } }).data?.afr_data;
        if (!afr?.[0]?.pic) throw new Error("未收到有效图片数据");

        const dataUrl = afr[0].pic.startsWith("data:") ? afr[0].pic : `data:image/${imageFormat};base64,${afr[0].pic}`;
        const savedPath = await saveImageToOutputs(dataUrl, { ...currentConfig, base_model: currentModel });
        const result: GenerationResult = {
          id: taskId,
          imageUrl: dataUrl,
          savedPath,
          config: { ...currentConfig, base_model: currentModel },
          timestamp: new Date().toISOString()
        };
        setGenerationHistory(prev => prev.map(item => item.id === taskId ? result : item));
        toast({ title: "生成成功", description: "图像已成功生成！" });
      }
    } catch (error) {
      console.error("💥 背景生成失败:", error);
      setGenerationHistory(prev => prev.filter(item => item.id !== taskId));
      toast({ title: "生成失败", description: error instanceof Error ? error.message : "未知错误", variant: "destructive" });
    }
  };

  const handleRegenerate = async (resultConfig: GenerationConfig) => {
    updateConfig(resultConfig);
    // 等待状态同步（虽然 zustand 是同步的，但为了逻辑清晰）
    setTimeout(() => {
      handleGenerate();
    }, 0);
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

  const Inputbg = "relative z-10 flex items-center justify-center w-full text-black flex-col rounded-[30px] bg-black/50  backdrop-blur-xl border border-white/20 p-2 mx-auto";

  const renderThumbnails = () => {
    const showUploadButton = isInputHovered || uploadedImages.length > 0;
    if (uploadedImages.length === 0 && !showUploadButton) return null;

    return (
      <div className="absolute -top-16 left-10 flex gap-1 z-0 pointer-events-none">
        <AnimatePresence>
          {uploadedImages.map((image, index) => {
            const rotations = [-8, 6, -4, 5, -3];
            const rotation = rotations[index % rotations.length];
            return (
              <motion.div
                key={index}
                initial={{ y: 20, rotate: rotation }}
                animate={{ y: 0, rotate: rotation }}
                exit={{ y: 20, rotate: rotation }}
                transition={{ duration: 0.1, ease: "easeOut" }}
                className="relative group pointer-events-auto hover:z-50 p-1 -m-1"
              >
                <div className="relative p-2 transition-all duration-100 group-hover:-translate-y-5 group-hover:scale-110">
                  <Image
                    src={image.previewUrl}
                    alt={`上传的图片 ${index + 1}`}
                    width={80}
                    height={80}
                    className="w-20 h-20 object-cover rounded-2xl border-2 border-white/60 bg-black shadow-xl transition-all duration-300 group-hover:border-white group-hover:shadow-2xl"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-black/60 backdrop-blur-md text-white border border-white/20 rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black hover:scale-110 z-10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}

          {showUploadButton && (
            <motion.div
              key="upload-button"
              initial={{ y: 20, rotate: ([-8, 6, -4, 5, -3][uploadedImages.length % 5]) }}
              animate={{ y: 0, rotate: ([-8, 6, -4, 5, -3][uploadedImages.length % 5]) }}
              exit={{ scale: 0.8 }}
              transition={{ duration: 0.1, ease: "easeOut" }}
              className="relative group pointer-events-auto hover:z-50"
            >
              <div className="relative transition-all duration-300 group-hover:-translate-y-5 group-hover:scale-110">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-white/40 bg-white/5 backdrop-blur-md shadow-xl transition-all duration-300 hover:border-white/80 hover:bg-white/10 group-hover:shadow-2xl"
                >
                  <Plus className="w-8 h-8 text-white/40 group-hover:text-white/80 transition-colors" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };


  return (
    <main className="relative h-screen flex flex-col bg-transparent overflow-hidden">
      {/* 核心历史与预览区域 - 在输入区域下方（或背景中） */}
      <div className="flex-1 overflow-hidden relative z-0">
        <HistoryList
          history={generationHistory}
          onRegenerate={handleRegenerate}
          onDownload={handleDownload}
          onImageClick={openImageModal}
        />
      </div>

      {/* 动态输入区域 - 初始居中，生成后固定在底部 */}
      <div className={cn(
        "w-full transition-all duration-700 ease-in-out z-50",
        hasGenerated
          ? "fixed top-0 left-0 right-0 pt-10  pb-8 px-4 "
          : "absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
      )}>
        <div className={cn(
          "flex flex-col items-center  w-full transition-all duration-500 ease-in-out px-4 pointer-events-auto",
          hasGenerated ? "max-w-[50vw]  mx-auto mt-20" : "max-w-4xl"
        )}>


          <h1
            className={cn(
              "text-[40px] text-white text-center transition-all duration-500 overflow-hidden",
              hasGenerated ? "h-0 opacity-0 mb-0" : "h-auto opacity-100 mb-4"
            )}
          >
            Let Your Imagination Soar
          </h1>
          <div
            className={cn(
              "relative w-full rounded-[10px] transition-all duration-300",
              isInputHovered ? "mt-0" : "mt-0"
            )}
            onMouseEnter={() => setIsInputHovered(true)}
            onMouseLeave={() => setIsInputHovered(false)}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
            />
            {renderThumbnails()}

            <div className={Inputbg}>
              <div className="flex items-start gap-4 w-full">
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
                    setConfig(prev => ({ ...prev, img_width: resolution.w, image_height: resolution.h }));
                  }
                }}
                currentImageSize={(config.image_size as '1K' | '2K' | '4K') || '1K'}
                onImageSizeChange={(size: '1K' | '2K' | '4K') => {
                  const ar = getCurrentAspectRatio();
                  const resolution = AR_MAP[ar]?.[size];
                  if (resolution) {
                    setConfig(prev => ({ ...prev, image_size: size, img_width: resolution.w, image_height: resolution.h }));
                  }
                }}
                isAspectRatioLocked={isAspectRatioLocked}
                onToggleAspectRatioLock={() => setIsAspectRatioLocked(!isAspectRatioLocked)}
                onImageUpload={handleImageUpload}
                onGenerate={handleGenerate}
                isGenerating={isLoading}
                uploadedImagesCount={uploadedImages.length}
                loadingText={selectedModel === "Seed 4.0" ? "Seed 4.0 生成中..." : "生成中..."}
                onOpenWorkflowSelector={() => setIsWorkflowDialogOpen(true)}
                onOpenBaseModelSelector={() => setIsBaseModelDialogOpen(true)}
                onOpenLoraSelector={() => setIsLoraDialogOpen(true)}
                selectedWorkflowName={selectedWorkflowConfig?.viewComfyJSON.title}
                selectedBaseModelName={config.base_model}
                selectedLoraNames={selectedLoras.map(l => l.model_name)}
                workflows={workflows}
                onWorkflowSelect={(wf) => { setSelectedModel("Workflow"); setSelectedWorkflowConfig(wf); applyWorkflowDefaults(wf); }}
                onOptimize={handleOptimizePrompt}
                isOptimizing={isOptimizing}
                isMockMode={isMockMode}
                onMockModeChange={setIsMockMode}
                isSelectorExpanded={isSelectorExpanded}
                onSelectorExpandedChange={setIsSelectorExpanded}
              />
            </div>
          </div>
          <GoogleApiStatus className="fixed bottom-4 right-4" />
        </div>
      </div>

      <div className="absolute top-0 left-0 right-0 pt-24 z-80">
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
    </main>
  );
}


export default function PlaygroundV2Route() {
  return <PlaygroundV2Page />;
}
