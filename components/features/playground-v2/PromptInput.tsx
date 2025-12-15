import React from 'react';
import Image from 'next/image';
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


  const Inputbutton2 = "w-auto text-white rounded-3xl bg-white/5 backdrop-blur-sm border border-white/40"; 

  return (
    <div className="w-full space-y-2 ">
      <div className="flex w-full items-center space-x-3">
        <div className="flex items-center gap-1 self-stretch">
          <span className="text-3xl font-[InstrumentSerif-Regular] text-white text-shadow-[0 2 20px rgba(255, 255, 255, 1)] ">
            Prompts
          </span>
        </div>

        
      </div>

      <div className="w-full relative ">
        <Textarea
          placeholder="请描述您想要生成的图像，例如：黄色的lemo圣诞老人，淡蓝色的背景"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          className="h-36 w-full placeholder:text-white/40 resize-none bg-white/10 backdrop-blur-xl   shadow-none rounded-3xl text-white leading-relaxed tracking-wide p-4 border border-white/20"
        />

        {uploadedImages.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {uploadedImages.map((image, index) => (
              <div key={index} className="relative">
                <Image
                  src={image.previewUrl}
                  alt={`上传的图片 ${index + 1}`}
                  width={64}
                  height={64}
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
