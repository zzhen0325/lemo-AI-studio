import React from 'react';
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Loader2, RefreshCw, Download } from "lucide-react";
import { GenerationResult, GenerationConfig } from '@/components/features/playground-v2/types';
import { ProgressiveBlur } from "@/components/motion-primitives/progressive-blur";


interface HistoryListProps {
  history: GenerationResult[];
  onRegenerate: (config: GenerationConfig) => void;
  onDownload: (imageUrl: string) => void;
  onImageClick: (result: GenerationResult, initialRect?: DOMRect) => void;
  isGenerating: boolean;
}

export default function HistoryList({
  history,
  onRegenerate,
  onDownload,
  onImageClick,
  isGenerating
}: HistoryListProps) {
  if (history.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols- xl:grid-cols-6 gap-1 justify-center w-full max-w-[90vw] h-auto mx-auto  overflow-y-auto">
      {history.map((result) => (
        <HistoryCard
          key={result.id}
          result={result}
          onRegenerate={onRegenerate}
          onDownload={onDownload}
          onImageClick={onImageClick}
          isGenerating={isGenerating}
        />
      ))}
    </div>
  );
}

function HistoryCard({
  result,
  onRegenerate,
  onDownload,
  onImageClick,
  isGenerating
}: {
  result: GenerationResult;
  onRegenerate: (config: GenerationConfig) => void;
  onDownload: (imageUrl: string) => void;
  onImageClick: (result: GenerationResult, initialRect?: DOMRect) => void;
  isGenerating: boolean;
}) {
  const [isHover, setIsHover] = React.useState(false);
  const mainImage = result.imageUrl || (result.imageUrls && result.imageUrls[0]);

  return (
    <div
      className="flex flex-col w-full h-auto gap-2  rounded-[10px]  transition-all duration-300 "
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      {/* 上方：展示单张图片 */}
      <div className="relative h-auto w-full rounded-[10px] overflow-hidden bg-white/5 border border-white/10 transition-all duration-100 hover:border-white/20">
        {result.isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-white/20" />
          </div>
        ) : mainImage ? (
          <Image
            src={mainImage}
            alt="Generated image"
            width={result.config.img_width || 1024}
            height={result.config.image_height || 1024}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="w-full h-auto object-cover cursor-pointer transition-transform duration-500 scale-100 hover:scale-105"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              onImageClick(result, rect);
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-white/5" />
          </div>
        )}
        <ProgressiveBlur
          className="absolute bottom-0 left-0 w-full h-[30%] pointer-events-none z-10"
          blurIntensity={1}
          visible={isHover}
          revealTransition={{ duration: 0.2, ease: 'easeOut' }}
        />
        <div className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 w-[90%] flex gap-2 justify-center transition-all duration-300 ${isHover ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <Button
            onClick={() => onRegenerate(result.config)}
            className="flex-1 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white/90   transition-all text-[12px] font-medium "
            disabled={isGenerating}
          >
            <RefreshCw className="w-3 h-3 " />
            Remix
          </Button>

          {result.imageUrl && (
            <Button
              onClick={() => onDownload(result.imageUrl!)}
              className="flex-1 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white/90   transition-all text-[12px] font-medium "
            >
              <Download className="w-3 h-3 " />
              Save
            </Button>
          )}
        </div>
      </div>


      {/* 下方：展示生成参数信息 */}
      <div className="flex flex-col space-y-4 pt-4 border-t border-white/10">
        {/* Prompt */}
        <div className="col-span-2 space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Prompt</div>
          <div className="text-[13px] leading-relaxed text-white/80 font-light line-clamp-2  transition-all duration-300">
            {result.config.prompt}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-6 items-start">

          {/* 模型与分辨率 */}
          <div className="flex flex-col gap-4">
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Model</div>
              <div className="text-sm text-emerald-400 font-medium truncate">{result.config.base_model}</div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Size</div>
              <div className="text-xs text-white/60 font-medium">{result.config.img_width} × {result.config.image_height}</div>
            </div>
          </div>
          {result.config.lora && (
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-widest text-white/30 font-bold">LoRA</div>
              <div className="text-xs text-white/50 truncate italic">{result.config.lora}</div>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center text-[9px] text-zinc-500 uppercase tracking-tighter italic opacity-50">
          <span>Entry ID: {result.id}</span>
          <span>Created at {new Date(result.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

    </div>
  );
}

