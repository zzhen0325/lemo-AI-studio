import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Download, Search, Image as ImageIcon, Type, Box, RefreshCw } from "lucide-react";
import ImagePreviewModal from './ImagePreviewModal';
import ImageEditorModal from './ImageEditorModal';
import { TooltipButton } from "@/components/ui/tooltip-button";
import { usePlaygroundStore } from '@/lib/store/playground-store';
import { useToast } from '@/hooks/common/use-toast';
import { GenerationResult } from './types';

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
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingImageUrl, setEditingImageUrl] = useState("");
    const { setUploadedImages } = usePlaygroundStore();
    const { toast } = useToast();

    // actions moved to child component or used directly for clarity

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

    const handleEditImage = (result: GenerationResult) => {
        const url = result.imageUrl || (result.imageUrls && result.imageUrls[0]) || "";
        if (url) {
            setEditingImageUrl(url);
            setIsEditorOpen(true);
            setSelectedItem(null);
        }
    };

    const handleSaveEditedImage = async (dataUrl: string) => {
        try {
            // 1. Convert dataUrl to Blob/File
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            const file = new File([blob], `edited-${Date.now()}.png`, { type: 'image/png' });

            // 2. Upload to server
            const formData = new FormData();
            formData.append('file', file);
            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!uploadRes.ok) throw new Error("Upload failed");
            const { path } = await uploadRes.json();

            // 3. Add to playground state
            const base64Data = dataUrl.split(',')[1];
            setUploadedImages(prev => [
                ...prev,
                { file, base64: base64Data, previewUrl: dataUrl, path }
            ]);

            setIsEditorOpen(false);
            toast({ title: "Image Saved", description: "The edited image has been added to your playground uploads." });
        } catch (error) {
            console.error("Failed to save edited image:", error);
            toast({ title: "Error", description: "Failed to save edited image", variant: "destructive" });
        }
    };

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-transparent p-2">
            <div className="max-w-9xl mx-auto space-y-10 mt-14">
                {/* <header className="flex flex-col md:flex-row md:items-end justify-between gap-1">
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
                </header> */}

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                            <div className="absolute inset-0 bg-emerald-500/10 blur-xl animate-pulse rounded-full" />
                        </div>
                        <p className="text-white/40 font-medium animate-pulse tracking-wide">Syncing Archive...</p>
                    </div>
                ) : history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 bg-white/5 rounded-[10px] border border-white/10 border-dashed space-y-6">
                        <div className="p-6 bg-white/5 rounded-full">
                            <Search className="w-12 h-12 text-white/20" />
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-white/60 text-xl font-medium">No masterpieces found yet</p>
                            <p className="text-white/30">Your generated images will appear here once you start creating.</p>
                        </div>
                    </div>
                ) : (
                    <div className="columns-1 sm:columns-2 lg:columns-4 xl:columns-6 gap-0 rounded-xl overflow-hidden">
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
                result={selectedItem ? {
                    id: selectedItem.id,
                    imageUrl: selectedItem.url,
                    config: {
                        prompt: selectedItem.metadata?.prompt || '',
                        base_model: selectedItem.metadata?.base_model || 'Standard',
                        lora: selectedItem.metadata?.lora || '',
                        img_width: selectedItem.metadata?.img_width || 1200,
                        image_height: selectedItem.metadata?.img_height || 1200,
                        gen_num: 1
                    },
                    timestamp: selectedItem.timestamp
                } : undefined}
                onEdit={handleEditImage}
            />

            <ImageEditorModal
                isOpen={isEditorOpen}
                imageUrl={editingImageUrl}
                onClose={() => setIsEditorOpen(false)}
                onSave={handleSaveEditedImage}
            />
        </div>
    );
}

function GalleryCard({ item, onClick, onDownload }: { item: HistoryItem, onClick: () => void, onDownload: (e: React.MouseEvent, url: string, filename: string) => void }) {
    const [isHover, setIsHover] = useState(false);
    const { applyPrompt, applyModel, remix, applyImage } = usePlaygroundStore();
    const performDownload = () => {
        const fakeEvent = { stopPropagation: () => void 0 } as unknown as React.MouseEvent;
        onDownload(fakeEvent, item.url, item.id);
    };

    return (
        <div
            className="break-inside-avoid group relative bg-black /40 border border-white/5 overflow-hidden  hover:border-white/20 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] cursor-pointer translate-z-0"
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
                {/* 
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
                /> */}


                {/* Floating Actions - consistent with HistoryList */}
                <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1  bg-black/50 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl transition-all duration-50 ${isHover ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'}`} onClick={(e) => e.stopPropagation()}>
                    <TooltipButton
                        icon={<Type className="w-4 h-4" />}
                        label="Use Prompt"
                        tooltipContent="Use Prompt"
                        tooltipSide="top"
                        className="w-8 h-8 rounded-xl text-white/70 hover:text-white hover:bg-white/10"
                        onClick={() => {
                            if (item.metadata?.prompt) applyPrompt(item.metadata.prompt);
                        }}
                    />
                    <TooltipButton
                        icon={<ImageIcon className="w-4 h-4" />}
                        label="Use Image"
                        tooltipContent="Use Image"
                        tooltipSide="top"
                        className="w-8 h-8 rounded-xl text-white/70 hover:text-white hover:bg-white/10"
                        onClick={() => applyImage(item.url)}
                    />
                    <TooltipButton
                        icon={<Box className="w-4 h-4" />}
                        label="Use Model"
                        tooltipContent="Use Model"
                        tooltipSide="top"
                        className="w-8 h-8 rounded-xl text-white/70 hover:text-white hover:bg-white/10"
                        onClick={() => {
                            if (item.metadata?.base_model) applyModel(item.metadata.base_model);
                        }}
                    />
                    <div className="w-[1px] h-4 bg-white/10 mx-0.5" />
                    <TooltipButton
                        icon={<RefreshCw className="w-4 h-4" />}
                        label="Remix"
                        tooltipContent="Recreate"
                        tooltipSide="top"
                        className="w-8 h-8 rounded-xl text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                        onClick={() => {
                            remix({
                                config: {
                                    prompt: item.metadata?.prompt || '',
                                    base_model: item.metadata?.base_model || 'Nano banana',
                                    lora: item.metadata?.lora || '',
                                    img_width: item.metadata?.img_width || 1376,
                                    image_height: item.metadata?.img_height || 768,
                                    gen_num: 1,
                                    image_size: '1K'
                                }
                            });
                        }}
                    />
                    <TooltipButton
                        icon={<Download className="w-4 h-4" />}
                        label="Download"
                        tooltipContent="Download"
                        tooltipSide="top"
                        className="w-8 h-8 rounded-xl text-white/70 hover:text-white hover:bg-white/10"
                        onClick={performDownload}
                    />
                </div>
            </div>
        </div>
    );
}
