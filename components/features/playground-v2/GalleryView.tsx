import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { cn } from "@/lib/utils";
import { Download, Search, Image as ImageIcon, Type, Box, RefreshCw, X } from "lucide-react";
import ImagePreviewModal from './ImagePreviewModal';
import ImageEditorModal from './ImageEditorModal';
import HistoryList from './HistoryList';
import { TooltipButton } from "@/components/ui/tooltip-button";
import { usePlaygroundStore } from '@/lib/store/playground-store';
import { useToast } from '@/hooks/common/use-toast';
import { useMediaQuery } from '@/hooks/common/use-media-query';
import { GenerationResult } from './types';
import { StyleStacksView } from './StyleStacksView';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Layers } from 'lucide-react';

interface HistoryItem {
    id: string;
    imageUrl: string;
    timestamp: string;
    isLoading?: boolean;
    metadata: {
        prompt?: string;
        base_model?: string;
        img_width: number;
        img_height: number;
        lora?: string;
    } | null;
    type?: 'image' | 'text';
    sourceImage?: string;
}

export type GalleryTab = 'gallery' | 'styles' | 'prompts';

interface GalleryViewProps {
    variant?: 'full' | 'sidebar';
    activeTab?: GalleryTab;
}

export default function GalleryView({ variant = 'full', activeTab }: GalleryViewProps) {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingImageUrl, setEditingImageUrl] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // Internal state for standalone usage
    const [internalActiveView, setInternalActiveView] = useState<GalleryTab>('gallery');

    // Use prop if provided, else internal state
    const activeView = activeTab || internalActiveView;
    const setActiveView = (view: GalleryTab) => setInternalActiveView(view);

    const setUploadedImages = usePlaygroundStore(s => s.setUploadedImages);
    const generationHistory = usePlaygroundStore(s => s.generationHistory);
    const { toast } = useToast();

    // Responsive column count
    const isSm = useMediaQuery("(min-width: 640px)");
    const isMd = useMediaQuery("(min-width: 768px)");
    const isLg = useMediaQuery("(min-width: 1024px)");
    const isXl = useMediaQuery("(min-width: 1280px)");
    const is2Xl = useMediaQuery("(min-width: 1536px)");

    const columnsCount = React.useMemo(() => {
        if (variant === 'sidebar') {
            return isSm ? 2 : 1;
        }
        if (is2Xl) return 6;
        if (isXl) return 5;
        if (isLg) return 4;
        if (isMd) return 3;
        if (isSm) return 2;
        return 1;
    }, [variant, isSm, isMd, isLg, isXl, is2Xl]);

    // Combine local history with active generations from store
    const combinedHistory = React.useMemo(() => {
        // Map GenerationResult to HistoryItem format
        const activeGenerations: HistoryItem[] = generationHistory.map(gen => ({
            id: gen.id,
            imageUrl: gen.imageUrl || '',
            timestamp: gen.timestamp,
            isLoading: gen.isLoading,
            metadata: {
                prompt: gen.prompt || gen.config?.prompt || '',
                base_model: gen.config?.base_model || '',
                img_width: gen.config?.img_width || 1024,
                img_height: gen.config?.image_height || 1024,
                lora: gen.config?.lora || ''
            },
            type: gen.type || 'image',
            sourceImage: gen.sourceImage
        }));

        // Filter out items that are already in the fetched history to avoid duplicates
        // (matching by id or image URL)
        const persistentUrls = new Set(history.map(h => h.imageUrl));
        const uniqueActive = activeGenerations.filter(gen => gen.imageUrl && !persistentUrls.has(gen.imageUrl));

        const combined = [...uniqueActive, ...history];

        // Apply search filter
        const filtered = searchQuery.trim() === ""
            ? combined
            : combined.filter(item =>
                item.metadata?.prompt?.toLowerCase().includes(searchQuery.toLowerCase())
            );

        return filtered.sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    }, [history, generationHistory, searchQuery]);

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
        <div className={cn(
            "w-full h-full bg-transparent overflow-y-auto custom-scrollbar",
            variant === 'full' ? "p-4" : "p-2"
        )}>
            <div className={cn(
                "sticky z-20 pb-6 bg-transparent",
                variant === 'full' ? "top-0" : "top-0"
            )}>
                <div className={cn(
                    "relative group",
                    variant === 'full' ? "" : ""
                )}>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30  group-focus-within:text-white/60 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search prompts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/80  border border-white/10 rounded-xl pl-10 pr-10 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 focus:bg-black/80 transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 text-white/30 hover:text-white/60 transition-all"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* View Switcher Tabs */}
                {variant === 'full' && (
                    <div className="flex items-center gap-2 mt-6 p-1 bg-white/5 border border-white/10 rounded-2xl w-fit">
                        <button
                            onClick={() => setActiveView('gallery')}
                            className={cn(
                                "px-6 py-2 rounded-xl text-sm font-medium transition-all",
                                activeView === 'gallery' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white/60"
                            )}
                        >
                            全部作品
                        </button>
                        <button
                            onClick={() => setActiveView('prompts')}
                            className={cn(
                                "px-6 py-2 rounded-xl text-sm font-medium transition-all",
                                activeView === 'prompts' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white/60"
                            )}
                        >
                            提示词
                        </button>
                        <button
                            onClick={() => setActiveView('styles')}
                            className={cn(
                                "px-6 py-2 rounded-xl text-sm font-medium transition-all",
                                activeView === 'styles' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white/60"
                            )}
                        >
                            Style
                        </button>
                    </div>
                )}
            </div>
            <div className="w-full mx-auto space-y-6">
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

                {loading && combinedHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                            <div className="absolute inset-0 bg-emerald-500/10 blur-xl animate-pulse rounded-full" />
                        </div>
                        <p className="text-white/40 font-medium animate-pulse tracking-wide">Syncing Archive...</p>
                    </div>
                ) : activeView === 'styles' ? (
                    <StyleStacksView />
                ) : activeView === 'prompts' ? (
                    // Display HistoryList for Prompts/Describe mode
                    <HistoryList
                        history={combinedHistory.filter(h => h.type === 'text').map(h => ({
                            ...h,
                            imageUrl: h.imageUrl,
                            config: {
                                prompt: h.metadata?.prompt || '',
                                base_model: h.metadata?.base_model || '',
                                img_width: h.metadata?.img_width || 512,
                                image_height: h.metadata?.img_height || 512,
                                gen_num: 1,
                                lora: h.metadata?.lora
                            }
                        } as GenerationResult))}
                        onRegenerate={() => { }} // Not needed for text cards usually, or passed empty
                        onDownload={() => { }}
                        onImageClick={() => { }}
                        variant="default"
                    />
                ) : combinedHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 bg-white/5 rounded-xl border border-white/10 border-dashed space-y-1">
                        <div className="p-6 bg-white/5 rounded-full">
                            <Search className="w-12 h-12 text-white/20" />
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-white/60 text-xl font-medium">No masterpieces found yet</p>
                            <p className="text-white/30">Your generated images will appear here once you start creating.</p>
                        </div>
                    </div>
                ) : (
                    <MasonryLayout
                        items={combinedHistory.filter(h => h.type !== 'text')}
                        columnsCount={columnsCount}
                        renderItem={(item) => (
                            <GalleryCard
                                item={item}
                                onClick={() => !item.isLoading && setSelectedItem(item)}
                                onDownload={handleDownload}
                            />
                        )}
                    />
                )}
            </div>

            <ImagePreviewModal
                isOpen={!!selectedItem}
                onClose={() => setSelectedItem(null)}
                result={selectedItem ? {
                    id: selectedItem.id,
                    imageUrl: selectedItem.imageUrl,
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

interface MasonryColumn<T> {
    items: T[];
    height: number;
}

function MasonryLayout<T extends HistoryItem>({
    items,
    columnsCount,
    renderItem
}: {
    items: T[],
    columnsCount: number,
    renderItem: (item: T) => React.ReactNode
}) {
    const columns = React.useMemo(() => {
        const cols: MasonryColumn<T>[] = Array.from({ length: columnsCount }, () => ({
            items: [],
            height: 0,
        }));

        items.forEach((item, index) => {
            let targetColIndex = 0;

            // Algorithm: For the first columnsCount items, force 0, 1, 2... allocation to ensure top LTR
            if (index < columnsCount) {
                targetColIndex = index;
            } else {
                // Find shortest column to avoid large gaps
                let minHeight = Infinity;
                cols.forEach((col, idx) => {
                    if (col.height < minHeight) {
                        minHeight = col.height;
                        targetColIndex = idx;
                    }
                });
            }

            cols[targetColIndex].items.push(item);
            // Simulate height based on aspect ratio (fallback to 1 if metadata missing)
            const width = item.metadata?.img_width || 1024;
            const height = item.metadata?.img_height || 1024;
            cols[targetColIndex].height += height / width;
        });

        return cols;
    }, [items, columnsCount]);

    return (
        <div className="flex gap-px w-full">
            {columns.map((column, colIdx) => (
                <div key={colIdx} className="flex-1 flex flex-col gap-px">
                    {column.items.map((item) => (
                        <div key={item.id}>
                            {renderItem(item)}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

function GalleryCard({ item, onClick, onDownload }: { item: HistoryItem, onClick: () => void, onDownload: (e: React.MouseEvent, url: string, filename: string) => void }) {
    const [isHover, setIsHover] = useState(false);
    const applyPrompt = usePlaygroundStore(s => s.applyPrompt);
    const applyModel = usePlaygroundStore(s => s.applyModel);
    const remix = usePlaygroundStore(s => s.remix);
    const applyImage = usePlaygroundStore(s => s.applyImage);
    const styles = usePlaygroundStore(s => s.styles);
    const addImageToStyle = usePlaygroundStore(s => s.addImageToStyle);
    const { toast } = useToast();
    const performDownload = () => {
        const fakeEvent = { stopPropagation: () => void 0 } as unknown as React.MouseEvent;
        onDownload(fakeEvent, item.imageUrl, item.id);
    };

    return (
        <div
            className="group relative bg-black /40 border border-white/5 overflow-hidden  hover:border-white/20 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] cursor-pointer translate-z-0"
            onClick={onClick}
            onMouseEnter={() => setIsHover(true)}
            onMouseLeave={() => setIsHover(false)}
        >
            {/* Image Container */}
            <div className="relative w-full  flex items-center justify-center bg-white/5">
                {item.isLoading ? (
                    <div className="w-full flex flex-col items-center justify-center p-8 space-y-3">
                        <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <span className="text-[10px] text-white/30 font-medium uppercase tracking-widest animate-pulse">Generating</span>
                    </div>
                ) : (
                    <Image
                        src={item.imageUrl}
                        alt="Generated masterwork"
                        width={item.metadata?.img_width || 1024}
                        height={item.metadata?.img_height || 1024}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 25vw, 15vw"
                        quality={75}
                        className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                )}
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
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <div>
                                <TooltipButton
                                    icon={<Layers className="w-4 h-4" />}
                                    label="Add to Style"
                                    tooltipContent="添加到风格"
                                    tooltipSide="top"
                                    className="w-8 h-8 rounded-xl text-white/70 hover:text-white hover:bg-white/10"
                                />
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-black/90 border-white/10 backdrop-blur-2xl rounded-2xl p-2 min-w-[160px]">
                            <DropdownMenuLabel className="text-white/40 text-[10px] uppercase tracking-wider px-2 py-1">选择风格堆叠</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/5" />
                            {styles.length > 0 ? (
                                styles.map(style => (
                                    <DropdownMenuItem
                                        key={style.id}
                                        className="text-white hover:bg-white/10 rounded-xl cursor-pointer"
                                        onClick={() => {
                                            addImageToStyle(style.id, item.imageUrl);
                                            toast({ title: "已添加", description: `已将图片加入风格: ${style.name}` });
                                        }}
                                    >
                                        {style.name}
                                    </DropdownMenuItem>
                                ))
                            ) : (
                                <DropdownMenuItem disabled className="text-white/20 text-xs">
                                    暂无可用风格
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="w-[1px] h-4 bg-white/10 mx-0.5" />
                    <TooltipButton
                        icon={<Type className="w-4 h-4" />}
                        label="Use Prompt"
                        tooltipContent="Use Prompt"
                        tooltipSide="top"
                        className="w-8 h-8 rounded-xl text-white/70 hover:text-white hover:bg-white/10"
                        onClick={() => {
                            if (item.metadata?.prompt) {
                                applyPrompt(item.metadata.prompt);
                                toast({ title: "Prompt Applied", description: "提示词已应用到输入框" });
                            }
                        }}
                    />
                    <TooltipButton
                        icon={<ImageIcon className="w-4 h-4" />}
                        label="Use Image"
                        tooltipContent="Use Image"
                        tooltipSide="top"
                        className="w-8 h-8 rounded-xl text-white/70 hover:text-white hover:bg-white/10"
                        onClick={() => {
                            applyImage(item.imageUrl);
                            toast({ title: "Image Applied", description: "图片已应用为参考图" });
                        }}
                    />
                    <TooltipButton
                        icon={<Box className="w-4 h-4" />}
                        label="Use Model"
                        tooltipContent="Use Model"
                        tooltipSide="top"
                        className="w-8 h-8 rounded-xl text-white/70 hover:text-white hover:bg-white/10"
                        onClick={() => {
                            if (item.metadata?.base_model) {
                                applyModel(item.metadata.base_model);
                                toast({ title: "Model Selected", description: `已切换模型为: ${item.metadata.base_model}` });
                            }
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
                            toast({ title: "Remixing", description: "正在根据此图片重新生成..." });
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
