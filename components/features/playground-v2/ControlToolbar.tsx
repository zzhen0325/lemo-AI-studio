import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Wand2, ImagePlus, ChevronDown, Link, Unlink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { GenerationConfig } from '@/components/features/playground-v2/types';

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
  selectedLoraNames = []
}: ControlToolbarProps) {
  return (
    <div className="w-full flex justify-between items-center gap-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-10 w-30 text-sm text-white rounded-2xl bg-black/30 backdrop-blur-2xl border border-white/10 px-4 justify-between">
            {selectedModel}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-30 text-white rounded-2xl bg-black/30 backdrop-blur-2xl border border-white/10">
          <DropdownMenuItem onClick={() => onModelChange("Seed 3.0")}>3D Lemo seed3</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onModelChange("Nano banana")}>Nano banana</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onModelChange("Seed 4.0")}>Seed 4.0</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onModelChange("Workflow")}>Workflow</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-10 w-auto text-white rounded-2xl bg-black/30 backdrop-blur-2xl border border-white/10 px-4 text-sm">
            {currentAspectRatio}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-auto min-w-[280px] max-w-[400px] p-4 text-white rounded-2xl bg-black/30 backdrop-blur-2xl border border-white/10">
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

            <DropdownMenuSeparator className="bg-white/10 border-white/10" />

            <div className="flex items-center gap-2">
              <Label className="text-xs">W</Label>
              <Input className="h-8 w-full text-sm rounded-xl bg-white/10 border border-white/10 shadow-none" placeholder="2048" value={config.width} onChange={(e) => onWidthChange(parseInt(e.target.value) || 1024)} />
              <Label className="text-xs">H</Label>
              <Input className="h-8 w-full text-sm rounded-xl bg-white/10 border border-white/10 items" placeholder="2048" value={config.height} onChange={(e) => onHeightChange(parseInt(e.target.value) || 1024)} />
              <Button variant="outline" size="sm" className="h-8 w-8 p-2 rounded-xl bg-white/10 border border-white/10" onClick={onToggleAspectRatioLock}>
                {isAspectRatioLocked ? <Link className="h-4 w-4" /> : <Unlink className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {selectedModel === 'Workflow' && (
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-10 px-4 text-white rounded-2xl bg-black/30 backdrop-blur-2xl border border-white/10" onClick={() => onOpenWorkflowSelector?.()}>
            {selectedWorkflowName || "选择工作流"}
          </Button>
          <Button variant="outline" className="h-10 px-4 text-white rounded-2xl bg-black/30 backdrop-blur-2xl border border-white/10" onClick={() => onOpenBaseModelSelector?.()}>
            {selectedBaseModelName || "基础模型"}
          </Button>
          <Button variant="outline" className="h-10 px-4 text-white rounded-2xl bg-black/30 backdrop-blur-2xl border border-white/10" onClick={() => onOpenLoraSelector?.()}>
            {selectedLoraNames.length > 0 ? `LoRA (${selectedLoraNames.length})` : "LoRA 模型"}
          </Button>
        </div>
      )}

      <div className="flex items-center">
        <input type="file" multiple accept="image/*" onChange={onImageUpload} className="hidden" id="image-upload" />
        <label htmlFor="image-upload">
          <Button type="button" variant="outline" size="sm" className="h-10 w-10 p-0 text-white hover:bg-white hover:text-black rounded-2xl bg-black/30 backdrop-blur-2xl border border-white/10" asChild>
            <div>
              <ImagePlus className="h-4 w-4" />
            </div>
          </Button>
        </label>
      </div>

      <Button onClick={onGenerate} disabled={isGenerating} className="ml-auto w-30 h-10 bg-white text-black font-medium py-3 rounded-2xl hover:bg-black hover:border-white hover:border hover:text-white">
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {loadingText}
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4" />
            {selectedModel === "Nano banana" && uploadedImagesCount > 0 ? "开始生成" : "开始生成"}
          </>
        )}
      </Button>
    </div>
  );
}
