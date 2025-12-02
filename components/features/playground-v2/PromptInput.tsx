import React from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, ChevronDown, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { AIModel } from "@/hooks/features/PlaygroundV2/usePromptOptimization";
import { UploadedImage } from '@/components/features/playground-v2/types';

interface PromptInputProps {
  text: string;
  onTextChange: (value: string) => void;
  uploadedImages: UploadedImage[];
  onRemoveImage: (index: number) => void;
  isOptimizing: boolean;
  onOptimize: () => void;
  selectedAIModel: AIModel;
  onAIModelChange: (model: AIModel) => void;
}

export default function PromptInput({
  text,
  onTextChange,
  uploadedImages,
  onRemoveImage,
  isOptimizing,
  onOptimize,
  selectedAIModel,
  onAIModelChange
}: PromptInputProps) {
  return (
    <div className="w-full space-y-6">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2 self-stretch">
          <span className="text-[24px] font-[ShowsGracious] text-white">
            Prompts
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-10 px-4 items-center gap-1 text-white rounded-2xl bg-black/30 backdrop-blur-2xl border border-white/20"
            disabled={isOptimizing || !text.trim()}
            onClick={() => {
              if (!isOptimizing && text.trim()) {
                onOptimize();
              }
            }}
          >
            {isOptimizing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            <span className="text-xs">
              {selectedAIModel === 'gemini' ? 'Gemini' :
                selectedAIModel === 'doubao' ? '豆包1.6' : 'GPT'} 优化
            </span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-10 px-1 items-center text-white rounded-2xl bg-black/30 backdrop-blur-2xl border border-white/20"
              >
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto text-white rounded-2xl bg-black/30 backdrop-blur-2xl border border-white/10">
              <DropdownMenuItem
                onClick={() => onAIModelChange('gemini')}
                className={selectedAIModel === 'gemini' ? 'bg-white/10' : ''}
              >
                <Sparkles className="w-3 h-3 mr-2" />
                Gemini
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onAIModelChange('doubao')}
                className={selectedAIModel === 'doubao' ? 'bg-white/20' : ''}
              >
                <Sparkles className="w-3 h-3 mr-2" />
                豆包1.6
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onAIModelChange('gpt')}
                className={selectedAIModel === 'gpt' ? 'bg-white/20' : ''}
              >
                <Sparkles className="w-3 h-3 mr-2" />
                GPT
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="w-full relative">
        <Textarea
          placeholder="请描述您想要生成的图像，例如：黄色的lemo圣诞老人，淡蓝色的背景"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          className="h-36 w-full placeholder:text-white/40 resize-none bg-black/40 backdrop-blur-3xl shadow-none rounded-2xl text-white leading-relaxed tracking-wide p-4 border !border-white/15"
        />

        {uploadedImages.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {uploadedImages.map((image, index) => (
              <div key={index} className="relative">
                <img
                  src={image.previewUrl}
                  alt={`上传的图片 ${index + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border"
                />
                <button
                  onClick={() => onRemoveImage(index)}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
