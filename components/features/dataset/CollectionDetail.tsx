"use client";

import { useState } from "react";
import { DatasetCollection } from "./DatasetManagerView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Download, Scissors, Wand2, Plus, MoreVertical, Loader2 } from "lucide-react";
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
    const { toast } = useToast();

    useEffect(() => {
        fetchImages();
    }, [collection]); // Refresh when collection changes

    const fetchImages = async () => {
        try {
            setIsProcessing(true);
            const res = await fetch(`/api/dataset?collection=${encodeURIComponent(collection.name)}`);
            if (res.ok) {
                const data = await res.json();
                setImages(data.images || []);
            }
        } catch (error) {
            console.error("Failed to fetch images", error);
        } finally {
            setIsProcessing(false);
        }
    };

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
        setIsProcessing(true);
        toast({ title: "Optimizing...", description: "Calling Google Vision API for each image." });

        try {
            const updatedImages = await Promise.all(images.map(async (img: DatasetImage) => {
                if (img.prompt) return img; // Skip if already has prompt (optional)

                const response = await fetch(img.url);
                const blob = await response.blob();
                const reader = new FileReader();
                const base64 = await new Promise<string>((resolve) => {
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });

                const apiRes = await fetch("/api/vision-tagging", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ imageBase64: base64 }),
                });

                if (!apiRes.ok) throw new Error("API call failed");
                const data = await apiRes.json();
                return { ...img, prompt: data.prompt };
            }));

            setImages(updatedImages);
            toast({ title: "Success", description: "All images tagged successfully." });
        } catch {
            toast({ title: "Optimization failed", variant: "destructive", description: "Could not connect to Vision API." });
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
                            <span className="text-sm font-medium">Processing...</span>
                        </div>
                    </div>
                )}
                {/* Upload Button Area */}
                <label className="aspect-[4/5] border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-white/20 hover:bg-white/5 transition-all group">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus className="h-6 w-6 text-white/40" />
                    </div>
                    <span className="mt-4 text-sm font-medium text-white/40">Upload Images/TXT</span>
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
                            <Input
                                value={img.prompt}
                                onChange={(e) => handlePromptChange(img.id, e.target.value)}
                                className="bg-white/5 border-white/10 text-xs h-8 rounded-lg focus-visible:ring-primary/50"
                                placeholder="Image prompt..."
                            />
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-[10px] text-white/30 truncate max-w-[120px]">{img.filename}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
