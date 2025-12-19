import React from 'react';
import Image from 'next/image';

import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";

import { AIModel } from "@/hooks/features/PlaygroundV2/usePromptOptimization";
import { UploadedImage } from '@/components/features/playground-v2/types';
import { GlowEffect } from "@/components/motion-primitives/glow-effect";
interface PromptInputProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  uploadedImages: UploadedImage[];
  onRemoveImage: (index: number) => void;
  isOptimizing: boolean;
  onOptimize: () => void;
  selectedAIModel: AIModel;
  onAIModelChange: (model: AIModel) => void;
}

export default function PromptInput({
  prompt,
  onPromptChange,
  uploadedImages,
  onRemoveImage,

}: PromptInputProps) {



  return (
    <div className="w-full space-y-2 ">


      <div className="relative w-full ">

        <Textarea
          placeholder="请描述您想要生成的图像，例如：黄色的lemo圣诞老人，淡蓝色的背景"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          className="h-36 w-full placeholder:text-white/40 resize-none bg-black/80 backdrop-blur-xl  inset-[-1px] shadow-none rounded-3xl text-white leading-relaxed tracking-wide p-4 border border-white/20"
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
