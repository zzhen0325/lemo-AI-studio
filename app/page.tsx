"use client"
import { Sidebar, TabValue, TabContext } from "@/components/layout/sidebar";
import { Suspense, useEffect, useState } from "react";
import { PlaygroundV2Page } from "@/pages/playground-v2";
import { MappingEditorPage } from "@/pages/mapping-editor-page";
import { Toaster } from "@/components/ui/toaster";
import type { IViewComfy } from "@/lib/providers/view-comfy-provider";

export default function Page() {
  const [currentTab, setCurrentTab] = useState<TabValue>(TabValue.Playground);
  const [deployWindow, setDeployWindow] = useState<boolean>(false);

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

  return (
    <TabContext.Provider value={{ currentTab, setCurrentTab: handleTabChange, deployWindow, setDeployWindow }}>
      <div className="flex h-screen bg-slate-100">
        <Sidebar currentTab={currentTab} onTabChange={handleTabChange} deployWindow={deployWindow} onDeployWindow={setDeployWindow} />
        <main className="flex-1 overflow-auto" key={currentTab}>
          <div className="relative h-full w-full m-6 overflow-hidden">
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
            {currentTab === TabValue.Settings && null}
          </div>
          <Toaster />
        </main>
      </div>
    </TabContext.Provider>
  );
}
