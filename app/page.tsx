"use client"
import { TabValue, TabContext, } from "@/components/layout/sidebar";
import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import GradualBlur from "@/components/common/graphics/GradualBlur";
import { PlaygroundV2Page } from "@/pages/playground-v2";

import type { IViewComfy } from "@/lib/providers/view-comfy-provider";
import GalleryView from "@/components/features/playground-v2/GalleryView";

import DatasetManagerView from "@/components/features/dataset/DatasetManagerView";
import { NewSidebar } from "@/components/layout/NewSidebar";

import { SettingsView } from "@/components/features/settings/SettingsView";

export default function Page() {
  const [currentTab, setCurrentTab] = useState<TabValue>(TabValue.Playground);

  const [deployWindow, setDeployWindow] = useState<boolean>(false);

  // const timelineRef = useRef<gsap.core.Timeline | null>(null);

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
  };

  const handleBackgroundAnimate = () => {
    // Background animation logic removed as we are using Unicorn Studio
  };

  const handleEditMapping = (workflow: IViewComfy) => {
    localStorage.setItem("MAPPING_EDITOR_INITIAL_WORKFLOW", JSON.stringify(workflow));
    handleTabChange(TabValue.MappingEditor);
  };

  /* useEffect(() => {
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
  }, [isBackgroundOut]); */


  return (
    <TabContext.Provider value={{ currentTab, setCurrentTab: handleTabChange, deployWindow, setDeployWindow }}>
      <div className="flex flex-col bg-black h-screen w-screen overflow-hidden text-neutral-200 selection:bg-indigo-500/30">
        <NewSidebar currentTab={currentTab} onTabChange={handleTabChange} />

        <main className="flex-1 relative p-6 pt-16 h-full flex flex-col overflow-hidden">
          <div className="flex-1 bg-transparent border border-white/20 rounded-[2rem] overflow-hidden relative flex flex-col">
            {/* 全局 Ethereal 背景 - 仅在 Playground 初始态显示 */}
            {/* {currentTab === TabValue.Playground && !hasGenerated && ( */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden animate-in fade-in duration-300">
              {/* <EtherealGradient
                className="w-full h-full"
                colors={["#adb2bd", "#908b98", "#edf4ff", "#d7c6de", "#252429"]}
                wireframe={false}
                density={300}
                amplitude={0.5}
                speed={0.11}
                frequency={4.4}
                scaleX={4.2}
                scaleY={1.4}
                camPosX={-0.3854}
                camPosY={2.7979}
                camPosZ={-0.8470}
              /> */}
              <video
                src="/images/1.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              {/* <Image
                src="/images/9.webp"
                alt="Background"
                fill
                className="object-cover"
                style={{ objectPosition: 'center center' }}
              /> */}
              <div className="absolute inset-0 z-[5] shadow-[inset_0_0_150px_rgba(88,131,112,1)] pointer-events-none" />
              <GradualBlur
                preset="bottom"
                height="30%"
                strength={3}
                zIndex={10}
                divCount={2}
              />
              {/* <div className="absolute inset-0 bg-neutral-950/60 z-[1]" /> */}
            </div>
            {/* )} */}

            <div className="relative flex h-full justify-center z-10">

              <div className="relative z-10 flex-1 overflow-hidden ">
                <div className="flex flex-col flex-1 h-full overflow-hidden transition-all duration-500">

                  {/* Playground Tab */}
                  {(currentTab === TabValue.Playground || currentTab === TabValue.ByteArtist) && (
                    <div className="flex flex-col flex-1 h-full overflow-hidden">
                      <Suspense fallback={<div className="flex items-center justify-center h-full text-white">Loading Playground...</div>}>
                        <PlaygroundV2Page
                          onEditMapping={handleEditMapping}
                          onGenerate={handleBackgroundAnimate}
                        />
                      </Suspense>
                    </div>
                  )}

                  {/* Gallery Tab */}
                  {currentTab === TabValue.Gallery && (
                    <div className="flex flex-col flex-1 h-full overflow-hidden animate-in fade-in duration-500">
                      <GalleryView variant="full" />
                    </div>
                  )}

                  {/* Settings Tab */}
                  {currentTab === TabValue.Settings && (
                    <div className="flex flex-col flex-1 h-full overflow-hidden animate-in fade-in duration-500">
                      <SettingsView />
                    </div>
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
