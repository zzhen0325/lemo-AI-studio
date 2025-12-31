import React from 'react';
import { motion } from "framer-motion";
import Image from "next/image";
import { Download, Type, Image as ImageIcon, Box, RefreshCw, Loader2, Copy, Check, Layers } from "lucide-react";
import { GenerationResult } from '@/components/features/playground-v2/types';
import { TooltipButton } from "@/components/ui/tooltip-button";
import { usePlaygroundStore } from '@/lib/store/playground-store';
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/common/use-toast";


interface HistoryListProps {
  history: GenerationResult[];
  onRegenerate: (result: GenerationResult) => void;
  onDownload: (imageUrl: string) => void;
  onImageClick: (result: GenerationResult, initialRect?: DOMRect) => void;
  isGenerating?: boolean;
  variant?: 'default' | 'sidebar';
  onBatchUse?: (results: GenerationResult[], sourceImage?: string) => void;
}

interface GroupedHistoryItem {
  type: 'image' | 'text';
  key: string; // prompt for image, sourceImage for text
  items: GenerationResult[];
  sourceImage?: string; // only for text type
}

export default function HistoryList({
  history,
  onRegenerate,
  onDownload,
  onImageClick,
  variant = 'default',
  onBatchUse,
}: HistoryListProps) {

  // Group history by date, then by type & key
  const groupedHistory = React.useMemo(() => {
    const dateGroups: { [key: string]: GroupedHistoryItem[] } = {};

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

      const type = result.type || 'image';
      // Support both flat prompt (from history.json) and config.prompt (live generation)
      const promptValue = result.prompt || result.config?.prompt || "未知分组";
      const key = type === 'text' ? (result.sourceImage || "Unknown") : promptValue;

      // Find existing group for the same type (image/text), key and within a small time window (e.g. 1m)
      const existingGroup = dateGroups[title].find(g =>
        g.type === type &&
        g.key === key &&
        Math.abs(new Date(g.items[0].timestamp).getTime() - new Date(result.timestamp).getTime()) < 60000
      );

      if (existingGroup) {
        existingGroup.items.push(result);
      } else {
        dateGroups[title].push({
          type,
          key,
          items: [result],
          sourceImage: type === 'text' ? result.sourceImage : undefined
        });
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
      {Object.entries(groupedHistory).map(([dateTitle, groups]) => (
        <div key={dateTitle} className={cn(
          "flex flex-col mb-12 w-full mx-auto",
          variant === 'default' ? "max-w-[1500px]" : "max-w-full"
        )}>
          <h3 className="text-sm font-medium text-white/50 mb-6 uppercase tracking-wider border-l-2 border-white/10 ml-1 pl-3">{dateTitle}</h3>

          <div className="space-y-10">
            {groups.map((group, groupIdx) => (
              <div key={`${dateTitle}-${groupIdx}`} className="flex flex-col">

                {group.type === 'image' ? (
                  // Image Generation Group: Standard header + Grid
                  <>
                    <div className="flex items-start gap-2 mb-4 group/prompt">
                      <div className="mt-1 p-1 rounded-md bg-white/5 border border-white/10 text-white/40 group-hover/prompt:text-white/60 transition-colors">
                        <Type className="w-3 h-3" />
                      </div>
                      <p className="text-sm text-white/70 leading-relaxed line-clamp-2 italic font-light group-hover/prompt:text-white transition-colors cursor-default" title={group.key}>
                        {group.key}
                      </p>
                    </div>

                    <div
                      className="flex w-full gap-4 overflow-x-auto pb-4 custom-scrollbar flex-nowrap"
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
                  </>
                ) : (
                  // Text/Describe Group: Unified Grid for Source Image + Text Cards
                  <div className="grid gap-4 w-full"
                    style={{
                      gridTemplateColumns: `repeat(auto-fill, minmax(200px, 1fr))`
                    }}>

                    {/* Source Image Card - First Item */}
                    <div className="relative aspect-[3/4] rounded-lg overflow-hidden border border-white/10 bg-black/15 group">
                      {group.sourceImage ? (
                        <Image
                          src={group.sourceImage}
                          alt="Source for describe"
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
                          className="object-cover"
                          quality={75}
                        />

                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/20">
                          <ImageIcon className="w-8 h-8" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur rounded text-xs text-white/80 font-medium border border-white/10 z-10">
                        Source Image
                      </div>

                      {/* Use All Button */}
                      {onBatchUse && group.items.length > 0 && (
                        <div className="absolute bottom-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                          <TooltipButton
                            icon={<Layers className="w-4 h-4" />}
                            label="Use All"
                            tooltipContent="Generate all prompts"
                            tooltipSide="top"
                            className="w-8 h-8 rounded-lg bg-black/60 hover:bg-emerald-500 text-white/80 hover:text-white border border-white/10"
                            onClick={() => onBatchUse(group.items, group.sourceImage)}
                          />
                        </div>
                      )}
                    </div>

                    {/* Text Cards - Subsequent Items */}
                    {group.items.map((result) => (
                      <TextHistoryCard
                        key={result.id}
                        result={result}
                        onRegenerate={onRegenerate}
                      />
                    ))}
                  </div>
                )}

              </div>
            ))}
          </div>
        </div>
      ))
      }
    </div >
  );
}

function HistoryCard({
  result,
  onRegenerate,
  onDownload,
  onImageClick,
}: {
  result: GenerationResult;
  onRegenerate: (result: GenerationResult) => void;
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
      className="group relative h-64 shrink-0 overflow-hidden bg-black/15 rounded-lg border border-white/10 transition-all duration-300 hover:border-white/30 w-auto"
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="relative z-0 h-full w-auto flex items-center"
      >
        {result.isLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-black/20">
            <Loader2 className="w-8 h-8 animate-spin text-white/20" />
          </div>
        ) : mainImage ? (
          <Image
            src={mainImage}
            alt="Generated image"
            width={result.config?.img_width || 1024}
            height={result.config?.image_height || 1024}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            quality={95}
            className="h-full w-auto object-contain cursor-pointer scale-100 group-hover:scale-105 transition-transform duration-500"
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
          onClick={() => applyPrompt(result.prompt || result.config?.prompt || '')}
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
          onClick={() => result.config && applyModel(result.config.base_model, result.config)}
        />
        <div className="w-[1px] h-4 bg-white/10 mx-0.5" />
        <TooltipButton
          icon={<RefreshCw className="w-4 h-4" />}
          label="Remix"
          tooltipContent="Recreate"
          tooltipSide="top"
          className="w-8 h-8 rounded-xl text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
          onClick={() => onRegenerate(result)}
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

function TextHistoryCard({
  result,
  onRegenerate
}: {
  result: GenerationResult;
  onRegenerate: (result: GenerationResult) => void;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    const promptValue = result.prompt || result.config?.prompt || '';
    navigator.clipboard.writeText(promptValue);
    setCopied(true);
    toast({ title: "Copied", description: "Prompt copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    // 文字卡片
    <div className="group relative flex flex-col p-4 bg-white/5 border border-white/10 rounded-lg hover:border-white/30 hover:bg-white/10 transition-all aspect-[3/4]">
      <div className="flex items-start gap-2 mb-2">
        <div className="p-1.5 rounded-md bg-white/10 text-white/60">
          <Type className="w-3.5 h-3.5" />
        </div>
        <div className="text-xs text-white/40 font-mono mt-1">
          Generated Description
        </div>
      </div>

      <p className="text-sm text-white/80 leading-relaxed font-light line-clamp-[8] flex-1">
        {result.prompt || result.config?.prompt}
      </p>

      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onRegenerate(result)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg text-xs font-medium text-emerald-400 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Remix
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium text-white transition-colors ml-auto"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div >
  );
}
