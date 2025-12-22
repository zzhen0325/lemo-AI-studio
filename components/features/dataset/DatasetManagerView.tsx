"use client";

import { useState, useEffect } from "react";
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

    const handleCreateCollection = async (name: string) => {
        try {
            const formData = new FormData();
            formData.append('collection', name);
            const res = await fetch('/api/dataset', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                fetchCollections();
            } else {
                console.error("Failed to create collection");
            }
        } catch (error) {
            console.error("Create collection error", error);
        }
    };

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



    return (
        <div className="flex flex-col h-full w-full mx-auto text-white p-4 sm:p-6 overflow-hidden ">
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                {!selectedCollectionId ? (
                    <CollectionList
                        collections={collections}
                        onSelect={setSelectedCollectionId}
                        isLoading={isLoading}
                        onRefresh={fetchCollections}
                        onCreate={handleCreateCollection}
                        className="w-full mx-auto"
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
        </div>
    );
}
