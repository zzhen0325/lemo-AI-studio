"use client";

import { DatasetCollection } from "./DatasetManagerView";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreVertical, Loader2, RefreshCw } from "lucide-react";
import Image from "next/image";

interface CollectionListProps {
    collections: DatasetCollection[];
    onSelect: (id: string) => void;
    isLoading?: boolean;
    onRefresh?: () => void;
}

export default function CollectionList({ collections, onSelect, isLoading, onRefresh }: CollectionListProps) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-white/50" />
            </div>
        );
    }
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Datasets</h1>
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={onRefresh} className="text-white/50 hover:text-white">
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    {/* <Button className="bg-white/10 hover:bg-white/20 text-white rounded-xl">
                        Create New Collection
                    </Button> */}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {collections.map((col) => (
                    <Card
                        key={col.id}
                        className="bg-black/40 border-white/10 overflow-hidden hover:border-white/20 transition-all cursor-pointer group"
                        onClick={() => onSelect(col.id)}
                    >
                        <CardContent className="p-0 aspect-square relative">
                            <div className="grid grid-cols-2 grid-rows-2 h-full gap-0.5 bg-white/5">
                                {[0, 1, 2, 3].map((i) => (
                                    <div key={i} className="relative bg-white/5 flex items-center justify-center overflow-hidden">
                                        {col.previews[i] ? (
                                            <Image
                                                src={col.previews[i]}
                                                alt=""
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded bg-white/5 border border-white/10" />
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-black/50" onClick={(e) => e.stopPropagation()}>
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                        <CardFooter className="p-4 flex flex-col items-start bg-black/20">
                            <h3 className="font-semibold text-lg">{col.name}</h3>
                            <p className="text-sm text-white/40">{col.imageCount} images</p>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
