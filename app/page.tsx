"use client"
import { TabValue, TabContext, } from "@/components/layout/sidebar";
import { Suspense, useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
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
import GalleryView from "@/components/features/playground-v2/GalleryView";


export default function Page() {
  const [currentTab, setCurrentTab] = useState<TabValue>(TabValue.Playground);
  const [deployWindow, setDeployWindow] = useState<boolean>(false);
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState<string>("");
  const [comfyUrl, setComfyUrl] = useState<string>("");

  const cloudRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  const dogRef = useRef<HTMLDivElement>(null);
  const manRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const [isBackgroundOut, setIsBackgroundOut] = useState(false);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const parseHash = () => {
      const h = (typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '') as TabValue;
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
    // 切换 Tab 时如果背景在外面，自动收回
    if (isBackgroundOut) {
      handleBackgroundAnimate('in');
    }
  };

  const handleBackgroundAnimate = (direction: 'in' | 'out') => {
    const isOut = direction === 'out';
    setIsBackgroundOut(isOut);

    // 如果已有动画正在运行，先杀掉
    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    const tl = gsap.timeline();
    timelineRef.current = tl;

    const duration = 1;
    const ease = "back.inOut(1, 0.3)";

    if (isOut) {
      tl.to(cloudRef.current, { y: -400, opacity: 1, duration, ease }, 0)
        .to(treeRef.current, { y: 1200, opacity: 0, duration, ease }, 0.1)
        .to(dogRef.current, { x: 2000, opacity: 1, duration, ease }, 0.05)
        .to(manRef.current, { x: -900, opacity: 1, duration, ease }, 0.15)
        .to(frontRef.current, { y: 400, opacity: 1, duration, ease }, 0.2)
        .to(bgRef.current, { backgroundColor: '#121413', duration: 1.5, ease: 'power2.inOut' }, 0);
    } else {
      tl.to([cloudRef.current, treeRef.current, dogRef.current, manRef.current, frontRef.current], {
        x: 0,
        y: 0,
        opacity: 1,
        duration: 1.5,
        ease: "back.out(1, 0.8)",
        stagger: 0.05
      }, 0)
        .to(bgRef.current, { backgroundColor: '#142856', duration: 1.5, ease: 'power2.inOut' }, 0);
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

      if (isBackgroundOut) return; // 动画在外面或正在执行动画时禁用视差

      const duration = 0.5;
      const ease = "power2.out";

      if (cloudRef.current) gsap.to(cloudRef.current, { x: x * 25, y: y * 25, duration, ease });
      if (treeRef.current) gsap.to(treeRef.current, { x: x * 15, y: y * 15, duration, ease });
      if (dogRef.current) gsap.to(dogRef.current, { x: x * 35, y: y * 35, duration, ease });
      if (manRef.current) gsap.to(manRef.current, { x: x * 40, y: y * 40, duration, ease });
      if (frontRef.current) gsap.to(frontRef.current, { x: x * 50, y: y * 50, duration, ease });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isBackgroundOut]);

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

              <Button variant="outline" className={topbutton} onClick={() => handleTabChange(TabValue.Gallery)}>
                Gallery
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

        {/* 视差动画背景 */}

        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden scale-[1.1]">
          {/* <PixelDistortion /> */}
          <div ref={bgRef} className="absolute inset-0 bg-[#142856]" />

          <div
            ref={cloudRef}
            className="absolute flex h-[739.543px] items-center justify-center left-[853.01px] top-[31.43px] w-[1189.462px]"
          >
            <div className="flex-none rotate-[346.65deg]">
              <div className="h-[498.023px] relative w-[1104.312px]">
                <Image alt="" src="/images/parallax/cloud.png" fill priority className="absolute inset-0 max-w-none object-cover size-full" />
              </div>
            </div>
          </div>
          <div
            ref={treeRef}
            className="absolute bottom-0  h-full w-full"
          >
            <Image alt="" src="/images/parallax/tree.png" fill priority className="absolute inset-0 max-w-none object-cover size-full" />
          </div>
          <div
            ref={dogRef}
            className="absolute flex h-[248.291px] items-center justify-center left-[821.49px] top-[723.27px] w-[216.026px]"
          >
            <div className="flex-none rotate-[355.014deg]">
              <div className="h-[232.084px] relative w-[196.601px]">
                <Image alt="" src="/images/parallax/dog.png" fill className="absolute inset-0 max-w-none object-cover size-full" />
              </div>
            </div>
          </div>
          <div
            ref={manRef}
            className="absolute h-[324.406px] left-[676.57px] top-[569.17px] w-[83.815px]"
          >
            <Image alt="" src="/images/parallax/man.png" fill className="absolute inset-0 max-w-none object-cover size-full" />
          </div>
          <div
            ref={frontRef}
            className="absolute h-[500px] left-[7.22px] top-[606.53px] w-[1600px]"
          >
            <Image alt="" src="/images/parallax/front.png" fill className="absolute inset-0 max-w-none object-cover size-full" />
          </div>
        </div>



        <main className="relative z-10 flex-1 overflow-auto" key={currentTab}>
          <div className={`flex flex-col flex-1 h-screen overflow-hidden transition-all duration-500 ${currentTab === TabValue.Gallery ? 'bg-[#050505]' : 'bg-transparent'}`}>

            {/* Gallery Tab */}
            {currentTab === TabValue.Gallery && (
              <div className="flex flex-col flex-1 h-screen overflow-hidden animate-in fade-in duration-500">
                <GalleryView />
              </div>
            )}

            {/* Playground Tabs (Hidden logic to preserve state) */}
            <div className={`flex flex-col flex-1 h-screen overflow-hidden ${(currentTab !== TabValue.Playground && currentTab !== TabValue.ByteArtist) ? 'hidden' : ''
              }`}>
              <Suspense fallback={<div className="flex items-center justify-center h-full text-white">Loading Playground...</div>}>
                <PlaygroundV2Page
                  onEditMapping={handleEditMapping}
                  onGenerate={() => handleBackgroundAnimate('out')}
                />
              </Suspense>
            </div>

            {/* Mapping Editor Tab */}
            {currentTab === TabValue.MappingEditor && (
              <div className="flex flex-col flex-1 h-screen overflow-hidden">
                <MappingEditorPage onNavigate={() => handleTabChange(TabValue.Playground)} />
              </div>
            )}

            {/* Settings Tab */}
            {currentTab === TabValue.Settings && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="p-6">
                <Card className="max-w-2xl mx-auto backdrop-blur-xl bg-black/40 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="apiKey" className="text-white/70">Google API Key</Label>
                      <Input id="apiKey" type="password" placeholder="请输入 Google API Key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="bg-white/5 border-white/10 text-white rounded-xl" />
                      <p className="text-xs text-white/30">仅保存在本地浏览器，不会上传服务器。</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="comfyUrl" className="text-white/70">ComfyUI 地址</Label>
                      <Input id="comfyUrl" type="text" placeholder="例如：http://127.0.0.1:8188/" value={comfyUrl} onChange={(e) => setComfyUrl(e.target.value)} className="bg-white/5 border-white/10 text-white rounded-xl" />
                      <p className="text-xs text-white/30">用于工作流执行的 ComfyUI 服务地址。</p>
                    </div>
                    <div className="pt-2">
                      <Button onClick={handleSaveSettings} className="rounded-xl bg-white/10 hover:bg-white/20 text-white">保存设置</Button>
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
