import React from 'react';
import { AutosizeTextarea } from "@/components/ui/autosize-text-area";
import { AIModel } from "@/hooks/features/PlaygroundV2/usePromptOptimization";
import { UploadedImage } from '@/components/features/playground-v2/types';


interface PromptInputProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  uploadedImages: UploadedImage[];
  onRemoveImage: (index: number) => void;
  isOptimizing: boolean;
  onOptimize: () => void;
  selectedAIModel: AIModel;
  onAIModelChange: (model: AIModel) => void;
  onAddImages: (files: File[] | FileList) => void;
}

export default function PromptInput({
  prompt,
  onPromptChange,
  onAddImages,
}: PromptInputProps) {

  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <div
      className="w-full relative"
      onDragOver={(e) => { e.preventDefault(); }}
      onDrop={(e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files && files.length > 0) onAddImages(files);
      }}
    >
      <AutosizeTextarea
        placeholder="请描述您想要生成的图像，例如：黄色的lemo圣诞老人，淡蓝色的背景"
        value={prompt}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        minHeight={86}
        maxHeight={isFocused ? undefined : 86}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onPromptChange(e.target.value)}
        onPaste={(e: React.ClipboardEvent<HTMLTextAreaElement>) => {
          const items = e.clipboardData?.items;
          if (!items) return;
          const files: File[] = [];
          for (let i = 0; i < items.length; i++) {
            const it = items[i];
            if (it.kind === 'file' && it.type.startsWith('image/')) {
              const f = it.getAsFile();
              if (f) files.push(f);
            }
          }
          if (files.length > 0) {
            e.preventDefault();
            onAddImages(files);
          }
        }}
        className="w-full placeholder:text-white/40 bg-black/90 shadow-none rounded-3xl text-white leading-relaxed tracking-wide p-2 px-4 pt-3 border border-white/20 focus:border-white/20 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none resize-none transition-all duration-200"
      />

      {/* 底部模糊遮罩 - 仅在非 Focus 状态且有内容时显示，用于优雅处理文字溢出 */}
      <div
        className={`absolute bottom-1 left-1 right-1 h-10 pointer-events-none bg-gradient-to-t from-black/95 via-black/50 to-transparent transition-opacity duration-300 rounded-b-3xl z-10 ${!isFocused && prompt.length > 0 ? 'opacity-80' : 'opacity-0'
          }`}
      />
    </div>
  );
}
