import React from 'react';
import { motion } from "framer-motion";
import Image from "next/image";
import { Download, Type, Image as ImageIcon, Box, RefreshCw, Loader2 } from "lucide-react";
import { GenerationResult, GenerationConfig } from '@/components/features/playground-v2/types';
import { TooltipButton } from "@/components/ui/tooltip-button";
import { usePlaygroundStore } from '@/lib/store/playground-store';
import { cn } from "@/lib/utils";


interface HistoryListProps {
  history: GenerationResult[];
  onRegenerate: (config: GenerationConfig) => void;
  onDownload: (imageUrl: string) => void;
  onImageClick: (result: GenerationResult, initialRect?: DOMRect) => void;
  isGenerating?: boolean;
  variant?: 'default' | 'sidebar';
}

export default function HistoryList({
  history,
  onRegenerate,
  onDownload,
  onImageClick,
  variant = 'default',
}: HistoryListProps) {
  // Group history by date, then by prompt
  const groupedHistory = React.useMemo(() => {
    const dateGroups: { [key: string]: { prompt: string; items: GenerationResult[] }[] } = {};

    history.forEach((result) => {
      const date = new Date(result.timestamp);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      let title = "";
      if (itemDate.getTime() === today.getTime()) {
        title = "Today";
      } else if (itemDate.getTime() === yesterday.getTime()) {
        title = "Yesterday";
      } else {
        title = itemDate.toLocaleDateString();
      }

      if (!dateGroups[title]) {
        dateGroups[title] = [];
      }

      const prompt = result.config.prompt || "No Prompt";
      const existingPromptGroup = dateGroups[title].find(g => g.prompt === prompt);

      if (existingPromptGroup) {
        existingPromptGroup.items.push(result);
      } else {
        dateGroups[title].push({ prompt, items: [result] });
      }
    });

    return dateGroups;
  }, [history]);

  if (history.length === 0) return null;

  return (
    <div className={cn(
      "relative flex flex-col w-full h-full overflow-y-auto custom-scrollbar px-4 pb-32",
      variant === 'default' ? "mt-80" : "mt-4"
    )}>
      {Object.entries(groupedHistory).map(([dateTitle, promptGroups]) => (
        <div key={dateTitle} className={cn(
          "flex flex-col mb-12 w-full mx-auto",
          variant === 'default' ? "max-w-[1500px]" : "max-w-full"
        )}>
          <h3 className="text-sm font-medium text-white/50 mb-6 pl-1 uppercase tracking-wider border-l-2 border-white/10 ml-1 pl-3">{dateTitle}</h3>

          <div className="space-y-10">
            {promptGroups.map((group, groupIdx) => (
              <div key={`${dateTitle}-${groupIdx}`} className="flex flex-col">
                <div className="flex items-start gap-2 mb-4 group/prompt">
                  <div className="mt-1 p-1 rounded-md bg-white/5 border border-white/10 text-white/40 group-hover/prompt:text-white/60 transition-colors">
                    <Type className="w-3 h-3" />
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed line-clamp-2 italic font-light group-hover/prompt:text-white transition-colors cursor-default" title={group.prompt}>
                    {group.prompt}
                  </p>
                </div>

                <div
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns: `repeat(auto-fill, minmax(${variant === 'default' ? '280px' : '200px'}, 1fr))`
                  }}
                >
                  {group.items.map((result) => (
                    <HistoryCard
                      key={result.id}
                      result={result}
                      onRegenerate={onRegenerate}
                      onDownload={onDownload}
                      onImageClick={onImageClick}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
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
  const applyPrompt = usePlaygroundStore(s => s.applyPrompt);
  const applyModel = usePlaygroundStore(s => s.applyModel);
  const applyImage = usePlaygroundStore(s => s.applyImage);
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
