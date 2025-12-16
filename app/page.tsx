"use client"
import {  TabValue, TabContext,  } from "@/components/layout/sidebar";
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
import Image from "next/image";
import Link from "next/link";

export default function Page() {
  const [currentTab, setCurrentTab] = useState<TabValue>(TabValue.Playground);
  const [deployWindow, setDeployWindow] = useState<boolean>(false);
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState<string>("");
  const [comfyUrl, setComfyUrl] = useState<string>("");
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

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

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setMousePosition({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const getParallaxOffset = (depth: number) => ({
    x: mousePosition.x * depth,
    y: mousePosition.y * depth,
  });

  const cloudOffset = getParallaxOffset(25);
  const treeOffset = getParallaxOffset(15);
  const dogOffset = getParallaxOffset(35);
  const manOffset = getParallaxOffset(40);
  const frontOffset = getParallaxOffset(50);

  const handleSaveSettings = () => {
    try {
      const payload = { apiKey: apiKey.trim(), comfyUrl: comfyUrl.trim() };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
      toast({ title: "设置已保存", description: "已保存 Google API Key 与 ComfyUI 地址" });
    } catch (e) {
      toast({ title: "保存失败", description: e instanceof Error ? e.message : "未知错误", variant: "destructive" });
    }
  };
 
const topbutton = "w-auto text-white text-md border-none rounded-2xl font-[InstrumentSerif-Regular,serif] bg-transparent hover:bg-white/10 hover:text-white"; 
  return (
    <TabContext.Provider value={{ currentTab, setCurrentTab: handleTabChange, deployWindow, setDeployWindow }}>
      <div className="relative flex h-screen justify-center">
        <header className="fixed w-[70vw]  mt-8 rounded-3xl px-4 mx-auto z-50 text-white bg-black/30 backdrop-blur-md border border-white/10">
          <div className="flex items-center h-14 px-4 gap-3">
            
            <div className="flex-1 flex items-center justify-start">
              <h1 className="text-[1.5rem] text-white text-center" style={{ fontFamily: 'InstrumentSerif-Regular, sans-serif' }}>Lemon8 AI Studio</h1>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="outline" className={topbutton} onClick={() => handleTabChange(TabValue.Playground)}>
                Playground
              </Button>
              <Button variant="outline" className={topbutton} onClick={() => handleTabChange(TabValue.MappingEditor)}>
                Mapping Editor
              </Button>
            
              <Button variant="outline" className={topbutton} onClick={() => window.open('http://10.75.163.225:1000/browser/web/index.html', '_blank')}>
                history
              </Button>
              <Button variant="outline" className={topbutton} onClick={() => window.open('https://goodcase-v3-383688111435.europe-west1.run.app/', '_blank')}>
                Goodcase
              </Button>
              <Button variant="outline" className={topbutton} onClick={() => handleTabChange(TabValue.Settings)}>
                Settings
              </Button>
              <Link href="https://bytedance.larkoffice.com/wiki/M0hxw9xARiigSTkq2iJcQUrOn3e" target="_blank" rel="noopener noreferrer" className="ml-2">
                <Button variant="outline" className={topbutton}>
                 
                  Lemon8 AI 文档
                </Button>
              </Link>
            </div>
          </div>
        </header>
       
        <div className="absolute inset-0 z-0 w-[100vw] h-[100vh] pointer-events-none overflow-hidden scale-[1.1]">
           
          <div className="absolute   inset-0  bg-[#142856]" />
          
          <motion.div
            className="absolute flex h-[739.543px] items-center justify-center left-[853.01px] top-[31.43px] w-[1189.462px]"
            animate={{ x: cloudOffset.x, y: cloudOffset.y }}
            transition={{ type: "spring", stiffness: 150, damping: 20, mass: 0.5 }}
          >
            <div className="flex-none rotate-[346.65deg]">
              <div className="h-[498.023px] relative w-[1104.312px]">
                <Image alt="" src="/images/parallax/cloud.png" fill priority className="absolute inset-0 max-w-none object-cover size-full" />
              </div>
            </div>
          </motion.div>
          <motion.div
            className="absolute bottom-0  h-full w-full"
            animate={{ x: treeOffset.x, y: treeOffset.y }}
            transition={{ type: "spring", stiffness: 150, damping: 20, mass: 0.5 }}
          >
            <Image alt="" src="/images/parallax/tree.png" fill priority className="absolute inset-0 max-w-none object-cover size-full" />
          </motion.div>
          <motion.div
            className="absolute flex h-[248.291px] items-center justify-center left-[821.49px] top-[723.27px] w-[216.026px]"
            animate={{ x: dogOffset.x, y: dogOffset.y }}
            transition={{ type: "spring", stiffness: 150, damping: 20, mass: 0.5 }}
          >
            <div className="flex-none rotate-[355.014deg]">
              <div className="h-[232.084px] relative w-[196.601px]">
                <Image alt="" src="/images/parallax/dog.png" fill className="absolute inset-0 max-w-none object-cover size-full" />
              </div>
            </div>
          </motion.div>
          <motion.div
            className="absolute h-[324.406px] left-[676.57px] top-[569.17px] w-[83.815px]"
            animate={{ x: manOffset.x, y: manOffset.y }}
            transition={{ type: "spring", stiffness: 150, damping: 20, mass: 0.5 }}
          >
            <Image alt="" src="/images/parallax/man.png" fill className="absolute inset-0 max-w-none object-cover size-full" />
          </motion.div>
          <motion.div
            className="absolute h-[500px] left-[7.22px] top-[606.53px] w-[1600px]"
            animate={{ x: frontOffset.x, y: frontOffset.y }}
            transition={{ type: "spring", stiffness: 150, damping: 20, mass: 0.5 }}
          >
            <Image alt="" src="/images/parallax/front.png" fill className="absolute inset-0 max-w-none object-cover size-full" />
          </motion.div>
        </div>
      
       
        
        <main className="relative z-10 flex-1 overflow-auto" key={currentTab}>
          {/* pt-[var(--topbar-height)] */}
          <div className="relative  w-auto     overflow-hidden"> 
            {/* mx-[20rem] my-[6rem] rounded-[8rem] */}
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
