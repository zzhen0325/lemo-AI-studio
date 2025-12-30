"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Settings as SettingsIcon,
    SquareTerminal,
    ChevronRight,
    Key,
    Globe,
    Languages,
    Sparkles
} from "lucide-react";
import { REGISTRY } from "@/lib/ai/registry";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    const [deepseekApiKey, setDeepseekApiKey] = useState<string>("");
    const [doubaoApiKey, setDoubaoApiKey] = useState<string>("");
    const [doubaoModel, setDoubaoModel] = useState<string>("");
    const [comfyUrl, setComfyUrl] = useState<string>("");
    const [describeModel, setDescribeModel] = useState<string>("gemini-1.5-flash");
    const [translateModel, setTranslateModel] = useState<string>("doubao-pro-4k");
    const [optimizeModel, setOptimizeModel] = useState<string>("doubao-pro-4k");

    useEffect(() => {
        try {
            const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (stored) {
                const s = JSON.parse(stored);
                if (s.apiKey) setApiKey(s.apiKey);
                if (s.deepseekApiKey) setDeepseekApiKey(s.deepseekApiKey);
                if (s.doubaoApiKey) setDoubaoApiKey(s.doubaoApiKey);
                if (s.doubaoModel) setDoubaoModel(s.doubaoModel);
                if (s.comfyUrl) setComfyUrl(s.comfyUrl);
                if (s.describeModel) setDescribeModel(s.describeModel);
                if (s.translateModel) setTranslateModel(s.translateModel);
                if (s.optimizeModel) setOptimizeModel(s.optimizeModel);
            }
        } catch {
            // ignore
        }
    }, []);

    const handleSaveSettings = () => {
        try {
            const payload = {
                apiKey: apiKey.trim(),
                deepseekApiKey: deepseekApiKey.trim(),
                doubaoApiKey: doubaoApiKey.trim(),
                doubaoModel: doubaoModel.trim(),
                comfyUrl: comfyUrl.trim(),
                describeModel,
                translateModel,
                optimizeModel
            };
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
            toast({ title: "设置已保存", description: "已保存所有 API 配置与偏好" });
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
                                            API Credentials
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6 space-y-6">
                                        <div className="space-y-3">
                                            <Label htmlFor="apiKey" className="text-white/60 text-xs font-semibold uppercase tracking-wider">Google API Key</Label>
                                            <Input
                                                id="apiKey"
                                                type="password"
                                                placeholder="AIzaSy..."
                                                value={apiKey}
                                                onChange={(e) => setApiKey(e.target.value)}
                                                className="bg-white/[0.03] border-white/10 text-white rounded-xl h-12 focus:border-white/20 transition-all"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <Label htmlFor="deepseekApiKey" className="text-white/60 text-xs font-semibold uppercase tracking-wider">DeepSeek API Key</Label>
                                            <Input
                                                id="deepseekApiKey"
                                                type="password"
                                                placeholder="sk-..."
                                                value={deepseekApiKey}
                                                onChange={(e) => setDeepseekApiKey(e.target.value)}
                                                className="bg-white/[0.03] border-white/10 text-white rounded-xl h-12 focus:border-white/20 transition-all"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-3">
                                                <Label htmlFor="doubaoApiKey" className="text-white/60 text-xs font-semibold uppercase tracking-wider">Doubao API Key</Label>
                                                <Input
                                                    id="doubaoApiKey"
                                                    type="password"
                                                    placeholder="Volcengine API Key"
                                                    value={doubaoApiKey}
                                                    onChange={(e) => setDoubaoApiKey(e.target.value)}
                                                    className="bg-white/[0.03] border-white/10 text-white rounded-xl h-12 focus:border-white/20 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <Label htmlFor="doubaoModel" className="text-white/60 text-xs font-semibold uppercase tracking-wider">Doubao Model/Endpoint ID</Label>
                                                <Input
                                                    id="doubaoModel"
                                                    type="text"
                                                    placeholder="ep-2024..."
                                                    value={doubaoModel}
                                                    onChange={(e) => setDoubaoModel(e.target.value)}
                                                    className="bg-white/[0.03] border-white/10 text-white rounded-xl h-12 focus:border-white/20 transition-all"
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-white/5 border-white/10 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl">
                                    <CardHeader className="border-b border-white/5">
                                        <CardTitle className="text-lg font-medium text-white/90 flex items-center gap-2">
                                            <SettingsIcon className="size-4 text-green-400" />
                                            Service Preferences
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <Label className="text-white/60 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                                                    <SettingsIcon className="size-3" />
                                                    Image Description Provider
                                                </Label>
                                                <Select value={describeModel} onValueChange={setDescribeModel}>
                                                    <SelectTrigger className="bg-white/[0.03] border-white/10 text-white rounded-xl h-12">
                                                        <SelectValue placeholder="Select Model" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                                        {REGISTRY.filter(m => m.task.includes('vision')).map(model => (
                                                            <SelectItem key={model.id} value={model.id}>
                                                                {model.id}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-3">
                                                <Label className="text-white/60 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                                                    <Languages className="size-3" />
                                                    Translation Provider
                                                </Label>
                                                <Select value={translateModel} onValueChange={setTranslateModel}>
                                                    <SelectTrigger className="bg-white/[0.03] border-white/10 text-white rounded-xl h-12">
                                                        <SelectValue placeholder="Select Model" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                                        {REGISTRY.filter(m => m.task.includes('text')).map(model => (
                                                            <SelectItem key={model.id} value={model.id}>
                                                                {model.id}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-3">
                                                <Label className="text-white/60 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                                                    <Sparkles className="size-3" />
                                                    Prompt Optimization Provider
                                                </Label>
                                                <Select value={optimizeModel} onValueChange={setOptimizeModel}>
                                                    <SelectTrigger className="bg-white/[0.03] border-white/10 text-white rounded-xl h-12">
                                                        <SelectValue placeholder="Select Model" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                                        {REGISTRY.filter(m => m.task.includes('text')).map(model => (
                                                            <SelectItem key={model.id} value={model.id}>
                                                                {model.id}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-3">
                                                <Label htmlFor="comfyUrl" className="text-white/60 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                                                    <Globe className="size-3" />
                                                    ComfyUI Server Address
                                                </Label>
                                                <Input
                                                    id="comfyUrl"
                                                    type="text"
                                                    placeholder="e.g. http://127.0.0.1:8188/"
                                                    value={comfyUrl}
                                                    onChange={(e) => setComfyUrl(e.target.value)}
                                                    className="bg-white/[0.03] border-white/10 text-white rounded-xl h-12 focus:border-white/20 transition-all"
                                                />
                                            </div>
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
