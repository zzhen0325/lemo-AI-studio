import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Wand2, ImagePlus, ChevronDown, Link, Unlink, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { GenerationConfig } from '@/components/features/playground-v2/types';
import type { IViewComfy } from "@/lib/providers/view-comfy-provider";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select"

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
  onOptimize: () => void;
  isOptimizing: boolean;
}

export default function ControlToolbar({
  selectedModel,
  onModelChange,
  config,
  onConfigChange,
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
  uploadedImagesCount,
  onOpenWorkflowSelector,
  onOpenBaseModelSelector,
  onOpenLoraSelector,
  selectedWorkflowName,
  selectedBaseModelName,
  selectedLoraNames = [],
  workflows = [],
  onWorkflowSelect,
  onOptimize,
  isOptimizing,
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

    const Inputbutton2 = "h-10 w-auto text-white rounded-2xl bg-white/30 border-white/10";
  return (
    <div className="w-full h-12 flex justify-between items-center gap-2 px-2  py-2">
      <div className="flex items-center ">
        <Select value={selectValue} onValueChange={handleUnifiedSelectChange}>
          <SelectTrigger className={Inputbutton2}>
            <SelectValue placeholder="选择模型/工作流" />
          </SelectTrigger>
          <SelectContent className="p-3 text-zinc-900 rounded-3xl bg-white border border-zinc-200">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start">
              <div>
                <SelectGroup >
                  <SelectLabel className="px-2 text-sm font-normal text-zinc-400">Online</SelectLabel>
                  <SelectItem  value="seed3">Seed 3</SelectItem>
                  <SelectItem  value="seed4">Seed 4</SelectItem>
                  <SelectItem  value="nano_banana">Nano banana</SelectItem>
                </SelectGroup>
              </div>
              <SelectSeparator className="my-0 w-px h-full bg-zinc-200" />
              <div>
                <SelectGroup>
                  <SelectLabel className="px-2 text-sm font-normal text-zinc-400">Workflow</SelectLabel>
                  {(Array.isArray(workflows) ? workflows : []).map((wf: IViewComfy) => (
                    <SelectItem key={wf.viewComfyJSON.id} value={`wf:${String(wf.viewComfyJSON.id)}`}>
                      {wf.viewComfyJSON.title || 'Untitled Workflow'}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </div>
            </div>
          </SelectContent>
        </Select>
      </div>
      
   

      {selectedModel === 'Workflow' && (
        <div className="flex items-center gap-2">
          {/* <Button variant="outline" className={Inputbutton2} onClick={() => onOpenWorkflowSelector?.()}>
            {selectedWorkflowName || "选择工作流"}
          </Button> */}
          <Button variant="outline" className={Inputbutton2} onClick={() => onOpenBaseModelSelector?.()}>
            {selectedBaseModelName || "基础模型"}
          </Button>
          <Button variant="outline" className={Inputbutton2} onClick={() => onOpenLoraSelector?.()}>
            {selectedLoraNames.length > 0 ? `LoRA (${selectedLoraNames.length})` : "LoRA 模型"}
          </Button>
        </div>
      )}
           {/* 尺寸按钮 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={Inputbutton2}>
            {currentAspectRatio}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-auto min-w-[280px] max-w-[400px] p-4 text-zinc-900 rounded-2xl bg-white border border-zinc-200 ">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Size</div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {aspectRatioPresets.map(preset => (
                <Button
                  key={preset.name}
                  variant="outline"
                  className="h-8 rounded-xl bg-white/10 border border-white/10"
                  onClick={() => onConfigChange({ width: preset.width, height: preset.height })}
                >
                  {preset.name}
                </Button>
              ))}
            </div>

            <DropdownMenuSeparator className=" border-zinc-200" />

            <div className="flex items-center gap-2  border-zinc-200 ">
              <Label className="text-xs">W</Label>
              <Input className="h-8 w-full text-sm text-zinc-900 rounded-xl bg-zinc-50 border border-zinc-200 shadow-none" placeholder="2048" value={config.width} onChange={(e) => onWidthChange(parseInt(e.target.value) || 1024)} />
              <Label className="text-xs">H</Label>
              <Input className="h-8 w-full text-sm text-zinc-900 rounded-xl bg-zinc-50 border border-zinc-200 shadow-none" placeholder="2048" value={config.height} onChange={(e) => onHeightChange(parseInt(e.target.value) || 1024)} />
              <Button variant="outline" size="sm" className="h-8 w-8 p-2 rounded-xl bg-zinc-50 border border-zinc-200" onClick={onToggleAspectRatioLock}>
                {isAspectRatioLocked ? <Link className="h-4 w-4" /> : <Unlink className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center">
        <input type="file" multiple accept="image/*" onChange={onImageUpload} className="hidden" id="image-upload" />
        <label htmlFor="image-upload">
          <Button type="button" variant="outline" size="sm" className={Inputbutton2} asChild>
            <div>
              <ImagePlus className="h-4 w-4" />
            </div>
          </Button>
        </label>
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

      <Button onClick={onGenerate} disabled={isGenerating} className="ml-auto w-10 h-10 bg-white text-[#0b4634] font-medium py-1 rounded-full hover:bg-white shadow-[0_0_8px_rgba(255,255,255,0.35)] hover:shadow-[0_0_18px_rgba(255,255,255,0.7)] transition-shadow duration-300 hover:border-white hover:border hover:text-[#203d87]">
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {loadingText}
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4" />
           
          </>
        )}
      </Button>
    </div>
  );
}
