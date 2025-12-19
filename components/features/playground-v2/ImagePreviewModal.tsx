import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import Image from "next/image";

import { GenerationConfig } from './types';
import gsap from 'gsap';
import { Flip } from 'gsap/all';

gsap.registerPlugin(Flip);

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  config?: GenerationConfig;
  initialRect?: DOMRect;
}

export default function ImagePreviewModal({ isOpen, onClose, imageUrl, config, initialRect }: ImagePreviewModalProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });

      if (initialRect && imageRef.current) {
        // FLIP animation
        const img = imageRef.current;

        // Ensure image is rendered/sized before measuring
        requestAnimationFrame(() => {
          // 1. Capture the "Final" state (where the image naturally sits in the modal)
          const state = Flip.getState(img);

          // 2. Force the image to match the "Initial" state (thumbnail position/size)
          // Flip.fit applies inline styles to position the element
          Flip.fit(img, initialRect as any, { scale: true, absolute: true });

          // 3. Apply any other initial styles to match the thumbnail (e.g., border radius)
          gsap.set(img, { borderRadius: "16px" });

          // 4. Animate from the "Initial" state (current) back to the "Final" state (captured)
          Flip.to(state, {
            duration: 0.6,
            ease: "power3.inOut",
            scale: true,
            absolute: true, // This toggle is important if the final state wasn't absolute, but we used absolute for fit
            onComplete: () => {
              // Clean up inline styles to allow standard interactions (pan/zoom)
              gsap.set(img, { clearProps: "all" });
            }
          });
        });
      }
    }
  }, [isOpen, imageUrl, initialRect]);

  const handleZoomIn = (e: React.MouseEvent) => { e.stopPropagation(); setScale(prev => Math.min(prev * 1.2, 5)); };
  const handleZoomOut = (e: React.MouseEvent) => { e.stopPropagation(); setScale(prev => Math.max(prev / 1.2, 0.1)); };
  const handleReset = (e: React.MouseEvent) => { e.stopPropagation(); setScale(1); setPosition({ x: 0, y: 0 }); };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setHasMoved(false);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = Math.abs(e.clientX - (dragStart.x + position.x));
    const dy = Math.abs(e.clientY - (dragStart.y + position.y));
    if (dx > 5 || dy > 5) setHasMoved(true);
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => { setIsDragging(false); };

  const handleBackgroundClick = () => {
    if (!hasMoved) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-black/90 backdrop-blur-md overflow-hidden" onClick={handleBackgroundClick}>
      {/* 左侧主要展示区域 */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {/* 底部居中控制栏 */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-full bg-black/40 backdrop-blur-2xl border border-white/10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full text-white/70 hover:text-white hover:bg-white/10" onClick={handleZoomOut}>
            <ZoomOut className="w-5 h-5" />
          </Button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full text-white/70 hover:text-white hover:bg-white/10" onClick={handleReset}>
            <RefreshCw className="w-5 h-5" />
          </Button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full text-white/70 hover:text-white hover:bg-white/10" onClick={handleZoomIn}>
            <ZoomIn className="w-5 h-5" />
          </Button>
          <div className="w-px h-8 bg-white/10 mx-2" />
          <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-red-500 hover:text-white transition-colors" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div
          className="w-full h-full flex items-center justify-center cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <Image
            ref={imageRef}
            src={imageUrl}
            alt="Preview"
            width={1200}
            height={1200}
            unoptimized
            className="max-w-none transition-transform duration-75 select-none w-auto h-auto max-h-[90vh]"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              pointerEvents: 'none'
            }}
          />
        </div>
      </div>

      {/* 右侧参数详情边栏 */}
      <div
        className="w-[360px] h-full bg-black/40 backdrop-blur-3xl border-l border-white/10 flex flex-col hidden md:flex animate-in slide-in-from-right duration-500"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white tracking-tight">Image Details</h3>
          <Button variant="ghost" size="icon" className="rounded-full text-white/40 hover:text-white hover:bg-white/10" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10">
          {/* Prompt Section */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Prompt</h4>
            <div className="p-5 bg-white/5 rounded-[2rem] border border-white/5 group hover:border-white/10 transition-colors duration-300">
              <p className="text-white/80 text-sm leading-relaxed font-light italic">
                &ldquo;{config?.prompt}&rdquo;
              </p>
            </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Model</h4>
            <div className="flex flex-wrap gap-2">
              <span className="px-4 py-2 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20 uppercase tracking-wider">
                {config?.base_model || "Standard"}
              </span>
              {config?.lora && (
                <span className="px-4 py-2 bg-white/5 text-white/60 text-xs font-bold rounded-full border border-white/5 uppercase tracking-wider">
                  {config.lora}
                </span>
              )}
            </div>
          </div>

          {/* Parameters Grid */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Parameters</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-black/20 rounded-3xl border border-white/5 flex flex-col space-y-1">
                <span className="text-[9px] text-white/20 uppercase font-bold tracking-widest">Width</span>
                <span className="text-white text-lg font-medium tabular-nums">{config?.img_width}</span>
              </div>
              <div className="p-5 bg-black/20 rounded-3xl border border-white/5 flex flex-col space-y-1">
                <span className="text-[9px] text-white/20 uppercase font-bold tracking-widest">Height</span>
                <span className="text-white text-lg font-medium tabular-nums">{config?.image_height}</span>
              </div>
              <div className="p-5 bg-black/20 rounded-3xl border border-white/5 flex flex-col space-y-1">
                <span className="text-[9px] text-white/20 uppercase font-bold tracking-widest">Count</span>
                <span className="text-white text-lg font-medium tabular-nums">{config?.gen_num}</span>
              </div>
              <div className="p-5 bg-black/20 rounded-3xl border border-white/5 flex flex-col space-y-1">
                <span className="text-[9px] text-white/20 uppercase font-bold tracking-widest">Model</span>
                <span className="text-white text-xs font-medium tabular-nums truncate">{config?.base_model || 'Standard'}</span>
              </div>
              {config?.ref_image && (
                <div className="col-span-2 p-5 bg-black/20 rounded-3xl border border-white/5 space-y-3">
                  <span className="text-[9px] text-white/20 uppercase font-bold tracking-widest block">Reference Image</span>
                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/5">
                    <Image src={config.ref_image} alt="Reference" fill className="object-cover" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
