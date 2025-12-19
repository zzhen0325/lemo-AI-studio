import React from 'react';
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Loader2, RefreshCw, Download } from "lucide-react";
import { GenerationResult, GenerationConfig } from '@/components/features/playground-v2/types';

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
    <div className="w-full max-w-7xl mx-auto p-4 space-y-8">
      {history.map((result, index) => (
        <div key={result.id} className="relative flex flex-col md:flex-row gap-6 bg-gradient-to-b  from-[rgba(0,0,0,0.4)] to-[rgba(28, 74, 63, 0.4)]  backdrop-blur-md border border-white/20  rounded-[24px] p-6 transition-all duration-300 hover:border-white/20">

          {/* Left Side: Images (Currently single image, expandable to grid if needed) */}
          <div className="w-full md:w-1/3 flex-shrink-0">
            <div className="relative aspect-square w-full rounded-[16px] overflow-hidden bg-white/5 group ring-1 ring-white/5 hover:ring-white/20 transition-all">
              {result.isLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                  <Loader2 className="w-8 h-8 animate-spin text-white/30" />
                </div>
              ) : (
                <Image
                  src={result.imageUrl}
                  alt={`Generated ${index}`}
                  fill
                  className="object-cover"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    onImageClick(result, rect);
                  }}
                />
              )}
            </div>
          </div>

          {/* Right Side: Details & Actions */}
          <div className="flex flex-col flex-1 min-w-0">
            {/* Header: Model & Specs */}
            <div className="flex items-center gap-3 mb-3 text-xs font-medium text-white/50 bg-white/5 self-start px-3 py-1.5 rounded-full border border-white/5">
              <span className="text-emerald-400">{result.config.base_model}</span>
              <span className="w-px h-3 bg-white/10"></span>
              <span>{result.config.img_width} x {result.config.image_height}</span>
              <span className="w-px h-3 bg-white/10"></span>
              <span>{new Date(result.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            {/* Prompt */}
            <div className="flex-1 mb-6">
              <p className="text-[15px] leading-relaxed text-white/90 font-light whitespace-pre-wrap break-words">
                {result.config.prompt}
              </p>
              {result.config.lora && (
                <p className="mt-2 text-xs text-white/40">
                  <span className="opacity-50">LoRA:</span> {result.config.lora}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mt-auto">
              <Button
                onClick={() => onRegenerate(result.config)}
                className="h-9 px-4 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5 transition-all text-xs font-medium"
                disabled={isGenerating}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-2" />
                Remix
              </Button>

              <Button
                onClick={() => onDownload(result.imageUrl)}
                className="h-9 px-4 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5 transition-all text-xs font-medium"
              >
                <Download className="w-3.5 h-3.5 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
