import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Wand2, ImagePlus, ChevronDown, Link, Unlink, Sparkles } from "lucide-react";

import { GlowEffect } from "@/components/motion-primitives/glow-effect";
import { cn } from "@/lib/utils";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,


} from "@/components/ui/dropdown-menu";
import { GenerationConfig } from '@/components/features/playground-v2/types';
import type { IViewComfy } from "@/lib/providers/view-comfy-provider";



interface ControlToolbarProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  config: GenerationConfig;
  onConfigChange: (newConfig: Partial<GenerationConfig>) => void;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  aspectRatioPresets: { name: string; width: number; height: number }[];
  currentAspectRatio: string;
  isAspectRatioLocked: boolean;
  onToggleAspectRatioLock: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  loadingText?: string;
  uploadedImagesCount: number;
  onOpenWorkflowSelector?: () => void;
  onOpenBaseModelSelector?: () => void;
  onOpenLoraSelector?: () => void;
  selectedWorkflowName?: string;
  selectedBaseModelName?: string;
  selectedLoraNames?: string[];
  workflows?: IViewComfy[];
  onWorkflowSelect?: (wf: IViewComfy) => void;
  onAspectRatioChange: (ar: string) => void;
  currentImageSize: '1K' | '2K' | '4K';
  onImageSizeChange: (size: '1K' | '2K' | '4K') => void;
  onOptimize: () => void;
  isOptimizing: boolean;
  isMockMode?: boolean;
  onMockModeChange?: (val: boolean) => void;
  isSelectorExpanded?: boolean;
  onSelectorExpandedChange?: (expanded: boolean) => void;
}


export default function ControlToolbar({
  selectedModel,
  onModelChange,
  config,
  onWidthChange,

  onHeightChange,
  aspectRatioPresets,
  currentAspectRatio,
  isAspectRatioLocked,
  onToggleAspectRatioLock,
  onImageUpload,
  onGenerate,
  isGenerating,
  loadingText = "生成中...",

  onOpenBaseModelSelector,
  onOpenLoraSelector,
  selectedWorkflowName,
  selectedBaseModelName,
  selectedLoraNames = [],
  workflows = [],
  onWorkflowSelect,
  onOptimize,
  isOptimizing,
  onAspectRatioChange,
  currentImageSize,
  onImageSizeChange,
  isMockMode,
  onMockModeChange,
  isSelectorExpanded = false,
  onSelectorExpandedChange,
}: ControlToolbarProps) {


  const [selectValue, setSelectValue] = useState<string | undefined>(undefined);


  // 初始化与回填：根据外部选中模型/工作流，映射到 Select 的 value
  React.useEffect(() => {
    let v: string | undefined;
    if (selectedModel === '3D Lemo seed3') v = 'seed3';
    else if (selectedModel === 'Seed 4.0') v = 'seed4';
    else if (selectedModel === 'Nano banana') v = 'nano_banana';
    else if (selectedModel === 'Workflow' && selectedWorkflowName) {
      const wf = (Array.isArray(workflows) ? workflows : []).find(
        (w) => w.viewComfyJSON.title === selectedWorkflowName
      );
      if (wf) v = `wf:${String(wf.viewComfyJSON.id)}`;
    }
    setSelectValue(v);
  }, [selectedModel, selectedWorkflowName, workflows]);
  const handleUnifiedSelectChange = (val: string) => {
    setSelectValue(val);
    if (val === 'seed3') onModelChange('3D Lemo seed3');
    else if (val === 'seed4') onModelChange('Seed 4.0');
    else if (val === 'nano_banana') onModelChange('Nano banana');
    else if (val.startsWith('wf:')) {
      const id = val.slice(3);
      const wf = (Array.isArray(workflows) ? workflows : []).find(
        (w) => String(w.viewComfyJSON.id) === id
      );
      if (wf) {
        onModelChange('Workflow');
        onWorkflowSelect?.(wf);
      }
    }
  };

  const Inputbutton2 = "h-10 w-auto text-white rounded-2xl bg-black/10 border border-white/20";
  const triggerLabel = (() => {
    if (selectValue === 'seed3') return 'Seed 3';
    if (selectValue === 'seed4') return 'Seed 4';
    if (selectValue === 'nano_banana') return 'Nano banana';
    if (selectValue && selectValue.startsWith('wf:')) return selectedWorkflowName || '选择工作流';
    return 'Model';
  })();


  const itemLable = "px-2 py-2 text-sm text-white/30    ";
  const itemClassName = "px-2 py-2 text-md text-white/70 rounded-xl bg-black/20 hover:bg-white/20  flex items-center gap-2";
  return (
    <div className="w-full flex-col space-y-2">



      <div className="w-full h-12 flex justify-between items-center gap-2 px-2 py-2 mt-2">
        <div className="flex items-center gap-2">
          <Button
            className={cn(Inputbutton2, isSelectorExpanded && "bg-white/10")}
            onClick={() => onSelectorExpandedChange?.(!isSelectorExpanded)}
          >
            {triggerLabel}
            <ChevronDown className={cn("ml-2 h-4 w-4 opacity-50 transition-transform duration-200", isSelectorExpanded && "rotate-180")} />
          </Button>
          {selectedModel === 'Workflow' && (
            <>
              <Button variant="outline" className={Inputbutton2} onClick={() => onOpenBaseModelSelector?.()}>
                {selectedBaseModelName || "基础模型"}
              </Button>
              <Button variant="outline" className={Inputbutton2} onClick={() => onOpenLoraSelector?.()}>
                {selectedLoraNames.length > 0 ? `LoRA (${selectedLoraNames.length})` : "LoRA 模型"}
              </Button>
            </>
          )}
        </div>

        {/* 尺寸按钮 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={Inputbutton2}>
              {currentAspectRatio}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-auto min-w-[320px] max-w-[450px] p-4 text-zinc-900 rounded-2xl bg-white border border-zinc-200 ">
            <div className="space-y-4">
              {selectedModel === 'Nano banana' && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Resolution</div>
                  <div className="flex gap-2">
                    {(['1K', '2K', '4K'] as const).map(size => (
                      <Button
                        key={size}
                        variant={currentImageSize === size ? "default" : "outline"}
                        className={`flex-1 h-8 rounded-xl ${currentImageSize === size ? "bg-emerald-600 border-none" : "bg-zinc-50 border-zinc-200 text-zinc-600"}`}
                        onClick={() => onImageSizeChange(size)}
                      >
                        {size}
                      </Button>
                    ))}
                  </div>
                  <DropdownMenuSeparator className="bg-zinc-100" />
                </div>
              )}

              <div className="space-y-2">
                <div className="text-sm font-medium">Aspect Ratio</div>
                <div className="grid grid-cols-4 gap-2">
                  {aspectRatioPresets.map(preset => (
                    <Button
                      key={preset.name}
                      variant={currentAspectRatio === preset.name ? "default" : "outline"}
                      className={`h-8 rounded-xl ${currentAspectRatio === preset.name ? "bg-emerald-600 border-none" : "bg-zinc-50 border-zinc-200 text-zinc-600"}`}
                      onClick={() => onAspectRatioChange(preset.name)}
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>

              <DropdownMenuSeparator className=" border-zinc-200" />

              <div className="flex items-center gap-2  border-zinc-200 ">
                <Label className="text-xs">W</Label>
                <Input className="h-8 w-full text-sm text-zinc-900 rounded-xl bg-zinc-50 border border-zinc-200 shadow-none" placeholder="2048" value={config.img_width} onChange={(e) => onWidthChange(parseInt(e.target.value) || 1024)} />
                <Label className="text-xs">H</Label>
                <Input className="h-8 w-full text-sm text-zinc-900 rounded-xl bg-zinc-50 border border-zinc-200 shadow-none" placeholder="2048" value={config.image_height} onChange={(e) => onHeightChange(parseInt(e.target.value) || 1024)} />
                <Button variant="outline" size="sm" className="h-8 w-8 p-2 rounded-xl bg-zinc-50 border border-zinc-200" onClick={onToggleAspectRatioLock}>
                  {isAspectRatioLocked ? <Link className="h-4 w-4" /> : <Unlink className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center">
          <input type="file" multiple accept="image/*" onChange={onImageUpload} className="hidden" id="image-upload" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={Inputbutton2}
            onClick={() => {
              const el = document.getElementById('image-upload') as HTMLInputElement | null;
              el?.click();
            }}
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
          <div className="ml-2 flex items-center w-auto">
            <Button
              variant="outline"
              size="sm"
              className={cn(Inputbutton2, isMockMode && "bg-amber-500/20 text-amber-500 border-amber-500/50")}
              onClick={() => onMockModeChange?.(!isMockMode)}
              title="Mock Mode"
            >
              <Sparkles className={cn("w-2 h-2", isMockMode && "animate-pulse")} />
              {isMockMode && <span className="ml-1 text-[10px] font-bold">MOCK</span>}
            </Button>
          </div>
          <div className="ml-2 flex items-center w-auto">
            <Button
              variant="outline"
              size="sm"
              className={Inputbutton2}
              disabled={isOptimizing}
              onClick={() => {
                if (!isOptimizing) {
                  onOptimize();
                }
              }}
            >
              {isOptimizing ? (
                <Loader2 className="w-2 h-2 animate-spin " />
              ) : (
                <Sparkles className="w-2 h-2 " />
              )}
            </Button>
          </div>

        </div>

        <div className="relative ml-auto rounded-full">
          <GlowEffect
            colors={['#ecffd1ff', '#40cf8fff', '#79cbffff', '#e1ffe3ff']}
            mode='pulse'
            blur='strong'
            duration={5}
            scale={1.5}
            className="absolute inset-0 rounded-3xl opacity-70"
          />
          <Button onClick={onGenerate} disabled={isGenerating} className="relative z-10 w-auto h-10 bg-white text-black font-medium py-1 rounded-full hover:bg-white shadow-[0_0_16px_rgba(255,255,255,0.6)] hover:shadow-[0_0_24px_rgba(255,255,255,0.9)] transition-shadow duration-300 hover:border-white hover:border hover:text-[#203d87]">
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {loadingText}
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 " />
                Generate
              </>
            )}
          </Button>
        </div>
      </div>
      <AnimatePresence>
        {isSelectorExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 400, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="w-full overflow-hidden"
          >
            <div className="relative w-full h-[400px] border-t border-white/10  p-4 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="space-y-6">
                <section>
                  <h3 className={itemLable}>Online Models</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleUnifiedSelectChange('nano_banana')}
                      className={cn(itemClassName, selectValue === 'nano_banana' && "ring-2 ring-emerald-400 bg-emerald-400/10")}
                    >
                      <span className={`w-2 h-2 rounded-full ${selectValue === 'nano_banana' ? 'bg-emerald-400' : 'bg-transparent border border-white/30'}`} />
                      Nano banana
                    </button>
                    <button
                      onClick={() => handleUnifiedSelectChange('seed3')}
                      className={cn(itemClassName, selectValue === 'seed3' && "ring-2 ring-emerald-400 bg-emerald-400/10")}
                    >
                      <span className={`w-2 h-2 rounded-full ${selectValue === 'seed3' ? 'bg-emerald-400' : 'bg-transparent border border-white/30'}`} />
                      Seed 3
                    </button>
                    <button
                      onClick={() => handleUnifiedSelectChange('seed4')}
                      className={cn(itemClassName, selectValue === 'seed4' && "ring-2 ring-emerald-400 bg-emerald-400/10")}
                    >
                      <span className={`w-2 h-2 rounded-full ${selectValue === 'seed4' ? 'bg-emerald-400' : 'bg-transparent border border-white/30'}`} />
                      Seed 4
                    </button>
                  </div>
                </section>

                <section>
                  <h3 className={itemLable}>Workflow Gallery</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {(Array.isArray(workflows) ? workflows : []).map((wf: IViewComfy) => {
                      const wfId = `wf:${String(wf.viewComfyJSON.id)}`;
                      return (
                        <button
                          key={wf.viewComfyJSON.id}
                          onClick={() => handleUnifiedSelectChange(wfId)}
                          className={cn(itemClassName, selectValue === wfId && "ring-2 ring-emerald-400 bg-emerald-400/10")}
                        >
                          <span className={`w-2 h-2 rounded-full ${selectValue === wfId ? 'bg-emerald-400' : 'bg-transparent border border-white/30'}`} />
                          <span className="truncate">{wf.viewComfyJSON.title || 'Untitled'}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

