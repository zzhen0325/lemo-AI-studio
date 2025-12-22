"use client";

import { useState } from "react";
import CollectionList from "./CollectionList";
import CollectionDetail from "./CollectionDetail";


export interface DatasetCollection {
    id: string;
    name: string;
    imageCount: number;
    previews: string[]; // 2x2 grid previews
}

export default function DatasetManagerView() {
    const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

    const [collections, setCollections] = useState<DatasetCollection[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchCollections = async () => {
        try {
            setIsLoading(true);
            const res = await fetch('/api/dataset');
            if (res.ok) {
                const data = await res.json();
                setCollections(data.collections || []);
            }
        } catch (error) {
            console.error("Failed to fetch collections", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCollections();
    }, []);

    const selectedCollection = collections.find(c => c.id === selectedCollectionId);

    const handleCreateCollection = async (name: string) => {
        // Implementation for creating standard folder or handled via upload
        // For now we just refresh as we might need upload to create it
        fetchCollections();
    };

    return (
        <div className="flex flex-col h-full w-full text-white p-6 overflow-y-auto custom-scrollbar">
            {!selectedCollectionId ? (
                <CollectionList
                    collections={collections}
                    onSelect={setSelectedCollectionId}
                    isLoading={isLoading}
                    onRefresh={fetchCollections}
                />
            ) : (
                <CollectionDetail
                    collection={selectedCollection!}
                    onBack={() => {
                        setSelectedCollectionId(null);
                        fetchCollections(); // Refresh on back to update counts/previews
                    }}
                />
            )}
        </div>
    );
}
