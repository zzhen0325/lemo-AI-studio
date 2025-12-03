"use client"
import { Sidebar, TabValue, TabContext } from "@/components/layout/sidebar";
import { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/common/use-toast";
import { SETTINGS_STORAGE_KEY } from "@/lib/constants";
import { PlaygroundV2Page } from "@/pages/playground-v2";
import { MappingEditorPage } from "@/pages/mapping-editor-page";
import { Toaster } from "@/components/ui/toaster";
import type { IViewComfy } from "@/lib/providers/view-comfy-provider";

export default function Page() {
  const [currentTab, setCurrentTab] = useState<TabValue>(TabValue.Playground);
  const [deployWindow, setDeployWindow] = useState<boolean>(false);
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState<string>("");
  const [comfyUrl, setComfyUrl] = useState<string>("");

  useEffect(() => {
    const parseHash = () => {
      const h = (typeof window !== 'undefined' ? window.location.hash.replace('#','') : '') as TabValue;
      if (h && Object.values(TabValue).includes(h)) {
        setCurrentTab(h);
      }
    };
    parseHash();
    const handler = () => parseHash();
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const handleTabChange = (tab: TabValue) => {
    setCurrentTab(tab);
    if (typeof window !== 'undefined') {
      window.location.hash = tab as string;
    }
  };

  const handleEditMapping = (workflow: IViewComfy) => {
    localStorage.setItem("MAPPING_EDITOR_INITIAL_WORKFLOW", JSON.stringify(workflow));
    handleTabChange(TabValue.MappingEditor);
  };

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

  return (
    <TabContext.Provider value={{ currentTab, setCurrentTab: handleTabChange, deployWindow, setDeployWindow }}>
      <div className="flex h-screen bg-zinc-100">
        <Sidebar currentTab={currentTab} onTabChange={handleTabChange} deployWindow={deployWindow} onDeployWindow={setDeployWindow} />
        <main className="flex-1 overflow-auto" key={currentTab}>
          <div className="relative h-[calc(100%-3rem)] w-auto m-6 border border-zinc-200  bg-white rounded-3xl overflow-hidden">
            {currentTab === TabValue.Playground && (
              <Suspense>
                <PlaygroundV2Page onEditMapping={handleEditMapping} />
              </Suspense>
            )}
            {currentTab === TabValue.ByteArtist && (
              <Suspense>
                <PlaygroundV2Page onEditMapping={handleEditMapping} />
              </Suspense>
            )}
            {currentTab === TabValue.MappingEditor && (
              <MappingEditorPage onNavigate={() => handleTabChange(TabValue.ByteArtist)} />
            )}
            {currentTab === TabValue.WorkflowApi && null}
            {currentTab === TabValue.Settings && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="p-6">
                <Card className="max-w-2xl mx-auto">
                  <CardHeader>
                    <CardTitle>Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="apiKey">Google API Key</Label>
                      <Input id="apiKey" type="password" placeholder="请输入 Google API Key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="bg-black/10 text-white rounded-xl" />
                      <p className="text-xs text-muted-foreground">仅保存在本地浏览器，不会上传服务器。</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="comfyUrl">ComfyUI 地址</Label>
                      <Input id="comfyUrl" type="text" placeholder="例如：http://127.0.0.1:8188/" value={comfyUrl} onChange={(e) => setComfyUrl(e.target.value)} className="bg-black/10 text-white rounded-xl" />
                      <p className="text-xs text-muted-foreground">用于工作流执行的 ComfyUI 服务地址。</p>
                    </div>
                    <div className="pt-2">
                      <Button onClick={handleSaveSettings} className="rounded-xl">保存设置</Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
          <Toaster />
        </main>
      </div>
    </TabContext.Provider>
  );
}
