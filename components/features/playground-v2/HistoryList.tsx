import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Download } from "lucide-react";
import { GenerationResult, GenerationConfig } from '@/components/features/playground-v2/types';

interface HistoryListProps {
  history: GenerationResult[];
  onRegenerate: (config: GenerationConfig) => void;
  onDownload: (imageUrl: string) => void;
  onImageClick: (imageUrl: string) => void;
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
    <div className="w-full max-w-5xl mx-auto space-y-6 p-4">
      <div className="space-y-4">
        {history.map((result, index) => (
          <Card key={`${result.timestamp}-${index}`} className="rounded-3xl bg-black/20 backdrop-blur-2xl border border-white/10 shadow-none h-[300px] relative">
            <CardContent className="p-4 h-full">
              {result.isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-white/50" />
                    <p className="text-white text-lg font-medium">正在生成图像...</p>
                    <p className="text-white/70 text-sm mt-2">请稍候，这可能需要几秒钟</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="absolute top-4 right-4 z-10 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => onRegenerate(result.config)}
                      className="w-10 h-10 rounded-xl bg-black/20 backdrop-blur-2xl border border-white/10 font-medium hover:bg-white hover:text-black"
                      disabled={isGenerating}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => onDownload(result.imageUrl)}
                      className="w-10 h-10 rounded-xl bg-black/20 backdrop-blur-2xl border border-white/10 font-medium hover:bg-white hover:text-black"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex h-full gap-4">
                    <div className="w-auto h-full flex-shrink-0">
                      <div className="relative group w-full h-full">
                        <img
                          src={result.imageUrl}
                          alt={`Generated image ${index}`}
                          className="w-full h-full object-cover rounded-2xl cursor-pointer"
                          onClick={() => onImageClick(result.imageUrl)}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
