"use client";

import { useState, useEffect, useCallback } from "react";
import { DatasetCollection } from "./DatasetManagerView";
import { Button } from "@/components/ui/button";
import { AutosizeTextarea } from "@/components/ui/autosize-text-area";
import { Textarea } from "@/components/ui/textarea";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronUp, Download, Scissors, Wand2, Plus, Loader2, Trash2, Save, Languages, ListOrdered, X } from "lucide-react";
import Image from "next/image";
import { ImageZoom } from "@/components/ui/shadcn-io/image-zoom";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import JSZip from "jszip";
import { useToast } from "@/hooks/common/use-toast";

interface CollectionDetailProps {
    collection: DatasetCollection;
    onBack: () => void;
}

interface DatasetImage {
    id: string;
    url: string;
    prompt: string;
    filename: string;
    isOptimizing?: boolean;
    isTranslating?: boolean;
    width?: number;
    height?: number;
}


const ImageSize = ({ src }: { src: string }) => {
    const [size, setSize] = useState<{ w: number, h: number } | null>(null);
    useEffect(() => {
        const img = new window.Image();
        img.src = src;
        img.onload = () => {
            setSize({ w: img.naturalWidth, h: img.naturalHeight });
        };
    }, [src]);

    if (!size) return null;
    return <span className="text-[10px] text-muted-foreground/60 bg-muted/50 px-1.5 py-0.5 rounded-md font-mono">{size.w}x{size.h}</span>;
}




const PROMPT_MODIFIERS = [
    { id: "char_name", label: "角色名", text: "If there is a person/character in the image, they must be referred to as {name}." },
    { id: "exclude_fixed", label: "固定角色特征", text: "Do not include information about the person/character that cannot be changed (e.g., race, gender, etc.), but still include attributes that can be changed (e.g., hairstyle)." },
    { id: "light", label: "光照信息", text: "Include information about lighting." },
    { id: "angle", label: "拍摄角度", text: "Please provide shooting angle information." },
    { id: "comp", label: "构图风格", text: "Include information about the composition style of the image, such as leading lines, the rule of thirds, or symmetry." },
    { id: "no_meta", label: "消除AI对话信息", text: "Your response will be used by text-to-image models, so please avoid using useless meta phrases like \"This image shows...\", \"You are viewing...\", etc." },
];

export default function CollectionDetail({ collection, onBack }: CollectionDetailProps) {
    const [images, setImages] = useState<DatasetImage[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
    const [systemPrompt, setSystemPrompt] = useState("");
    const [isPromptPanelOpen, setIsPromptPanelOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [batchPrefix, setBatchPrefix] = useState("");
    const [cropMode, setCropMode] = useState<'center' | 'longest'>('center');
    const [targetSize, setTargetSize] = useState<string>('512');
    const [isBatchRenameDialogOpen, setIsBatchRenameDialogOpen] = useState(false);
    const [renamePrefix, setRenamePrefix] = useState("");
    const { toast } = useToast();

    const handleDeleteImage = async (img: DatasetImage) => {
        if (!window.confirm("Are you sure you want to delete this image?")) return;

        setIsProcessing(true);
        try {
            const res = await fetch(`/api/dataset?collection=${encodeURIComponent(collection.name)}&filename=${encodeURIComponent(img.filename)}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setImages(prev => prev.filter(i => i.id !== img.id));
                toast({ title: "Deleted", description: "Image and prompt removed." });
            } else {
                throw new Error("Delete failed");
            }
        } catch {
            toast({ title: "Delete failed", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSaveAllData = async () => {
        setIsProcessing(true);
        try {
            // Build map of all current prompts
            const promptsMap: Record<string, string> = {};
            images.forEach(img => {
                promptsMap[img.filename] = img.prompt;
            });

            const res = await fetch('/api/dataset', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    collection: collection.name,
                    prompts: promptsMap,
                    systemPrompt: systemPrompt
                })
            });

            if (!res.ok) throw new Error("Batch save failed");

            setDirtyIds(new Set()); // Clear any dirty tracking
            setIsSystemPromptDirty(false);
            toast({ title: "Save Success", description: "All prompts and config saved." });
        } catch (error) {
            console.error("Save all failed", error);
            toast({ title: "Save Failed", description: "Check network connection.", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const processCrop = async (img: DatasetImage, mode: 'center' | 'longest', sizeStr: string): Promise<DatasetImage> => {
        const image = new window.Image();
        image.src = img.url;
        await new Promise((resolve) => (image.onload = resolve));

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return img;

        const size = sizeStr === 'original' ? (mode === 'center' ? Math.min(image.width, image.height) : Math.max(image.width, image.height)) : parseInt(sizeStr);

        if (mode === 'center') {
            canvas.width = size;
            canvas.height = size;
            const sourceSize = Math.min(image.width, image.height);
            ctx.drawImage(
                image,
                (image.width - sourceSize) / 2, (image.height - sourceSize) / 2, sourceSize, sourceSize,
                0, 0, size, size
            );
        } else {
            const ratio = size / Math.max(image.width, image.height);
            canvas.width = Math.round(image.width * ratio);
            canvas.height = Math.round(image.height * ratio);
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        }

        const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.95));
        const newUrl = URL.createObjectURL(blob);
        return { ...img, url: newUrl };
    };

    const handleBatchCrop = async () => {
        if (images.length === 0) return;
        setIsProcessing(true);
        try {
            const croppedImages = await Promise.all(images.map(img => processCrop(img, cropMode, targetSize)));
            setImages(croppedImages);
            toast({ title: "Crop complete", description: `All images processed (${cropMode === 'center' ? 'Center Crop' : 'Scale'})` });
        } catch (error) {
            console.error("Batch crop failed", error);
            toast({ title: "Crop failed", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };


    const handleExport = async () => {
        if (images.length === 0) return;
        setIsProcessing(true);

        try {
            const zip = new JSZip();

            for (const img of images) {
                const response = await fetch(img.url);
                const blob = await response.blob();
                const baseName = img.filename.replace(/\.[^/.]+$/, "");

                zip.file(img.filename, blob);
                zip.file(`${baseName}.txt`, img.prompt);
            }

            const content = await zip.generateAsync({ type: "blob" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = `${collection.name}.zip`;
            link.click();

            toast({ title: "Export success", description: "Dataset ZIP is ready for download." });
        } catch {
            toast({ title: "Export failed", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const [activeTags, setActiveTags] = useState<string[]>([]);

    const handleAddPrefix = () => {
        if (!batchPrefix.trim()) return;
        const prefix = batchPrefix.trim();

        // Add to active tags if not present
        if (!activeTags.includes(prefix)) {
            setActiveTags([...activeTags, prefix]);
        }

        const newImages = images.map(img => {
            let newPrompt = img.prompt || "";
            // Check if prompt already starts with prefix (ignoring case or exact match? Let's do exact for now but handle comma)
            const regex = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(,\\s*)?`, 'i');
            if (regex.test(newPrompt)) return img; // Already has prefix

            if (newPrompt) {
                newPrompt = `${prefix}, ${newPrompt}`;
            } else {
                newPrompt = prefix;
            }

            // Add to dirty list if changed
            if (newPrompt !== img.prompt) {
                setDirtyIds(prev => new Set(prev).add(img.id));
            }
            return { ...img, prompt: newPrompt };
        });
        setImages(newImages);
        toast({
            title: "Prefix Added",
            description: `Added "${prefix}" to all images.`,
        });
        setBatchPrefix("");
    };

    const handleRemoveTag = (tag: string) => {
        const prefix = tag.trim();
        const newImages = images.map(img => {
            let newPrompt = img.prompt || "";
            // Escape special regex characters in the tag
            const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`^${escapedPrefix}(,\\s*)?`, 'i'); // Match prefix at start, optional comma space

            if (regex.test(newPrompt)) {
                newPrompt = newPrompt.replace(regex, '');
                // Add to dirty list if changed
                setDirtyIds(prev => new Set(prev).add(img.id));
                return { ...img, prompt: newPrompt };
            }
            return img;
        });
        setImages(newImages);
        setActiveTags(prev => prev.filter(t => t !== tag));
        toast({
            title: "Prefix Removed",
            description: `Removed "${prefix}" from matching images.`,
        });
    };
    const fetchImages = useCallback(async () => {
        try {
            setIsProcessing(true);
            const res = await fetch(`/api/dataset?collection=${encodeURIComponent(collection.name)}`);
            if (!res.ok) {
                let errMsg = "Failed to load collection images.";
                try {
                    const data = await res.json();
                    errMsg = data?.error || errMsg;
                } catch {
                    // ignore
                }
                toast({ title: "加载失败", description: errMsg, variant: "destructive" });
                setImages([]);
                return;
            }
            const data = await res.json();
            setImages(data.images || []);
            setSystemPrompt(data.systemPrompt || "");
        } catch (error) {
            console.error("Failed to fetch images", error);
            toast({ title: "加载失败", description: "无法读取数据集图片", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    }, [collection, toast]);

    useEffect(() => {
        fetchImages();
    }, [fetchImages]); // Refresh when fetchImages (or collection) changes

    const processUploadFiles = async (files: File[]) => {
        if (files.length === 0) return;

        setIsProcessing(true);
        let successCount = 0;
        setProgress({ current: 0, total: files.length });

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const formData = new FormData();
                formData.append('file', file);
                formData.append('collection', collection.name);

                const res = await fetch('/api/dataset', {
                    method: 'POST',
                    body: formData
                });

                if (res.ok) successCount++;
                setProgress({ current: i + 1, total: files.length });
            }

            toast({ title: "Upload complete", description: `Uploaded ${successCount}/${files.length} files.` });
            fetchImages();
        } catch (error) {
            console.error('Upload failed', error);
            toast({ title: "Upload failed", variant: "destructive" });
        } finally {
            setIsProcessing(false);
            setProgress(null);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        processUploadFiles(files);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        processUploadFiles(files);
    };

    const handleBatchRename = async () => {
        if (!renamePrefix) {
            toast({ title: "Error", description: "Prefix is required", variant: "destructive" });
            return;
        }

        setIsProcessing(true);
        try {
            // First save any pending prompt changes
            await handleSaveAllData();

            const res = await fetch('/api/dataset', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    collection: collection.name,
                    mode: 'batchRename',
                    prefix: renamePrefix
                })
            });

            if (res.ok) {
                toast({ title: "Success", description: "Batch rename complete." });
                setIsBatchRenameDialogOpen(false);
                fetchImages(); // Refresh to see new filenames
            } else {
                const data = await res.json();
                toast({ title: "Failed", description: data.error || "Rename failed", variant: "destructive" });
            }
        } catch (error) {
            console.error('Batch rename error', error);
            toast({ title: "Error", description: "Internal server error", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
    const [isSystemPromptDirty, setIsSystemPromptDirty] = useState(false);

    const handlePromptChange = (id: string, newPrompt: string) => {
        setImages((prev: DatasetImage[]) => prev.map((img: DatasetImage) => img.id === id ? { ...img, prompt: newPrompt } : img));
        setDirtyIds(prev => new Set(prev).add(id));
    };

    // Unified auto-save with debounce
    useEffect(() => {
        if (dirtyIds.size === 0 && !isSystemPromptDirty) return;

        const timer = setTimeout(async () => {
            const currentDirtyIds = Array.from(dirtyIds);
            const currentSystemPromptDirty = isSystemPromptDirty;

            // Optimistically clear flags before request
            setDirtyIds(new Set());
            setIsSystemPromptDirty(false);

            try {
                const updatePayload: {
                    collection: string;
                    prompts?: Record<string, string>;
                    systemPrompt?: string;
                } = {
                    collection: collection.name
                };

                if (currentDirtyIds.length > 0) {
                    const promptsToUpdate: Record<string, string> = {};
                    currentDirtyIds.forEach(id => {
                        const img = images.find(i => i.id === id);
                        if (img) {
                            promptsToUpdate[img.filename] = img.prompt;
                        }
                    });
                    updatePayload.prompts = promptsToUpdate;
                }

                if (currentSystemPromptDirty) {
                    updatePayload.systemPrompt = systemPrompt;
                }

                const res = await fetch('/api/dataset', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatePayload)
                });

                if (res.ok) {
                    toast({ title: "已同步", description: "更改已自动保存" });
                } else {
                    throw new Error("Save failed");
                }
            } catch (error) {
                console.error("Auto-save failed", error);
                // Re-mark as dirty on failure so it retries or allows manual save
                if (currentDirtyIds.length > 0) {
                    setDirtyIds(prev => new Set([...Array.from(prev), ...currentDirtyIds]));
                }
                if (currentSystemPromptDirty) {
                    setIsSystemPromptDirty(true);
                }
                toast({ title: "同步失败", description: "自动保存暂不可用", variant: "destructive" });
            }
        }, 2000); // Slightly longer debounce for batch efficiency

        return () => clearTimeout(timer);
    }, [dirtyIds, isSystemPromptDirty, collection.name, images, systemPrompt, toast]);

    const handleModifierChange = (modifierText: string, checked: boolean) => {
        let newPrompt = systemPrompt.trim();
        if (checked) {
            if (!newPrompt.includes(modifierText)) {
                newPrompt = newPrompt ? `${newPrompt}\n\n${modifierText}` : modifierText;
            }
        } else {
            // Remove with possible extra newlines
            newPrompt = newPrompt.replace(modifierText, "").replace(/\n\n+/g, "\n\n").trim();
        }
        setSystemPrompt(newPrompt);
        setIsSystemPromptDirty(true);
    };





    const handleOptimizeAll = async () => {
        if (images.length === 0) {
            toast({ title: "No images", description: "This collection is empty." });
            return;
        }
        // Optimize ALL images, effectively regenerating prompts for everything
        const targets = images;
        setIsProcessing(true);
        setProgress({ current: 0, total: targets.length });
        const toastId = toast({ title: "批量优化中...", description: `准备中: 0/${targets.length}` });

        try {
            let success = 0;
            for (let idx = 0; idx < targets.length; idx++) {
                const img = targets[idx];
                toast({
                    id: toastId,
                    title: "批量优化中...",
                    description: `正在处理第 ${idx + 1} 张，共 ${targets.length} 张...`
                });
                try {
                    const response = await fetch(img.url);
                    const blob = await response.blob();
                    const reader = new FileReader();
                    const base64 = await new Promise<string>((resolve) => {
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(blob);
                    });

                    const apiRes = await fetch("/api/google-genai-describe", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            imageBase64: base64,
                            systemPrompt: systemPrompt // Pass system prompt
                        }),
                    });

                    if (apiRes.ok) {
                        const data = await apiRes.json();
                        setImages(prev => prev.map(i => i.id === img.id ? { ...i, prompt: data.text || i.prompt, isOptimizing: false } : i));
                        success++;
                    } else {
                        setImages(prev => prev.map(i => i.id === img.id ? { ...i, isOptimizing: false } : i));
                    }
                } catch {
                    setImages(prev => prev.map(i => i.id === img.id ? { ...i, isOptimizing: false } : i));
                } finally {
                    setProgress({ current: idx + 1, total: targets.length });
                }
            }
            toast({
                id: toastId,
                title: "优化完成",
                description: `成功生成 ${success}/${targets.length} 张图片的提示词。`
            });
        } catch {
            toast({
                id: toastId,
                title: "优化失败",
                variant: "destructive",
                description: "无法连接到 Google GenAI 服务。"
            });
        } finally {
            setIsProcessing(false);
            setProgress(null);
        }
    };

    const handleOptimizePrompt = async (img: DatasetImage) => {
        // Set local loading
        setImages(prev => prev.map(i => i.id === img.id ? { ...i, isOptimizing: true } : i));

        try {
            // Convert URL to Base64
            const response = await fetch(img.url);
            const blob = await response.blob();
            const reader = new FileReader();
            const base64 = await new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });

            const res = await fetch('/api/google-genai-describe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageBase64: base64,
                    systemPrompt: systemPrompt || undefined,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to optimize');
            }

            const data = await res.json();

            // Add batch prefix if exists
            let newPrompt = data.text;
            if (batchPrefix?.trim()) {
                const prefix = batchPrefix.trim();
                if (!newPrompt.toLowerCase().startsWith(prefix.toLowerCase())) {
                    newPrompt = `${prefix}, ${newPrompt}`;
                }
            }

            handlePromptChange(img.id, newPrompt);
            toast({
                title: "Optimized successfully",
                description: "Image prompt has been generated by AI."
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Optimization failed",
                description: error instanceof Error ? error.message : "Unknown error",
                variant: "destructive"
            });
        } finally {
            setImages(prev => prev.map(i => i.id === img.id ? { ...i, isOptimizing: false } : i));
        }
    };

    const handleTranslatePrompt = async (image: DatasetImage, targetLang: 'en' | 'zh' = 'en') => {
        if (!image.prompt) return;

        setImages(prev => prev.map(img =>
            img.id === image.id ? { ...img, isTranslating: true } : img
        ));

        try {
            const response = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: image.prompt,
                    target: targetLang
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Translation failed');
            }

            // Update prompt
            handlePromptChange(image.id, data.translatedText);

            toast({
                title: "Translated successfully",
                description: `The prompt has been translated to ${targetLang === 'zh' ? 'Chinese' : 'English'}.`,
            });
        } catch (error) {
            console.error('Translation error:', error);
            toast({
                title: "Translation failed",
                description: error instanceof Error ? error.message : "Unknown error",
                variant: "destructive",
            });
        } finally {
            setImages(prev => prev.map(img =>
                img.id === image.id ? { ...img, isTranslating: false } : img
            ));
        }
    };

    const handleCropImage = async (img: DatasetImage) => {
        setIsProcessing(true);
        try {
            const updated = await processCrop(img, cropMode, targetSize);
            setImages(prev => prev.map(i => i.id === img.id ? updated : i));
            toast({ title: "Crop complete", description: "Image cropped successfully." });
        } catch {
            toast({ title: "Crop failed", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };


    const handleBatchTranslate = async (targetLang: 'en' | 'zh') => {
        if (images.length === 0) {
            toast({ title: "No images", description: "This collection is empty." });
            return;
        }

        // Filter images that have prompts
        const targets = images.filter(img => img.prompt);
        if (targets.length === 0) {
            toast({ title: "No prompts", description: "No images have prompts to translate." });
            return;
        }

        setIsProcessing(true);
        setProgress({ current: 0, total: targets.length });
        const toastId = toast({ title: "批量翻译中...", description: `准备中: 0/${targets.length}` });

        let successCount = 0;

        try {
            for (let idx = 0; idx < targets.length; idx++) {
                const img = targets[idx];
                toast({
                    id: toastId,
                    title: "批量翻译中...",
                    description: `正在处理第 ${idx + 1} 张，共 ${targets.length} 张...`
                });

                // Set individual translating state (optional, reusing isProcessing primarily)
                setImages(prev => prev.map(i => i.id === img.id ? { ...i, isTranslating: true } : i));

                try {
                    const response = await fetch('/api/translate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            text: img.prompt,
                            target: targetLang
                        }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        handlePromptChange(img.id, data.translatedText);
                        successCount++;
                    }
                } catch (error) {
                    console.error(`Failed to translate image ${img.id}`, error);
                } finally {
                    setImages(prev => prev.map(i => i.id === img.id ? { ...i, isTranslating: false } : i));
                    setProgress({ current: idx + 1, total: targets.length });
                }
            }
            toast({
                id: toastId,
                title: "批量翻译完成",
                description: `成功翻译 ${successCount}/${targets.length} 条提示词。`
            });
        } catch {
            toast({
                id: toastId,
                title: "批量翻译失败",
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
            setProgress(null);
        }
    };

    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState(collection.name);

    // Sync newName if collection prop changes externally
    useEffect(() => {
        setNewName(collection.name);
    }, [collection.name]);

    const handleRenameCollection = async () => {
        if (!newName.trim() || newName === collection.name) {
            setIsEditingName(false);
            setNewName(collection.name);
            return;
        }

        setIsProcessing(true);
        try {
            const res = await fetch('/api/dataset', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    collection: collection.name,
                    newCollectionName: newName.trim()
                })
            });

            if (res.ok) {
                toast({ title: "Renamed", description: "Collection renamed successfully." });
                // We likely need to trigger a parent update or full reload because the URL or selected collection ID might need to change.
                // Since this component is likely controlled by a parent that passed `collection`, and `onBack` exists...
                // Ideally, we should notify the parent. But if the parent lists collections by re-fetching, maybe onBack() is the safest simple route,
                // OR we just force a page reload if we can't update parent state easily from here without a new prop.
                // Assuming simple app structure:
                window.location.reload(); // Simplest way to ensure everything re-syncs if we don't have an onRename prop.
            } else {
                const data = await res.json();
                throw new Error(data.error || "Rename failed");
            }
        } catch (error) {
            toast({
                title: "Rename Failed",
                description: error instanceof Error ? error.message : "Could not rename collection",
                variant: "destructive"
            });
            setNewName(collection.name); // Revert
        } finally {
            setIsProcessing(false);
            setIsEditingName(false);
        }
    };

    return (
        <div
            className="flex flex-col pb-20 space-y-6 relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {isDragging && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-primary/10 backdrop-blur-sm border-4 border-dashed border-primary rounded-2xl animate-in fade-in duration-200 pointer-events-none">
                    <div className="bg-background/80 p-8 rounded-3xl flex flex-col items-center gap-4 shadow-2xl scale-110">
                        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                            <Plus className="w-10 h-10 text-primary animate-bounce" />
                        </div>
                        <span className="text-2xl font-bold text-primary">Drop to Upload</span>
                    </div>
                </div>
            )}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack} className="text-white border   border-white/10 hover:text-primary hover:bg-white/10 h-10 px-4 rounded-lg">
                        <ChevronLeft className="h-6 w-6 " />
                    </Button>

                    <div>
                        <div className="flex items-center gap-2">
                            {isEditingName ? (
                                <Input
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    onBlur={handleRenameCollection}
                                    onKeyDown={(e) => e.key === 'Enter' && handleRenameCollection()}
                                    autoFocus
                                    className="h-8 py-1 text-xl font-bold w-[200px]"
                                />
                            ) : (
                                <h1
                                    className="text-2xl font-bold text-foreground cursor-pointer hover:bg-muted/50 px-2 rounded -ml-2 transition-colors select-none"
                                    onDoubleClick={() => setIsEditingName(true)}
                                    title="Double click to rename"
                                >
                                    {collection.name}
                                </h1>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">{images.length} images with prompts</p>
                    </div>
                </div>

                <div className="flex  items-end gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={isProcessing}
                        onClick={handleSaveAllData}
                        className="text-primary hover:text-primary hover:bg-white/10 h-10 px-4 rounded-lg"
                    >
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save All
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-primary hover:text-primary hover:bg-white/10 h-10 px-4 rounded-lg"
                        onClick={() => setIsPromptPanelOpen(!isPromptPanelOpen)}
                    >
                        AI Settings
                        <Wand2 className="ml-2 h-4 w-4" />
                    </Button>
                    <div className="w-[1px] h-6 bg-border ml-2 mb-2" />
                    <label className="cursor-pointer">

                        <input type="file" multiple accept="image/*,.txt" className="hidden" onChange={handleUpload} />
                    </label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                disabled={isProcessing}
                                className="text-foreground"
                            >
                                <Scissors className="h-4 w-4 " />
                                Crop
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4" align="start">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs">Crop Mode</Label>
                                    <Select value={cropMode} onValueChange={(v: 'center' | 'longest') => setCropMode(v)}>
                                        <SelectTrigger className="w-full h-9 bg-background border-border text-xs">
                                            <SelectValue placeholder="Mode" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="center">Center Crop (1:1)</SelectItem>
                                            <SelectItem value="longest">Scale Longest Side</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs">Target Size</Label>
                                    <Select value={targetSize} onValueChange={setTargetSize}>
                                        <SelectTrigger className="w-full h-9 bg-background border-border text-xs">
                                            <SelectValue placeholder="Size" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="512">512px</SelectItem>
                                            <SelectItem value="768">768px</SelectItem>
                                            <SelectItem value="1024">1024px</SelectItem>
                                            <SelectItem value="2048">2048px</SelectItem>
                                            <SelectItem value="original">Original Size</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button
                                    variant="default"
                                    size="sm"
                                    disabled={isProcessing}
                                    onClick={handleBatchCrop}
                                    className="w-full h-9 text-xs"
                                >
                                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin " /> : <Scissors className="h-4 w-4 " />}
                                    Apply Batch Crop
                                </Button>

                                <Dialog open={isBatchRenameDialogOpen} onOpenChange={setIsBatchRenameDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full h-9 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                                        >
                                            <ListOrdered className="h-4 w-4 mr-2" />
                                            Batch Rename (Files)
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Batch Rename Images</DialogTitle>
                                            <DialogDescription>
                                                All images in this collection will be renamed to <b>prefix_01, prefix_02...</b>
                                                <br />
                                                <span className="text-destructive font-semibold">Important: This operation cannot be easily undone.</span>
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label>File Prefix</Label>
                                                <Input
                                                    placeholder="e.g. character_name_v1"
                                                    value={renamePrefix}
                                                    onChange={(e) => setRenamePrefix(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="ghost" onClick={() => setIsBatchRenameDialogOpen(false)}>Cancel</Button>
                                            <Button
                                                variant="destructive"
                                                onClick={handleBatchRename}
                                                disabled={isProcessing || !renamePrefix}
                                            >
                                                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                                Execute Rename
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Button
                        variant="outline"
                        disabled={isProcessing}
                        onClick={handleOptimizeAll}
                        className="text-foreground"
                    >
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                        Optimize All
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                disabled={isProcessing}
                                className="text-foreground"
                            >
                                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4 " />}
                                Translate All
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleBatchTranslate('en')}>
                                Translate to English
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBatchTranslate('zh')}>
                                Translate to Chinese
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <div className="w-[1px] h-6 bg-border mx-2 mb-2" />
                    <Button
                        variant="outline"
                        disabled={isProcessing}
                        onClick={handleExport}
                        className="text-foreground"
                    >
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 " />}
                        Export
                    </Button>
                </div>
            </div>

            {
                isPromptPanelOpen && (
                    <div className="p-5 bg-card border border-border rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <Wand2 className="h-4 w-4 text-primary" />
                                System prompt for this collection
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => setIsPromptPanelOpen(false)}
                                title="Collapse"
                            >
                                <ChevronUp className="h-4 w-4" />
                            </Button>

                        </div>
                        <AutosizeTextarea
                            value={systemPrompt}
                            onChange={(e) => {
                                setSystemPrompt(e.target.value);
                                setIsSystemPromptDirty(true);
                            }}
                            className="w-full bg-background border-border text-foreground text-sm p-4 focus:border-primary/50 rounded-xl min-h-[80px]"
                            placeholder="What is in this image? Describe the main objects and context."
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pt-2">
                            {PROMPT_MODIFIERS.map(m => (
                                <div key={m.id} className="flex items-start gap-2.5 group cursor-pointer" onClick={() => handleModifierChange(m.text, !systemPrompt.includes(m.text))}>
                                    <Checkbox
                                        id={m.id}
                                        checked={systemPrompt.includes(m.text)}
                                        className="mt-0.5 border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                        onClick={(e) => e.stopPropagation()}
                                        onCheckedChange={(checked) => handleModifierChange(m.text, !!checked)}
                                    />
                                    <Label
                                        htmlFor={m.id}
                                        className="text-[12px] text-muted-foreground group-hover:text-foreground leading-relaxed cursor-pointer transition-colors"

                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {m.label}
                                    </Label>
                                </div>
                            ))}
                        </div>

                        <p className="text-[11px] text-muted-foreground italic">
                            * This prompt will be used for all images in this collection when clicking &quot;Optimize&quot;. Changes are auto-saved.
                        </p>

                        <div className="border-t border-border my-4"></div>


                    </div>
                )
            }

            {/* 批量前缀/触发词 */}

            <h3 className="text-sm font-semibold text-foreground flex items-center">

                Batch Trigger Word
            </h3>
            <div className="flex flex-col gap-3">
                <div className="flex gap-2 flex-wrap min-h-[40px] p-2 border border-border rounded-xl bg-background">
                    {activeTags.map((tag) => (
                        <div key={tag} className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium animate-in fade-in zoom-in-95 duration-200">
                            {tag}
                            <button
                                onClick={() => handleRemoveTag(tag)}
                                className="ml-1 hover:text-red-500 focus:outline-none"
                                title="Remove prefix"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                    <Input
                        value={batchPrefix}
                        onChange={(e) => setBatchPrefix(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddPrefix();
                            }
                        }}
                        className="flex-1 bg-transparent border-none text-foreground text-sm focus-visible:ring-0 px-2 h-7"
                        placeholder={activeTags.length === 0 ? "Type prefix and press Enter..." : ""}
                    />
                </div>
                <Button
                    variant="secondary"
                    onClick={handleAddPrefix}
                    disabled={!batchPrefix.trim()}
                    className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border"
                >
                    <Plus className="h-4 w-4 " />
                    Add Prefix
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
                {isProcessing && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/20 backdrop-blur-[2px] rounded-2xl">
                        <div className="bg-card p-4 rounded-2xl border border-border flex items-center gap-3 shadow-xl">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            <span className="text-sm font-medium text-foreground">
                                {progress ? `Processing... (${progress.current}/${progress.total})` : "Processing..."}
                            </span>
                        </div>
                    </div>
                )}

                {/* Add Image Button as a card */}
                <label className="flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-border bg-card/40 rounded-2xl p-10 hover:border-primary/50 hover:bg-primary/5 transition-all group min-h-[300px]">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/20 transition-all">
                        <Plus className="h-8 w-8 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <span className="mt-4 text-white text-xl font-medium text-muted-foreground group-hover:text-primary transition-colors">Add</span>
                    <p className="mt-2 text-sm text-muted-foreground/70 text-center">Support multiple JPG, PNGfiles</p>
                    <input type="file" multiple accept="image/*,.txt" className="hidden" onChange={handleUpload} />
                </label>

                {/* Image Grid Items */}
                {images.map((img: DatasetImage) => (
                    <div key={img.id} className="flex flex-col sm:flex-row bg-card border border-border rounded-2xl overflow-hidden group hover:border-primary/30 transition-all duration-300">
                        {/* Image Section */}
                        <div className="w-[300px] relative bg-muted/30 min-h-[300px] max-h-[600px] border-b sm:border-b-0 sm:border-r border-border flex items-center justify-center p-4">
                            <div className=" w-full h-full rounded-2xl ">
                                <ImageZoom className="w-full h-full">
                                    <Image
                                        src={img.url}
                                        alt=""
                                        fill
                                        className="object-contain rounded-2xl"
                                        sizes="(max-width: 768px) 100vw, 40vw "
                                    />
                                </ImageZoom>
                            </div>

                            {img.isOptimizing && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            )}


                        </div>

                        {/* Content Section */}
                        <div className="flex-1 p-5 flex flex-col space-y-4 bg-background/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                                    <span className="text-xs font-medium text-muted-foreground tracking-tight truncate max-w-[180px]" title={img.filename}>
                                        {img.filename}
                                    </span>
                                    <ImageSize src={img.url} />
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                        onClick={() => handleOptimizePrompt(img)}
                                        disabled={img.isOptimizing}
                                        title="Optimize with AI"
                                    >
                                        <Wand2 className={`h-4 w-4 ${img.isOptimizing ? 'animate-pulse' : ''}`} />
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                                disabled={img.isTranslating}
                                                title="Translate"
                                            >
                                                <Languages className={`h-4 w-4 ${img.isTranslating ? 'animate-pulse' : ''}`} />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleTranslatePrompt(img, 'en')}>
                                                Translate to English
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleTranslatePrompt(img, 'zh')}>
                                                Translate to Chinese
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                                title="Crop image"
                                            >
                                                <Scissors className="h-4 w-4" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-64 p-4" align="end">
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] uppercase text-muted-foreground font-semibold">Crop Mode</Label>
                                                    <Select value={cropMode} onValueChange={(v: 'center' | 'longest') => setCropMode(v)}>
                                                        <SelectTrigger className="w-full h-8 bg-background border-border text-xs">
                                                            <SelectValue placeholder="Mode" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="center">Center Crop (1:1)</SelectItem>
                                                            <SelectItem value="longest">Scale Longest Side</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-[10px] uppercase text-muted-foreground font-semibold">Target Size</Label>
                                                    <Select value={targetSize} onValueChange={setTargetSize}>
                                                        <SelectTrigger className="w-full h-8 bg-background border-border text-xs">
                                                            <SelectValue placeholder="Size" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="512">512px</SelectItem>
                                                            <SelectItem value="768">768px</SelectItem>
                                                            <SelectItem value="1024">1024px</SelectItem>
                                                            <SelectItem value="2048">2048px</SelectItem>
                                                            <SelectItem value="original">Original Size</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    disabled={isProcessing}
                                                    onClick={() => handleCropImage(img)}
                                                    className="w-full h-8 text-xs"
                                                >
                                                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin " /> : <Scissors className="h-4 w-4 " />}
                                                    Apply Crop
                                                </Button>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDeleteImage(img)}
                                        title="Delete"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <Textarea
                                value={img.prompt}
                                onChange={(e) => handlePromptChange(img.id, e.target.value)}
                                className="w-full placeholder:text-muted-foreground/50 bg-background border-border text-foreground text-sm leading-relaxed p-2 focus:border-primary/50 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none resize-none transition-all duration-200 rounded-xl custom-scrollbar h-[200px]"
                                placeholder="Write image description here..."
                                disabled={img.isOptimizing}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div >
    );
}
