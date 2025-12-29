'use client';

import React from 'react';
import { StyleStack } from './types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Play, Copy, ExternalLink } from 'lucide-react';
import NextImage from 'next/image';
import { useToast } from '@/hooks/common/use-toast';

interface StyleDetailViewProps {
    style: StyleStack;
    onBack: () => void;
    onApply: (prompt: string) => void;
}

export const StyleDetailView: React.FC<StyleDetailViewProps> = ({
    style,
    onBack,
    onApply
}) => {
    const { toast } = useToast();

    const handleCopyPrompt = () => {
        navigator.clipboard.writeText(style.prompt);
        toast({ title: "已复制", description: "提示词已复制到剪贴板" });
    };

    return (
        <div className="flex flex-col gap-8 w-full animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Header / Navigation */}
            <div className="flex flex-col gap-6">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="w-fit -ml-2 text-white/40 hover:text-white hover:bg-white/5 gap-2 rounded-xl"
                >
                    <ChevronLeft size={20} />
                    返回风格库
                </Button>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <h2 className="text-4xl font-bold text-white">{style.name}</h2>
                        <div className="group relative p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                            <p className="text-white/80 leading-relaxed pr-8">
                                {style.prompt || "无提示词"}
                            </p>
                            {style.prompt && (
                                <button
                                    onClick={handleCopyPrompt}
                                    className="absolute top-4 right-4 text-white/20 hover:text-white transition-colors"
                                >
                                    <Copy size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    <Button
                        onClick={() => onApply(style.prompt)}
                        className="rounded-2xl h-14 px-8 bg-white text-black hover:bg-white/90 gap-3 font-semibold shadow-2xl scale-105 hover:scale-110 transition-transform active:scale-95"
                    >
                        <Play size={18} fill="currentColor" />
                        应用风格到 Playground
                    </Button>
                </div>
            </div>

            {/* Image Grid */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white/40 uppercase tracking-widest">
                        收录的图片 ({style.imagePaths.length})
                    </span>
                    <div className="h-px flex-1 bg-white/5" />
                </div>

                {style.imagePaths.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:columns-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {style.imagePaths.map((path, index) => (
                            <div
                                key={`${path}-${index}`}
                                className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 bg-white/5"
                            >
                                <NextImage
                                    src={path}
                                    alt={`Style image ${index}`}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button size="icon" variant="ghost" className="text-white/70 hover:text-white" asChild>
                                        <a href={path} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink size={20} />
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.01]">
                        <p className="text-white/20 italic text-lg">暂无关联图片</p>
                        <p className="text-white/10 text-sm">在 Gallery 中点击“添加到风格”来丰富此堆叠</p>
                    </div>
                )}
            </div>
        </div>
    );
};
