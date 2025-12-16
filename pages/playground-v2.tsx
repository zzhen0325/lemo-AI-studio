  "use client";


  import { useState, useEffect } from "react";
  import { useToast } from "@/hooks/common/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Item, ItemContent, ItemTitle } from "@/components/ui/item";
  import { useImageGeneration } from "@/hooks/features/PlaygroundV2/useImageGeneration";
  import { useImageEditing } from "@/hooks/features/PlaygroundV2/useImageEditing";
  import { usePromptOptimization, AIModel } from "@/hooks/features/PlaygroundV2/usePromptOptimization";
  import { useCozeWorkflow } from "@/hooks/features/useCozeWorkflow";
  import { fetchByteArtistImage } from "@/lib/api/PlaygroundV2";
  import type { ByteArtistResponse } from "@/lib/api/PlaygroundV2";
  import Image from "next/image";
  import PromptInput from "@/components/features/playground-v2/PromptInput";
  import ControlToolbar from "@/components/features/playground-v2/ControlToolbar";
  import HistoryList from "@/components/features/playground-v2/HistoryList";
  import ImagePreviewModal from "@/components/features/playground-v2/ImagePreviewModal";
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
  import ShaderShowcase from "@/components/ui/hero";
  import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";
import ColorBends from "@/components/common/graphics/ColorBends";
import { BackgroundImage } from "@/components/common/graphics/BackgroundImage";

// Image 已在上方导入，避免重复声明
  export function PlaygroundV2Page({ onEditMapping }: { onEditMapping?: (workflow: IViewComfy) => void }) {
    const { toast } = useToast();
    const [config, setConfig] = useState<GenerationConfig>({ text: "", width: 1200, height: 1200, batch_size: 1 });
    const [selectedAIModel, setSelectedAIModel] = useState<AIModel>('gemini');
    const [algorithm] = useState("lemo_2dillustator");
    const [imageFormat] = useState("png");
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationHistory, setGenerationHistory] = useState<GenerationResult[]>([]);
    const [isAspectRatioLocked, setIsAspectRatioLocked] = useState(false);
    const [selectedModel, setSelectedModel] = useState("3D Lemo seed3");
    const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
    const [isWorkflowDialogOpen, setIsWorkflowDialogOpen] = useState(false);
    const [isBaseModelDialogOpen, setIsBaseModelDialogOpen] = useState(false);
    const [isLoraDialogOpen, setIsLoraDialogOpen] = useState(false);
    const [selectedWorkflowConfig, setSelectedWorkflowConfig] = useState<IViewComfy | undefined>(undefined);
    const [selectedBaseModel, setSelectedBaseModel] = useState<string>("");
    const [selectedLoras, setSelectedLoras] = useState<SelectedLora[]>([]);
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

    const applyWorkflowDefaults = (workflow: IViewComfy) => {
      const mappingConfig = workflow.viewComfyJSON.mappingConfig as { components: UIComponent[] } | undefined;
      const newConfig = { ...config };
      let newBaseModel = selectedBaseModel;
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
                  if (actualValue && typeof actualValue === 'string') newConfig.text = actualValue;
                  else if (defaultValue) newConfig.text = defaultValue;
              } else if (paramName === 'width') {
                  if (actualValue && (typeof actualValue === 'number' || typeof actualValue === 'string')) newConfig.width = Number(actualValue);
                  else if (defaultValue) newConfig.width = Number(defaultValue);
              } else if (paramName === 'height') {
                  if (actualValue && (typeof actualValue === 'number' || typeof actualValue === 'string')) newConfig.height = Number(actualValue);
                  else if (defaultValue) newConfig.height = Number(defaultValue);
              } else if (paramName === 'batch_size') {
                  if (actualValue && (typeof actualValue === 'number' || typeof actualValue === 'string')) newConfig.batch_size = Number(actualValue);
                  else if (defaultValue) newConfig.batch_size = Number(defaultValue);
              } else if (paramName === 'base_model') {
                  if (actualValue && typeof actualValue === 'string') newBaseModel = actualValue;
                  else if (defaultValue) newBaseModel = defaultValue;
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
              if (typeof val === "string") newConfig.text = val;
          } else if (title === "width" || title.includes("width")) {
              if (typeof val === "number" || typeof val === "string") newConfig.width = Number(val);
          } else if (title === "height" || title.includes("height")) {
              if (typeof val === "number" || typeof val === "string") newConfig.height = Number(val);
          } else if (title === "batch_size" || title.includes("batch") || title.includes("数量")) {
              if (typeof val === "number" || typeof val === "string") newConfig.batch_size = Number(val);
          } else if (title.includes("model") || title.includes("模型")) {
              if (!title.includes("lora")) {
              if (typeof val === "string") newBaseModel = val;
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
      if (newBaseModel !== selectedBaseModel) setSelectedBaseModel(newBaseModel);
      if (newLoras.length > 0) setSelectedLoras(newLoras);
    };

    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [modalImageUrl, setModalImageUrl] = useState("");

    const { generateImage, isGenerating: isGeneratingNano } = useImageGeneration();
    const { editImage, isEditing: isEditingNano } = useImageEditing();
    const { optimizePrompt, isOptimizing } = usePromptOptimization({ systemInstruction: `# 角色\n你是备受赞誉的提示词大师Lemo-prompt，专为AI绘图工具flux打造提示词。\n\n## 技能\n### 技能1: 理解用户意图\n利用先进的自然语言处理技术，准确剖析用户输入自然语言背后的真实意图，精准定位用户对于图像生成的核心需求。在描述物品时，避免使用"各种""各类"等概称，要详细列出具体物品。若用户提供图片，你会精准描述图片中的内容信息与构图，并按照图片信息完善提示词。\n\n### 技能2: 优化构图与细节\n运用专业的构图知识和美学原理，自动为场景增添丰富且合理的细节，精心调整构图，显著提升生成图像的构图完整性、故事性和视觉吸引力。\n\n### 技能3: 概念转化\n熟练运用丰富的视觉语言库，将用户提出的抽象概念快速且准确地转化为可执行的视觉描述，让抽象想法能通过图像生动、直观地呈现。\n\n### 技能4: 描述纬度\n1. **版式分析**：能准确判断版面率（高版面率：留白少、信息密集，适合促销、营销场景；低版面率：留白多、气质高级，适合文艺、静态设计）；识别构图方式（上下构图、左右构图、中心构图、对角线构图、四角构图、曲线（S线）构图、散点式构图、包围式构图）；分辨网格系统（通栏网格、分栏网格、模块网格、基线网格、层级网格）。\n2. **层级关系**：清晰区分主标题、副标题、正文、辅助文字，通过强调层级信息的大小、颜色、字重，使用不同字号、字重、灰度制造视觉主次。\n3. **字体搭配**：根据字体气质分类进行搭配，如轻盈现代（细、无衬线）、厚重力量（黑体、笔画重）、文艺清新（舒展、居中）、柔和可爱（曲线笔画）、古典沉稳（仿宋、书法感）、现代简洁（极简无装饰）。\n4. **色彩搭配**：准确识别并运用单色（一个色相展开，简洁高级）、相似色（色环上相邻色，柔和统一）、互补色（色环对向色，强对比）、Duotone双色调（叠加两种对比色调，印刷感或冲击力）。\n6.**画面内容**：准确描述画面中的主体和辅助元素的主要内容和详细细节。\n\n## 限制\n1. 严禁生成涉及暴力、色情、恐怖等不良内容的描述，确保内容积极健康。\n2. 不提供技术参数相关内容，专注于图像内容和风格的描述。\n3. 不提供与图像生成无关的建议，保持回答的针对性。\n4. 描述必须客观、准确，符合实际情况和大众审美标准。\n\n## 输出格式\n1. 输出完整提示词中文版本\n2. 使用精炼且生动的语言表达\n3. 文字控制在500字以内\n4. lemo是一个卡通角色的名字，不要描述lemo的角色特质，可以描述lemo的穿搭动作表情等！！！` });
    const { runWorkflow, loading: isGeneratingCoze, uploadFile } = useCozeWorkflow({ retryCount: 3, retryDelay: 2000, onSuccess: (result) => { console.log('🎉 Coze Workflow 生成成功:', result); toast({ title: "生成成功", description: "Seed 4.0 图像已成功生成！" }); }, onError: (error) => { console.error('💥 Coze Workflow 生成失败:', error); toast({ title: "生成失败", description: error.message || "Seed 4.0 生成失败", variant: "destructive" }); } });
    const { doPost: runComfyWorkflow, loading: isRunningComfy } = usePostPlayground();
    const isLoading = isGenerating || isGeneratingNano || isEditingNano || isGeneratingCoze || isRunningComfy;

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files; if (!files) return;
      Array.from(files).forEach(file => { if (file.type.startsWith('image/')) { const reader = new FileReader(); reader.onload = (e) => { const result = e.target?.result as string; if (result) { const base64Data = result.split(',')[1]; setUploadedImages(prev => [...prev, { file, base64: base64Data, previewUrl: result }]); } }; reader.readAsDataURL(file); } });
    };
    const removeImage = (index: number) => { setUploadedImages(prev => prev.filter((_, i) => i !== index)); };

    const aspectRatioPresets = [ { name: "1:1", width: 1200, height: 1200 }, { name: "2:3", width: 1000, height: 1500 }, { name: "3:2", width: 1500, height: 1000 }, { name: "3:4", width: 1200, height: 1600 }, { name: "4:3", width: 1600, height: 1200 }, { name: "9:16", width: 1200, height: 2100 }, { name: "16:9", width: 2100, height: 1200 }, { name: "21:9", width: 2800, height: 1200 } ];
    const getCurrentAspectRatio = () => { const preset = aspectRatioPresets.find(p => p.width === config.width && p.height === config.height); return preset ? preset.name : "1:1"; };
    const handleWidthChange = (newWidth: number) => { if (isAspectRatioLocked && config.height > 0) { const ratio = config.width / config.height; const newHeight = Math.round(newWidth / ratio); setConfig(prev => ({ ...prev, width: newWidth, height: newHeight })); } else { setConfig(prev => ({ ...prev, width: newWidth })); } };
    const handleHeightChange = (newHeight: number) => { if (isAspectRatioLocked && config.height > 0) { const ratio = config.width / config.height; const newWidth = Math.round(newHeight * ratio); setConfig(prev => ({ ...prev, width: newWidth, height: newHeight })); } else { setConfig(prev => ({ ...prev, height: newHeight })); } };
    const handleOptimizePrompt = async () => { const optimizedText = await optimizePrompt(config.text, selectedAIModel); if (optimizedText) setConfig(prev => ({ ...prev, text: optimizedText })); };

    const handleGenerate = async () => {
      console.log("🎯 开始生成流程");
      if (!config.text.trim()) { toast({ title: "错误", description: "请输入图像描述文本", variant: "destructive" }); return; }
      const loadingResult: GenerationResult = { imageUrl: "", config: { ...config, model: selectedModel }, timestamp: new Date().toISOString(), isLoading: true };
      setGenerationHistory(prev => [loadingResult, ...prev.slice(0, 9)]);
      try {
        if (uploadedImages.length > 0 && selectedModel === "Nano banana") {
          const editingResult = await editImage({ instruction: config.text, originalImage: uploadedImages[0].base64, referenceImages: uploadedImages.slice(1).map(img => img.base64), aspectRatio: getCurrentAspectRatio() });
          if (editingResult) { const result: GenerationResult = { imageUrl: editingResult.imageUrl, config: { ...config, model: selectedModel }, timestamp: editingResult.timestamp }; setGenerationHistory(prev => [result, ...prev.slice(1)]); } else { setGenerationHistory(prev => prev.slice(1)); }
        } else if (selectedModel === "Nano banana") {
          const genResult = await generateImage({ prompt: config.text, aspectRatio: getCurrentAspectRatio() });
          if (genResult) { const result: GenerationResult = { imageUrl: genResult.imageUrl, config: { ...config, model: selectedModel }, timestamp: genResult.timestamp }; setGenerationHistory(prev => [result, ...prev.slice(1)]); } else { setGenerationHistory(prev => prev.slice(1)); }
        } else if (selectedModel === "Seed 4.0") {
          let image1FileId: string | undefined; let image2FileId: string | undefined;
          if (uploadedImages.length > 0) { const file1Result = await uploadFile(uploadedImages[0].file); if (file1Result) image1FileId = JSON.stringify({ file_id: file1Result }); if (uploadedImages.length > 1) { const file2Result = await uploadFile(uploadedImages[1].file); if (file2Result) image2FileId = JSON.stringify({ file_id: file2Result }); } }
          let imageParam: string | string[] | undefined;
          if (uploadedImages.length === 2) { const imageArray: string[] = []; if (image1FileId) imageArray.push(image1FileId); if (image2FileId) imageArray.push(image2FileId); imageParam = imageArray; } else if (uploadedImages.length === 1) { imageParam = image1FileId; }
          const workflowParams: CozeWorkflowParams = { prompt: config.text, width: Number(config.width), height: Number(config.height) };
          if (uploadedImages.length === 2) { workflowParams.image = imageParam as string[]; } else if (uploadedImages.length === 1) { workflowParams.image1 = imageParam as string; }
          const workflowResult = await runWorkflow(workflowParams);
          if (workflowResult) { const result: GenerationResult = { imageUrl: workflowResult, config: { ...config, model: selectedModel }, timestamp: new Date().toISOString() }; setGenerationHistory(prev => [result, ...prev.slice(1)]); toast({ title: "生成成功", description: "Seed 4.0 图像已成功生成！" }); } else { throw new Error("未收到有效图片数据"); }
        } else if (selectedModel === "Workflow") {
          if (!selectedWorkflowConfig) { toast({ title: "错误", description: "请先选择工作流", variant: "destructive" }); setGenerationHistory(prev => prev.slice(1)); return; }
          const flattenInputs = (arr: IMultiValueInput[]) => { const list: { key: string; value: unknown; valueType?: string; title?: string }[] = []; arr.forEach(group => { group.inputs.forEach((input: IInputField) => { list.push({ key: input.key, value: input.value, valueType: input.valueType, title: input.title }); }); }); return list; };
          const basic = flattenInputs(selectedWorkflowConfig.viewComfyJSON.inputs);
          const adv = flattenInputs(selectedWorkflowConfig.viewComfyJSON.advancedInputs);
          const allInputs = [...basic, ...adv];
          const mappingConfig = selectedWorkflowConfig.viewComfyJSON.mappingConfig as { components: UIComponent[] } | undefined;
          type MappedInput = { key: string; value: unknown };
          let mappedInputs: MappedInput[] = [];
          if (mappingConfig?.components && Array.isArray(mappingConfig.components) && mappingConfig.components.length > 0) {
              const paramMap = new Map<string, unknown>();
              mappingConfig.components.forEach((comp: UIComponent) => {
                  if (!comp.properties?.paramName || !comp.mapping?.workflowPath) return;
                  const key = comp.mapping.workflowPath.join("-");
                  const paramName = comp.properties.paramName;
                  if (paramName === 'prompt' && config.text) { paramMap.set(key, config.text); }
                  else if (paramName === 'width') { paramMap.set(key, config.width); }
                  else if (paramName === 'height') { paramMap.set(key, config.height); }
                  else if (paramName === 'batch_size') { paramMap.set(key, config.batch_size); }
                  else if (paramName === 'base_model' && selectedBaseModel) { paramMap.set(key, selectedBaseModel); }
                  else if (['lora', 'lora1', 'lora2', 'lora3'].includes(paramName)) {
                      let loraIndex = 0; if (paramName === 'lora2') loraIndex = 1; else if (paramName === 'lora3') loraIndex = 2;
                      if (selectedLoras.length > loraIndex) { const lora = selectedLoras[loraIndex]; const lastPart = comp.mapping.workflowPath[comp.mapping.workflowPath.length - 1]; if (lastPart === 'strength_model' || lastPart === 'strength_clip' || typeof comp.properties.defaultValue === 'number') { paramMap.set(key, lora.strength); } else { paramMap.set(key, lora.model_name); } }
                  }
              });
              mappedInputs = allInputs.map(item => { if (paramMap.has(item.key)) { return { key: item.key, value: paramMap.get(item.key) }; } return { key: item.key, value: item.value }; });
          } else {
              mappedInputs = allInputs.map(item => { if ((item.valueType === "long-text" || /prompt|文本|提示/i.test(item.title || "")) && config.text) { return { key: item.key, value: config.text }; } if (/width/i.test(item.title || "")) { return { key: item.key, value: config.width }; } if (/height/i.test(item.title || "")) { return { key: item.key, value: config.height }; } if (/batch|数量|batch_size/i.test(item.title || "")) { return { key: item.key, value: config.batch_size }; } if (selectedBaseModel && /model|模型|path/i.test(item.title || "") && !/lora/i.test(item.title || "")) { return { key: item.key, value: selectedBaseModel }; } if (selectedLoras.length > 0 && /lora/i.test(item.title || "")) { if (/strength|weight|强度/i.test(item.title || "")) { return { key: item.key, value: selectedLoras[0].strength }; } return { key: item.key, value: selectedLoras[0].model_name }; } return { key: item.key, value: item.value }; });
          }
          const comfyView = { inputs: mappedInputs, textOutputEnabled: false };
          const wf = selectedWorkflowConfig.workflowApiJSON || undefined;
          await runComfyWorkflow({ viewComfy: comfyView, workflow: wf, viewcomfyEndpoint: selectedWorkflowConfig.viewComfyJSON.viewcomfyEndpoint || null, onSuccess: (outputs) => { if (outputs.length > 0) { const url = URL.createObjectURL(outputs[0]); const result: GenerationResult = { imageUrl: url, config: { ...config, model: selectedModel }, timestamp: new Date().toISOString() }; setGenerationHistory(prev => [result, ...prev.slice(1)]); } else { setGenerationHistory(prev => prev.slice(1)); } }, onError: (error) => { setGenerationHistory(prev => prev.slice(1)); toast({ title: "生成失败", description: error?.errorMsg || error?.message || "工作流执行失败", variant: "destructive" }); } });
        } else {
          setIsGenerating(true);
          const finalConfig = { ...config, seed: config.seed || Math.floor(Math.random() * 2147483647) };
          const apiConfig = { width: finalConfig.width, height: finalConfig.height, batch_size: finalConfig.batch_size, seed: finalConfig.seed, prompt: finalConfig.text };
          const response: ByteArtistResponse = await fetchByteArtistImage({ conf: apiConfig, algorithms: algorithm, img_return_format: imageFormat });
          const afr = (response as { data?: { afr_data?: Array<{ pic?: string }> } }).data?.afr_data;
          if (!afr || !Array.isArray(afr) || !afr[0]?.pic) { throw new Error("未收到有效图片数据"); }
          const base64 = afr[0].pic as string;
          const dataUrl = base64.startsWith("data:") ? base64 : `data:image/${imageFormat};base64,${base64}`;
          const result = { imageUrl: dataUrl, config: { ...finalConfig, model: selectedModel }, timestamp: new Date().toISOString() };
          setGenerationHistory(prev => [result, ...prev.slice(1)]);
          toast({ title: "生成成功", description: "图像已成功生成！" });
        }
      } catch (error) {
        console.error("💥 生成失败:", error);
        setGenerationHistory(prev => prev.slice(1));
        toast({ title: "生成失败", description: error instanceof Error ? error.message : "未知错误", variant: "destructive" });
      } finally { setIsGenerating(false); }
    };

    const handleRegenerate = async (resultConfig: GenerationConfig) => {
      const originalConfig = { ...config };
      const originalModel = selectedModel;
      try { setConfig(resultConfig); setSelectedModel(resultConfig.model || "Seed 3.0"); setTimeout(() => { handleGenerate(); }, 100); }
      catch { setConfig(originalConfig); setSelectedModel(originalModel); }
    };

    const handleDownload = (imageUrl: string) => { const link = document.createElement("a"); link.href = imageUrl; link.download = `PlaygroundV2-${Date.now()}.png`; document.body.appendChild(link); link.click(); document.body.removeChild(link); };
    const openImageModal = (imageUrl: string) => { setModalImageUrl(imageUrl); setIsImageModalOpen(true); };
    const closeImageModal = () => { setIsImageModalOpen(false); setModalImageUrl(""); };


    // 样式定义
    const tabPill = "rounded-full font-aquebella bg-white/10 backdrop-blur-xl text-white  text-xs border border-border/10 px-4";      
     const Inputbg = "flex w-full text-black max-w-4xl flex-col items-start gap-2 rounded-[30px] bg-white/30 backdrop-blur-sm border-none p-2 mx-auto";    
      return (
    <div className="relative h-full  bg-transparent overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <Image
            src="/images/bg4.png"
            alt="背景"
            fill
            priority
            className="object-cover "
          />
           {/* <video
            src="/images/bg.mp4"
            autoPlay
            loop
            muted
            className="object-cover absolute inset-0 w-full h-full"
          /> */}
        </div>
        
       
      
        
        {/* <div className="absolute inset-0 z-999 pointer-events-none">
          <DottedGlowBackground className="z-999" gap={14} radius={1} opacity={0.6} backgroundOpacity={0} speedMin={0.4} speedMax={1.2} speedScale={1} colorDarkVar="color-zinc-100" glowColorDarkVar="color-zinc-100" />
        </div> */}
        <div className="h-full overflow-y-auto relative  z-10">
          <div className="max-w-8xl mx-auto relative z-10">
            {(isLoading || generationHistory.length > 0) ? (
              <h1 className="text-[2vw] text-center mt-10 mb-10" style={{ fontFamily: 'ShowsGracious, sans-serif' }}>Lemon8 AI Studio</h1>
            ) : (
              <div className="flex flex-col text-white items-center justify-center mt-20">
                
                <h1 className="text-[8vw] text-center mt-[-2rem]" style={{ fontFamily: 'InstrumentSerif-Regular, sans-serif' }}>Lemon8 AI Studio</h1>
              </div>
            )}
              {/* <Card className=" max-w-5xl mx-auto bg-transparent shadow-none border-none flex items-center justify-center">
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-center gap-3">
                      <div className="flex items-center justify-center flex-wrap gap-2">
                        <Item variant="outline" size="sm" aria-selected={selectedModel!=="Workflow" && selectedModel==="3D Lemo seed3"} className="data-[aria-selected=true]:bg-white data-[aria-selected=true]:text-black" onClick={() => { setSelectedModel("3D Lemo seed3"); setSelectedWorkflowConfig(undefined); }}>
                          <ItemContent>
                            <ItemTitle>Seed 3.0</ItemTitle>
                          </ItemContent>
                        </Item>
                        <Item variant="outline" size="sm" aria-selected={selectedModel!=="Workflow" && selectedModel==="Seed 4.0"} className="data-[aria-selected=true]:bg-white data-[aria-selected=true]:text-black" onClick={() => { setSelectedModel("Seed 4.0"); setSelectedWorkflowConfig(undefined); }}>
                          <ItemContent>
                            <ItemTitle>Seed 4.0</ItemTitle>
                          </ItemContent>
                        </Item>
                        <Item variant="outline" size="sm" aria-selected={selectedModel!=="Workflow" && selectedModel==="Nano banana"} className="data-[aria-selected=true]:bg-white data-[aria-selected=true]:text-black" onClick={() => { setSelectedModel("Nano banana"); setSelectedWorkflowConfig(undefined); }}>
                          <ItemContent>
                            <ItemTitle>Nano banana</ItemTitle>
                          </ItemContent>
                        </Item>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <ScrollArea className="w-full" type="scroll">
                        <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                          {workflows.map(wf => (
                            <Item
                              key={wf.viewComfyJSON.id}
                              variant="outline"
                              size="sm"
                              aria-selected={selectedModel === "Workflow" && selectedWorkflowConfig?.viewComfyJSON.id === wf.viewComfyJSON.id}
                              className="data-[aria-selected=true]:bg-white data-[aria-selected=true]:text-black"
                              onClick={() => { setSelectedModel("Workflow"); setSelectedWorkflowConfig(wf); applyWorkflowDefaults(wf); }}
                            >
                              <ItemContent>
                                <ItemTitle>{wf.viewComfyJSON.title || "Untitled Workflow"}</ItemTitle>
                              </ItemContent>
                            </Item>
                          ))}
                        </div>
                        <ScrollBar orientation="horizontal" />
                      </ScrollArea>
                    </div>
                  </CardContent>
                </Card>  */}
            <div className={generationHistory.length > 0 ? 'flex w-full max-w-5xl flex-none flex-col items-start rounded-3xl  mx-auto' : 'flex justify-center items-center p-4'}>
             {/* 生成区域外边框 */}
              
                 {/* 生成区域卡片样式 */}

               <div className={Inputbg}
               >
                
                <PromptInput text={config.text} onTextChange={(val) => setConfig(prev => ({ ...prev, text: val }))} uploadedImages={uploadedImages} onRemoveImage={removeImage} isOptimizing={isOptimizing} onOptimize={handleOptimizePrompt} selectedAIModel={selectedAIModel} onAIModelChange={setSelectedAIModel} />
                <ControlToolbar selectedModel={selectedModel} onModelChange={setSelectedModel} config={config} onConfigChange={(newConf) => setConfig(prev => ({ ...prev, ...newConf }))} onWidthChange={handleWidthChange} onHeightChange={handleHeightChange} aspectRatioPresets={aspectRatioPresets} currentAspectRatio={getCurrentAspectRatio()} isAspectRatioLocked={isAspectRatioLocked} onToggleAspectRatioLock={() => setIsAspectRatioLocked(!isAspectRatioLocked)} onImageUpload={handleImageUpload} onGenerate={handleGenerate} isGenerating={isLoading} uploadedImagesCount={uploadedImages.length} loadingText={selectedModel === "Seed 4.0" ? "Seed 4.0 生成中..." : "生成中..."} onOpenWorkflowSelector={() => setIsWorkflowDialogOpen(true)} onOpenBaseModelSelector={() => setIsBaseModelDialogOpen(true)} onOpenLoraSelector={() => setIsLoraDialogOpen(true)} selectedWorkflowName={selectedWorkflowConfig?.viewComfyJSON.title} selectedBaseModelName={selectedBaseModel} selectedLoraNames={selectedLoras.map(l => l.model_name)} workflows={workflows} onWorkflowSelect={(wf) => { setSelectedModel("Workflow"); setSelectedWorkflowConfig(wf); applyWorkflowDefaults(wf); }} onOptimize={handleOptimizePrompt} isOptimizing={isOptimizing} />
              </div>

             
              
            </div>
            <>
            <div>
              
                
                </div>
                </>
            <HistoryList history={generationHistory} onRegenerate={handleRegenerate} onDownload={handleDownload} onImageClick={openImageModal} isGenerating={isLoading} />
          </div>
        </div>
        <ImagePreviewModal isOpen={isImageModalOpen} onClose={closeImageModal} imageUrl={modalImageUrl} />
        <WorkflowSelectorDialog open={isWorkflowDialogOpen} onOpenChange={setIsWorkflowDialogOpen} onSelect={(wf) => setSelectedWorkflowConfig(wf)} onEdit={onEditMapping} />
        <BaseModelSelectorDialog open={isBaseModelDialogOpen} onOpenChange={setIsBaseModelDialogOpen} value={selectedBaseModel} onConfirm={(m) => setSelectedBaseModel(m)} />
        <LoraSelectorDialog open={isLoraDialogOpen} onOpenChange={setIsLoraDialogOpen} value={selectedLoras} onConfirm={(list) => setSelectedLoras(list)} />
      </div>
    );
  }


  export default function PlaygroundV2Route() {
    return <PlaygroundV2Page />;
  }
