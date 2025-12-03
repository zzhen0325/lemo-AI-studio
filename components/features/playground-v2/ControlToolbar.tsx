import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Wand2, ImagePlus, ChevronDown, Link, Unlink, BadgeCheck, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
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
}: ControlToolbarProps) {


    const Inputbutton2 = "h-10 w-auto text-sm text-zinc-900 rounded-2xl bg-zinc-50  border border-zinc-200"; 
    const [menuCategory, setMenuCategory] = useState<'seed'|'nano'|'workflow'>('seed');
  return (
    <div className="w-full flex justify-between items-center gap-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={Inputbutton2}>
            {selectedModel}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-[520px]  justify-center p-3 text-zinc-900 rounded-2xl bg-white border border-zinc-200">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex w-full flex-col gap-2">
              <Item variant="outline" size="sm" asChild onClick={() => setMenuCategory('seed')}>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  <ItemMedia>
                    <BadgeCheck className="size-5 text-zinc-600" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>Seed</ItemTitle>
                  </ItemContent>
                  <ItemActions>
                    <ChevronRight className="size-4 text-zinc-600" />
                  </ItemActions>
                </a>
              </Item>
              <Item variant="outline" size="sm" asChild onClick={() => setMenuCategory('nano')}>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  <ItemMedia>
                    <BadgeCheck className="size-5 text-zinc-600" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>Nano</ItemTitle>
                  </ItemContent>
                  <ItemActions>
                    <ChevronRight className="size-4 text-zinc-600" />
                  </ItemActions>
                </a>
              </Item>
              <Item variant="outline" size="sm" asChild onClick={() => setMenuCategory('workflow')}>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  <ItemMedia>
                    <BadgeCheck className="size-5 text-zinc-600" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>Workflow</ItemTitle>
                  </ItemContent>
                  <ItemActions>
                    <ChevronRight className="size-4 text-zinc-600" />
                  </ItemActions>
                </a>
              </Item>
            </div>
            <div>
              {menuCategory === 'seed' && (
                <div className="flex flex-col gap-2">
                  <DropdownMenuItem className="rounded-xl" onSelect={() => onModelChange("3D Lemo seed3")}>Seed 3</DropdownMenuItem>
                  <DropdownMenuItem className="rounded-xl" onSelect={() => onModelChange("Seed 4.0")}>Seed 4</DropdownMenuItem>
                </div>
              )}
              {menuCategory === 'nano' && (
                <div className="flex flex-col gap-2">
                  <DropdownMenuItem className="rounded-xl" onSelect={() => onModelChange("Nano banana")}>Nano banana</DropdownMenuItem>
                </div>
              )}
              {menuCategory === 'workflow' && (
                <ScrollArea className="max-h-[240px]">
                  <div className="flex flex-col gap-2 pr-2">
                    {(Array.isArray(workflows) ? workflows : []).map((wf: IViewComfy) => (
                      <Item
                        key={wf.viewComfyJSON.id}
                        variant="outline"
                        size="sm"
                        asChild
                        onClick={() => { onModelChange("Workflow"); onWorkflowSelect?.(wf); }}
                      >
                        <a href="#" onClick={(e) => e.preventDefault()}>
                          <ItemMedia>
                            <BadgeCheck className="size-5 text-zinc-600" />
                          </ItemMedia>
                          <ItemContent>
                            <ItemTitle>{wf.viewComfyJSON.title || 'Untitled Workflow'}</ItemTitle>
                          </ItemContent>
                        </a>
                      </Item>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

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
// Inline Item components for styled list entries in dropdown (no new files)
interface ItemProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'outline' | 'ghost';
  size?: 'sm' | 'md';
  asChild?: boolean;
}
const Item = ({ variant = 'outline', size = 'sm', asChild, className, children, ...props }: ItemProps) => {
  const base = "flex items-center gap-2 rounded-xl cursor-pointer select-none transition-colors";
  const v = variant === 'outline' ? "border border-zinc-200 bg-white hover:bg-zinc-100" : "bg-transparent hover:bg-zinc-100";
  const s = size === 'sm' ? "px-3 py-2" : "px-4 py-3";
  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<any>;
    const mergedClass = `${base} ${v} ${s} ${className ?? ''} ${(child.props as any)?.className ?? ''}`;
    const mergedProps: any = { className: mergedClass };
    if (typeof (props as any).onClick === 'function') {
      mergedProps.onClick = (props as any).onClick;
    }
    return React.cloneElement(child, mergedProps);
  }
  return (
    <div className={`${base} ${v} ${s} ${className ?? ''}`} {...props}>
      {children}
    </div>
  );
};
const ItemMedia = ({ className, children }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex items-center ${className ?? ''}`}>{children}</div>
);
const ItemContent = ({ className, children }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex-1 min-w-0 ${className ?? ''}`}>{children}</div>
);
const ItemTitle = ({ className, children }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={`text-sm text-zinc-900 ${className ?? ''}`}>{children}</span>
);
const ItemActions = ({ className, children }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex items-center ${className ?? ''}`}>{children}</div>
);
