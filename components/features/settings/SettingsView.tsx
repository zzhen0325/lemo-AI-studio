"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Settings as SettingsIcon,
    SquareTerminal,
    ChevronRight,
    Key,
    Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/common/use-toast";
import { SETTINGS_STORAGE_KEY } from "@/lib/constants";
import MappingEditorPage from "@/pages/mapping-editor-page";

enum SettingsTab {
    General = "general",
    MappingEditor = "mapping-editor"
}

export function SettingsView() {
    const [currentTab, setCurrentTab] = useState<SettingsTab>(SettingsTab.General);
    const { toast } = useToast();
    const [apiKey, setApiKey] = useState<string>("");
    const [comfyUrl, setComfyUrl] = useState<string>("");

    useEffect(() => {
        try {
            const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (stored) {
                const s = JSON.parse(stored) as { apiKey?: string; comfyUrl?: string };
                if (s.apiKey) setApiKey(s.apiKey);
                if (s.comfyUrl) setComfyUrl(s.comfyUrl);
            }
        } catch {
            // ignore
        }
    }, []);

    const handleSaveSettings = () => {
        try {
            const payload = { apiKey: apiKey.trim(), comfyUrl: comfyUrl.trim() };
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
            toast({ title: "设置已保存", description: "已保存 Google API Key 与 ComfyUI 地址" });
        } catch (e) {
            toast({ title: "保存失败", description: e instanceof Error ? e.message : "未知错误", variant: "destructive" });
        }
    };

    const sidebarItems = [
        { id: SettingsTab.General, label: "General", icon: SettingsIcon },
        { id: SettingsTab.MappingEditor, label: "Mapping Editor", icon: SquareTerminal },
    ];

    return (
        <div className="flex h-full w-full overflow-hidden bg-transparent">
            {/* Inner Sidebar */}
            <aside className="w-64 border-r border-white/10 flex flex-col p-4 gap-2 bg-black/20 backdrop-blur-sm">
                <div className="px-3 py-2 text-xs font-semibold text-white/30 uppercase tracking-widest mb-2">
                    Configuration
                </div>
                {sidebarItems.map((item) => {
                    const isActive = currentTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setCurrentTab(item.id)}
                            className={cn(
                                "flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all duration-200 group text-sm",
                                isActive
                                    ? "bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                                    : "text-white/50 hover:bg-white/5 hover:text-white/80"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon className={cn("size-4 transition-colors", isActive ? "text-white" : "text-white/30 group-hover:text-white/60")} />
                                <span>{item.label}</span>
                            </div>
                            {isActive && <ChevronRight className="size-3 text-white/30" />}
                        </button>
                    );
                })}
            </aside>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto custom-scrollbar p-8">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentTab}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="h-full"
                    >
                        {currentTab === SettingsTab.General && (
                            <div className="max-w-3xl space-y-8">
                                <div>
                                    <h2 className="text-3xl font-medium text-white mb-2" style={{ fontFamily: 'InstrumentSerif-Regular, sans-serif' }}>General Settings</h2>
                                    <p className="text-white/40 text-sm">Configure your global service connections and storage preferences.</p>
                                </div>

                                <Card className="bg-white/5 border-white/10 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl">
                                    <CardHeader className="border-b border-white/5">
                                        <CardTitle className="text-lg font-medium text-white/90 flex items-center gap-2">
                                            <Key className="size-4 text-blue-400" />
                                            Google API Service
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6 space-y-6">
                                        <div className="space-y-3">
                                            <Label htmlFor="apiKey" className="text-white/60 text-xs font-semibold uppercase tracking-wider">Google API Key</Label>
                                            <Input
                                                id="apiKey"
                                                type="password"
                                                placeholder="Paste your API key here..."
                                                value={apiKey}
                                                onChange={(e) => setApiKey(e.target.value)}
                                                className="bg-white/[0.03] border-white/10 text-white rounded-xl h-12 focus:border-white/20 transition-all"
                                            />
                                            <p className="text-[11px] text-white/20 italic mt-1">
                                                Your API key is stored locally in your browser and never sent to our servers.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-white/5 border-white/10 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl">
                                    <CardHeader className="border-b border-white/5">
                                        <CardTitle className="text-lg font-medium text-white/90 flex items-center gap-2">
                                            <Globe className="size-4 text-purple-400" />
                                            ComfyUI Environment
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6 space-y-6">
                                        <div className="space-y-3">
                                            <Label htmlFor="comfyUrl" className="text-white/60 text-xs font-semibold uppercase tracking-wider">Server Address</Label>
                                            <Input
                                                id="comfyUrl"
                                                type="text"
                                                placeholder="e.g. http://127.0.0.1:8188/"
                                                value={comfyUrl}
                                                onChange={(e) => setComfyUrl(e.target.value)}
                                                className="bg-white/[0.03] border-white/10 text-white rounded-xl h-12 focus:border-white/20 transition-all"
                                            />
                                            <p className="text-[11px] text-white/20 italic mt-1">
                                                The base URL of your running ComfyUI instance for workflow execution.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="flex justify-start">
                                    <Button
                                        onClick={handleSaveSettings}
                                        className="rounded-xl px-8 h-12 bg-white text-black hover:bg-white/90 font-medium transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                                    >
                                        Save Changes
                                    </Button>
                                </div>
                            </div>
                        )}

                        {currentTab === SettingsTab.MappingEditor && (
                            <div className="h-full -mx-8 -my-8 overflow-hidden">
                                <MappingEditorPage />
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
}
