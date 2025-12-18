import React from 'react';
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Loader2, RefreshCw, Download } from "lucide-react";
import { GenerationResult, GenerationConfig } from '@/components/features/playground-v2/types';

interface HistoryListProps {
  history: GenerationResult[];
  onRegenerate: (config: GenerationConfig) => void;
  onDownload: (imageUrl: string) => void;
  onImageClick: (result: GenerationResult) => void;
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
    <div className="w-full max-w-7xl mx-auto p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 justify-center">
        {history.map((result, index) => (
          <div key={result.id} className="group relative flex flex-col bg-black/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] overflow-hidden transition-all duration-300 hover:bg-black/50 hover:border-white/10">
            {/* 图片区域 */}
            <div className="p-3 w-full aspect-square">
              <div className="relative w-full h-full rounded-[2rem] overflow-hidden bg-white/5">
                {result.isLoading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mb-3 text-white/30" />
                    <span className="text-white/40 text-xs font-medium">Generating...</span>
                  </div>
                ) : (
                  <>
                    <Image
                      src={result.imageUrl}
                      alt={`Generated ${index}`}
                      fill
                      className="object-cover cursor-pointer transition-transform duration-500 group-hover:scale-105"
                      onClick={() => onImageClick(result)}
                    />
                    {/* 悬浮操作按钮 */}
                    <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 transform translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                      <Button
                        size="icon"
                        onClick={() => onRegenerate(result.config)}
                        className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/10 hover:bg-white hover:text-black"
                        disabled={isGenerating}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        onClick={() => onDownload(result.imageUrl)}
                        className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/10 hover:bg-white hover:text-black"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 文字详情区域 */}
            <div className="px-5 pb-6 flex flex-col flex-1">
              <div className="flex-1">
                <p className="text-white/80 text-sm leading-relaxed line-clamp-3 font-light mb-4">
                  {result.config.prompt}
                </p>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-white/40 uppercase tracking-wider">
                  <div>
                    <span className="block opacity-50 mb-0.5">Model</span>
                    <span className="text-white/60 truncate block">{result.config.base_model}</span>
                  </div>
                  <div>
                    <span className="block opacity-50 mb-0.5">Size</span>
                    <span className="text-white/60 block">{result.config.img_width} × {result.config.image_height}</span>
                  </div>
                </div>
              </div>

              {/* 底部按钮栏 (参考图中样式的简版实现) */}
              <div className="mt-4 flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 flex-1 rounded-full bg-white/5 border border-white/5 text-[11px] text-white/60 hover:bg-white/10 hover:text-white"
                  onClick={() => onImageClick(result)}
                >
                  Details
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 flex-1 rounded-full bg-white/5 border border-white/5 text-[11px] text-white/60 hover:bg-white/10 hover:text-white"
                  onClick={() => onRegenerate(result.config)}
                >
                  Reuse
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
