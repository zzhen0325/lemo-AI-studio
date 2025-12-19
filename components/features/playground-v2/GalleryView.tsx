import React, { useEffect, useState } from 'react';
import { motion } from "framer-motion";
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Download, Hash, Search, Calendar } from "lucide-react";
import ImagePreviewModal from './ImagePreviewModal';
import { ProgressiveBlur } from "@/components/motion-primitives/progressive-blur";

interface HistoryItem {
    id: string;
    url: string;
    timestamp: string;
    metadata: {
        prompt?: string;
        base_model?: string;
        img_width: number;
        img_height: number;
        lora?: string;
    } | null;
}

export default function GalleryView() {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const resp = await fetch('/api/history');
            const data = await resp.json();
            if (data.history) {
                setHistory(data.history);
            }
        } catch (error) {
            console.error('Failed to fetch history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = (e: React.MouseEvent, imageUrl: string, filename: string) => {
        e.stopPropagation();
        const link = document.createElement("a");
        link.href = imageUrl;
        link.download = `${filename}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-transparent p-8">
            <div className="max-w-7xl mx-auto space-y-10 mt-14">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <h1 className="text-5xl font-bold tracking-tight text-white/90">Gallery Archive</h1>
                        <p className="text-white/40 text-lg">Explore your creative journey through generated history.</p>
                    </div>
                    <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl backdrop-blur-xl">
                        <div className="flex flex-col items-end">
                            <span className="text-white/60 text-sm font-medium">Total Assets</span>
                            <span className="text-white text-2xl font-bold tabular-nums">{history.length}</span>
                        </div>
                    </div>
                </header>

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                            <div className="absolute inset-0 bg-emerald-500/10 blur-xl animate-pulse rounded-full" />
                        </div>
                        <p className="text-white/40 font-medium animate-pulse tracking-wide">Syncing Archive...</p>
                    </div>
                ) : history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 bg-white/5 rounded-[3rem] border border-white/10 border-dashed space-y-6">
                        <div className="p-6 bg-white/5 rounded-full">
                            <Search className="w-12 h-12 text-white/20" />
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-white/60 text-xl font-medium">No masterpieces found yet</p>
                            <p className="text-white/30">Your generated images will appear here once you start creating.</p>
                        </div>
                    </div>
                ) : (
                    <div className="columns-1 sm:columns-2 lg:columns-4 xl:columns-6 gap-4 space-y-4">
                        {history.map((item) => (
                            <GalleryCard
                                key={item.id}
                                item={item}
                                onClick={() => setSelectedItem(item)}
                                onDownload={handleDownload}
                            />
                        ))}
                    </div>
                )}
            </div>

            <ImagePreviewModal
                isOpen={!!selectedItem}
                onClose={() => setSelectedItem(null)}
                imageUrl={selectedItem?.url || ''}
                config={selectedItem ? {
                    prompt: selectedItem.metadata?.prompt || '',
                    base_model: selectedItem.metadata?.base_model || 'Standard',
                    lora: selectedItem.metadata?.lora || '',
                    img_width: selectedItem.metadata?.img_width || 1200,
                    image_height: selectedItem.metadata?.img_height || 1200,
                    gen_num: 1
                } : undefined}
            />
        </div>
    );
}

function GalleryCard({ item, onClick, onDownload }: { item: HistoryItem, onClick: () => void, onDownload: (e: React.MouseEvent, url: string, filename: string) => void }) {
    const [isHover, setIsHover] = useState(false);

    return (
        <div
            className="break-inside-avoid group relative bg-black/40 border border-white/5 overflow-hidden rounded-[1.5rem] hover:border-white/20 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] cursor-pointer translate-z-0"
            onClick={onClick}
            onMouseEnter={() => setIsHover(true)}
            onMouseLeave={() => setIsHover(false)}
        >
            {/* Image Container */}
            <div className="relative w-full">
                <Image
                    src={item.url}
                    alt="Generated masterwork"
                    width={item.metadata?.img_width || 1024}
                    height={item.metadata?.img_height || 1024}
                    className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                />

                <ProgressiveBlur
                    className='pointer-events-none absolute bottom-0 left-0 h-[75%] w-full'
                    blurIntensity={0.5}
                    direction='bottom'
                    animate={isHover ? 'visible' : 'hidden'}
                    variants={{
                        hidden: { opacity: 0 },
                        visible: { opacity: 1 },
                    }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                />

                {/* Overlay Content */}
                <motion.div
                    className="absolute inset-0 flex flex-col justify-end p-4"
                    animate={isHover ? 'visible' : 'hidden'}
                    variants={{
                        hidden: { opacity: 0, y: 10 },
                        visible: { opacity: 1, y: 0 },
                    }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                    <div className="space-y-3">
                        {item.metadata?.prompt && (
                            <div className="text-xs text-white/90 line-clamp-3 leading-relaxed font-light drop-shadow-md">
                                {item.metadata.prompt}
                            </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] font-medium tracking-wider text-white/60 uppercase">
                            <span className="flex items-center gap-1.5">
                                <Hash className="w-3 h-3 text-emerald-400" /> {item.id.substring(0, 4)}
                            </span>
                            {item.metadata?.img_width && (
                                <span className="px-2 py-0.5 bg-white/10 rounded-full backdrop-blur-sm">
                                    {item.metadata.img_width} × {item.metadata.img_height}
                                </span>
                            )}
                        </div>

                        <div className="pt-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                className="w-full h-8 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black backdrop-blur-md border border-white/10 transition-all duration-300"
                                onClick={(e) => onDownload(e, item.url, item.id)}
                            >
                                <Download className="w-3 h-3 mr-2" /> Download
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
