import React from 'react';
import { motion } from "framer-motion";
import Image from "next/image";
import { Download, Type, Image as ImageIcon, Box, RefreshCw, Loader2 } from "lucide-react";
import { GenerationResult, GenerationConfig } from '@/components/features/playground-v2/types';
import { TooltipButton } from "@/components/ui/tooltip-button";
import { usePlaygroundStore } from '@/lib/store/playground-store';


interface HistoryListProps {
  history: GenerationResult[];
  onRegenerate: (config: GenerationConfig) => void;
  onDownload: (imageUrl: string) => void;
  onImageClick: (result: GenerationResult, initialRect?: DOMRect) => void;
  isGenerating?: boolean;
}

export default function HistoryList({
  history,
  onRegenerate,
  onDownload,
  onImageClick,
}: HistoryListProps) {
  if (history.length === 0) return null;

  return (
    <div className="relative flex flex-col w-full h-full overflow-y-auto custom-scrollbar  ">
      {/* 顶部或内容容器 */}
      <div className="flex flex-wrap justify-center   max-w-[1500px] mx-auto overflow-y-auto h-full rounded-lg px-4 pb-32  pt-72">
        {history.map((result) => {
          // Dynamic card width logic based on history count
          let widthClass = "w-[280px]";
          if (history.length === 5) widthClass = "w-[280px]";
          else if (history.length === 4) widthClass = "w-[300px]";
          else if (history.length === 3) widthClass = "w-[320px]";
          else if (history.length === 2) widthClass = "w-[320px]";
          else if (history.length === 1) widthClass = "w-[320px]";

          return (
            <div key={result.id} className={`${widthClass} rounded-lg shrink-0`}>
              <HistoryCard
                result={result}
                onRegenerate={onRegenerate}
                onDownload={onDownload}
                onImageClick={onImageClick}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HistoryCard({
  result,
  onRegenerate,
  onDownload,
  onImageClick,
}: {
  result: GenerationResult;
  onRegenerate: (config: GenerationConfig) => void;
  onDownload: (imageUrl: string) => void;
  onImageClick: (result: GenerationResult, initialRect?: DOMRect) => void;
}) {
  const [isHover, setIsHover] = React.useState(false);
  const { applyPrompt, applyModel, applyImage } = usePlaygroundStore();
  const mainImage = result.imageUrl || (result.imageUrls && result.imageUrls[0]);

  return (
    <div
      className="group relative aspect-[3/4] w-full  overflow-hidden bg-black/15  rounded-lg border border-white/10 transition-all duration-300 hover:border-white/30"
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      <motion.div
        layoutId={`image-${result.id}`}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="absolute inset-0 z-0"
      >
        {result.isLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-black/20">
            <Loader2 className="w-8 h-8 animate-spin text-white/20" />
          </div>
        ) : mainImage ? (
          <Image
            src={mainImage}
            alt="Generated image"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 20vw"
            className="object-cover cursor-pointer transition-transform duration-700 scale-100 group-hover:scale-105"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              onImageClick(result, rect);
            }}
          />
        ) : (
          <div className="w-full h-full bg-black/20 flex items-center justify-center" />
        )}
      </motion.div>

      <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 p-1 bg-black/50 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl transition-all duration-50 ${isHover ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'}`} onClick={(e) => e.stopPropagation()}>
        <TooltipButton
          icon={<Type className="w-4 h-4" />}
          label="Use Prompt"
          tooltipContent="Use Prompt"
          tooltipSide="top"
          className="w-8 h-8 rounded-xl text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => applyPrompt(result.config.prompt)}
        />
        <TooltipButton
          icon={<ImageIcon className="w-4 h-4" />}
          label="Use Image"
          tooltipContent="Use Image"
          tooltipSide="top"
          className="w-8 h-8 rounded-xl text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => mainImage && applyImage(mainImage)}
        />
        <TooltipButton
          icon={<Box className="w-4 h-4" />}
          label="Use Model"
          tooltipContent="Use Model"
          tooltipSide="top"
          className="w-8 h-8 rounded-xl text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => applyModel(result.config.base_model, result.config)}
        />
        <div className="w-[1px] h-4 bg-white/10 mx-0.5" />
        <TooltipButton
          icon={<RefreshCw className="w-4 h-4" />}
          label="Remix"
          tooltipContent="Recreate"
          tooltipSide="top"
          className="w-8 h-8 rounded-xl text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
          onClick={() => onRegenerate(result.config)}
        />
        <TooltipButton
          icon={<Download className="w-4 h-4" />}
          label="Download"
          tooltipContent="Download"
          tooltipSide="top"
          className="w-8 h-8 rounded-xl text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => mainImage && onDownload(mainImage)}
        />
      </div>
    </div>
  );
}
