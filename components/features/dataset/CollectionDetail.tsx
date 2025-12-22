"use client";

import { useState, useEffect, useCallback } from "react";
import { DatasetCollection } from "./DatasetManagerView";
import { Button } from "@/components/ui/button";
import { AutosizeTextarea } from "@/components/ui/autosize-text-area";
import { ChevronLeft, Download, Scissors, Wand2, Plus, MoreVertical, Loader2, Upload, Trash2 } from "lucide-react";
import Image from "next/image";
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
}

export default function CollectionDetail({ collection, onBack }: CollectionDetailProps) {
    const [images, setImages] = useState<DatasetImage[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
    const { toast } = useToast();

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

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setIsProcessing(true);
        let successCount = 0;

        try {
            // Process uploads
            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('collection', collection.name); // Using name as folder name

                // If it's a text file, we might handle it differently or just upload it nearby
                // Our API handles file storage. 
                // For this implementation, we just upload everything.

                const res = await fetch('/api/dataset', {
                    method: 'POST',
                    body: formData
                });

                if (res.ok) successCount++;
            }

            toast({ title: "Upload complete", description: `Uploaded ${successCount}/${files.length} files.` });
            fetchImages(); // Refresh list

        } catch (error) {
            console.error('Upload failed', error);
            toast({ title: "Upload failed", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePromptChange = (id: string, newPrompt: string) => {
        setImages((prev: DatasetImage[]) => prev.map((img: DatasetImage) => img.id === id ? { ...img, prompt: newPrompt } : img));
    };

    const handleOptimizeAll = async () => {
        if (images.length === 0) return;
        const targets = images.filter((img: DatasetImage) => !img.prompt);
        if (targets.length === 0) return;
        setIsProcessing(true);
        setProgress({ current: 0, total: targets.length });
        toast({ title: "Optimizing...", description: "Queueing Google GenAI describe for each image." });

        try {
            let success = 0;
            for (let idx = 0; idx < targets.length; idx++) {
                const img = targets[idx];
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
                        body: JSON.stringify({ imageBase64: base64 }),
                    });

                    if (apiRes.ok) {
                        const data = await apiRes.json();
                        setImages(prev => prev.map(i => i.id === img.id ? { ...i, prompt: data.text || i.prompt } : i));
                        success++;
                    }
                } finally {
                    setProgress({ current: idx + 1, total: targets.length });
                }
            }
            toast({ title: "Success", description: `Described ${success}/${targets.length} images.` });
        } catch {
            toast({ title: "Optimization failed", variant: "destructive", description: "Could not connect to Google GenAI." });
        } finally {
            setIsProcessing(false);
            setProgress(null);
        }
    };

    const handleCropImage = async (img: DatasetImage) => {
        setIsProcessing(true);
        try {
            const image = new window.Image();
            image.src = img.url;
            await new Promise((resolve) => (image.onload = resolve));

            const canvas = document.createElement("canvas");
            const size = Math.min(image.width, image.height);
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");

            ctx?.drawImage(
                image,
                (image.width - size) / 2, (image.height - size) / 2, size, size,
                0, 0, size, size
            );

            const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.95));
            const newUrl = URL.createObjectURL(blob);

            setImages(prev => prev.map(i => i.id === img.id ? { ...i, url: newUrl } : i));
            toast({ title: "Crop complete", description: "Image cropped to 1:1 square." });
        } catch {
            toast({ title: "Crop failed", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleOptimizePrompt = async (img: DatasetImage) => {
        setIsProcessing(true);
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
                body: JSON.stringify({ imageBase64: base64 }),
            });

            if (!apiRes.ok) throw new Error("API call failed");
            const data = await apiRes.json();

            setImages(prev => prev.map(i => i.id === img.id ? { ...i, prompt: data.text || i.prompt } : i));
            toast({ title: "Success", description: "Image described by Google GenAI." });
        } catch {
            toast({ title: "Optimization failed", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

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

    const handleBatchCrop = async () => {
        if (images.length === 0) return;
        setIsProcessing(true);

        try {
            const croppedImages = await Promise.all(images.map(async (img: DatasetImage) => {
                const image = new window.Image();
                image.src = img.url;
                await new Promise((resolve) => (image.onload = resolve));

                const canvas = document.createElement("canvas");
                const size = Math.min(image.width, image.height);
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext("2d");

                // Center crop to 1:1
                ctx?.drawImage(
                    image,
                    (image.width - size) / 2, (image.height - size) / 2, size, size,
                    0, 0, size, size
                );

                const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.95));
                const newUrl = URL.createObjectURL(blob);

                return { ...img, url: newUrl };
            }));

            setImages(croppedImages);
            toast({ title: "Crop complete", description: "All images cropped to 1:1 square." });
        } catch {
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

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/10">
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{collection.name}</h1>
                        <p className="text-sm text-white/40">{images.length} images with prompts</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <label className="cursor-pointer">
                        <Button
                            variant="outline"
                            asChild
                            disabled={isProcessing}
                            className="border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl gap-2 h-10 px-4"
                        >
                            <span>
                                <Upload className="h-4 w-4" />
                                <span>Upload</span>
                            </span>
                        </Button>
                        <input type="file" multiple accept="image/*,.txt" className="hidden" onChange={handleUpload} />
                    </label>
                    <Button
                        variant="outline"
                        disabled={isProcessing}
                        onClick={handleBatchCrop}
                        className="border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl gap-2"
                    >
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scissors className="h-4 w-4" />}
                        Batch Crop
                    </Button>
                    <Button
                        variant="outline"
                        disabled={isProcessing}
                        onClick={handleOptimizeAll}
                        className="border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl gap-2"
                    >
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                        Optimize all prompts
                    </Button>
                    <Button
                        variant="outline"
                        disabled={isProcessing}
                        onClick={handleExport}
                        className="border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl gap-2 text-primary border-primary/20 bg-primary/10"
                    >
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        Export dataset
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 relative">
                {isProcessing && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px] rounded-2xl">
                        <div className="bg-black/80 p-4 rounded-2xl border border-white/10 flex items-center gap-3">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            <span className="text-sm font-medium">
                                {progress ? `Processing... (${progress.current}/${progress.total})` : "Processing..."}
                            </span>
                        </div>
                    </div>
                )}
                {/* Upload Button Area */}
                <label className="aspect-[4/5] border-2 border-dashed border-white/20 bg-white/5 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/20 transition-all">
                        <Plus className="h-6 w-6 text-white/60 group-hover:text-primary" />
                    </div>
                    <span className="mt-4 text-sm font-medium text-white/60 group-hover:text-primary transition-colors">Add to Collection</span>
                    <input type="file" multiple accept="image/*,.txt" className="hidden" onChange={handleUpload} />
                </label>

                {/* Image Grid Items */}
                {images.map((img: DatasetImage) => (
                    <div key={img.id} className="relative aspect-[4/5] bg-black/40 border border-white/10 rounded-2xl overflow-hidden group">
                        <div className="h-2/3 relative">
                            <Image src={img.url} alt="" fill className="object-cover" />
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-black/50">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="h-1/3 p-3 flex flex-col justify-between bg-black/40">
                            <AutosizeTextarea
                                value={img.prompt}
                                onChange={(e) => handlePromptChange(img.id, e.target.value)}
                                className="w-full placeholder:text-white/40 bg-white/5 border-white/10 text-white text-xs leading-relaxed p-2 px-3 focus:border-primary/50 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none resize-none transition-all duration-200 rounded-lg custom-scrollbar"
                                placeholder="Image prompt..."
                                minHeight={40}
                            />
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-[10px] text-white/30 truncate max-w-[80px]">{img.filename}</span>
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-white/30 hover:text-white hover:bg-white/10"
                                        onClick={() => handleOptimizePrompt(img)}
                                    >
                                        <Wand2 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-white/30 hover:text-white hover:bg-white/10"
                                        onClick={() => handleCropImage(img)}
                                    >
                                        <Scissors className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-white/30 hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDeleteImage(img)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
