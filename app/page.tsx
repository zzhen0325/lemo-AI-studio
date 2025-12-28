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
import MappingEditorPage from "@/pages/mapping-editor-page";
import type { IViewComfy } from "@/lib/providers/view-comfy-provider";
import Image from "next/image";
import GalleryView from "@/components/features/playground-v2/GalleryView";
import ToolsView from "@/components/features/tools/ToolsView";
import DatasetManagerView from "@/components/features/dataset/DatasetManagerView";
import EtherealGradient from "@/components/common/graphics/EtherealGradient";

import { NewSidebar } from "@/components/layout/NewSidebar";

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
  const beamsRef = useRef<HTMLDivElement>(null);
  const [isBackgroundOut, setIsBackgroundOut] = useState(false);
  const [renderBeams, setRenderBeams] = useState(false);
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
    // Ensures state is reset when component is remounted/tab changes
    setIsBackgroundOut(false);
    setRenderBeams(false);
  };

  const handleBackgroundAnimate = (direction: 'in' | 'out') => {
    // Prevent re-triggering 'out' animation if already out
    if (direction === 'out' && isBackgroundOut) return;

    const isOut = direction === 'out';
    setIsBackgroundOut(isOut);

    // 如果已有动画正在运行，先杀掉
    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    const tl = gsap.timeline();
    timelineRef.current = tl;

    const fadeDuration = 0.1;

    if (isOut) {
      setRenderBeams(true);
      // 直接显示，初始位置 y 改为 0
      tl.set(beamsRef.current, { zIndex: 50, opacity: 0, y: '0%' })

        // 核心渐入
        .to(beamsRef.current, {
          opacity: 1,
          duration: fadeDuration,
          ease: "power2.inOut"
        }, 0)

        // 视差背景元素快速消失
        .to([cloudRef.current, treeRef.current, dogRef.current, manRef.current, frontRef.current], {
          opacity: 0,
          duration: fadeDuration,
          ease: "none"
        }, 0)

        // 背景色过渡
        .to(bgRef.current, { backgroundColor: '#0c3562', duration: fadeDuration, ease: 'power2.inOut' }, 0);

    } else {
      // 退出动画
      tl.to(beamsRef.current, {
        opacity: 0,
        duration: fadeDuration,
        ease: "power2.inOut",
        onComplete: () => {
          if (beamsRef.current) gsap.set(beamsRef.current, { zIndex: 0, y: '100%' }); // 恢复位置预备下次（如果需要）
          setRenderBeams(false);
        }
      }, 0)

        // Parallax 恢复
        .to([cloudRef.current, treeRef.current, dogRef.current, manRef.current, frontRef.current], {
          opacity: 1,
          duration: 0.3, // 恢复给一点视觉缓冲
          ease: "power2.out",
        }, 0)
        .to(bgRef.current, { backgroundColor: '#0c3562', duration: 0.3, ease: 'power2.inOut' }, 0);
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

      const duration = 0.1;
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


  return (
    <TabContext.Provider value={{ currentTab, setCurrentTab: handleTabChange, deployWindow, setDeployWindow }}>
      <div className="flex flex-col bg-black h-screen w-screen overflow-hidden text-neutral-200 selection:bg-indigo-500/30">
        <NewSidebar currentTab={currentTab} onTabChange={handleTabChange} />

        <main className="flex-1 relative p-6 pt-16 h-full flex flex-col overflow-hidden">
          <div className="flex-1 bg-black/40 backdrop-blur-sm border border-white/30 rounded-[2rem] overflow-hidden relative flex flex-col">
            <div className="relative flex h-full justify-center z-10">
              {/* 视差动画背景 - Logically render only for Playground/Gallery */}
              {([TabValue.Playground, TabValue.ByteArtist, TabValue.Gallery].includes(currentTab)) ? (
                <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden scale-[1.1]">
                  {/* Beams Background */}
                  <div ref={beamsRef} className="absolute inset-0 z-0 opacity-0 overflow-hidden ">
                    {renderBeams && (
                      <EtherealGradient
                        className="absolute inset-0 size-full"
                        colors={['#5B5B5D', '#B4B1C3', '#BAB9CB', '#000000', '#549291']}
                        wireframe={false}
                        density={205}
                        amplitude={0.05}
                        speed={0.07}
                        frequency={6.10}
                      />
                    )}
                  </div>

                  <div ref={bgRef} className="absolute inset-0 bg-[#142856] -z-10" />

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
              ) : null}

              <div className="relative z-10 flex-1 overflow-hidden ">
                <div className={`flex flex-col flex-1 h-full overflow-hidden transition-all duration-500 ${currentTab === TabValue.Gallery ? 'bg-[#282726]' : 'bg-transparent'}`}>

                  {/* Playground Header (also visible in Gallery to preserve prompt) */}
                  <div className={`flex flex-col flex-1 ${currentTab === TabValue.Gallery ? 'max-h-[240px] mt-4' : 'h-full'} overflow-hidden ${([TabValue.Playground, TabValue.ByteArtist, TabValue.Gallery].includes(currentTab)) ? '' : 'hidden'}`}>
                    <Suspense fallback={<div className="flex items-center justify-center h-full text-white">Loading Playground...</div>}>
                      <PlaygroundV2Page
                        onEditMapping={handleEditMapping}
                        onGenerate={() => handleBackgroundAnimate('out')}
                        backgroundRefs={{
                          cloud: cloudRef,
                          tree: treeRef,
                          dog: dogRef,
                          man: manRef,
                          front: frontRef,
                          bg: bgRef
                        }}
                      />
                    </Suspense>
                  </div>

                  {/* Gallery Tab (rendered under the prompt input when active) */}
                  {currentTab === TabValue.Gallery && (
                    <div className="flex flex-col flex-1 h-full overflow-hidden animate-in fade-in duration-500">
                      <GalleryView />
                    </div>
                  )}

                  {/* Mapping Editor Tab */}
                  {currentTab === TabValue.MappingEditor && (
                    <div className="flex flex-col flex-1 h-full overflow-hidden">
                      <MappingEditorPage onNavigate={() => handleTabChange(TabValue.Playground)} />
                    </div>
                  )}

                  {/* Tools Tab */}
                  {currentTab === TabValue.Tools && (
                    <div className="flex flex-col flex-1 h-full overflow-hidden animate-in fade-in duration-500">
                      <ToolsView />
                    </div>
                  )}

                  {/* Settings Tab */}
                  {currentTab === TabValue.Settings && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="p-6">
                      <Card className="max-w-2xl mx-auto backdrop-blur-xl bg-black/40 border-white/10 shadow-2xl rounded-2xl">
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

                  {/* Dataset Manager Tab */}
                  {currentTab === TabValue.DatasetManager && (
                    <div className="flex flex-col flex-1 h-full w-full overflow-hidden animate-in fade-in duration-500">
                      <DatasetManagerView />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </TabContext.Provider>
  );
}
