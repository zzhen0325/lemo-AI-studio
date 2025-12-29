"use client";

import React from "react";
import {
    History,
    Palette,
    Layers,
    Settings,
    Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TabValue } from "./sidebar";
import { Toaster } from "sonner";
import SplitText from "../ui/split-text";
import { usePlaygroundStore } from "@/lib/store/playground-store";

interface NewSidebarProps {
    currentTab: TabValue;
    onTabChange: (tab: TabValue) => void;
}

const navItems = [
    { label: "Playground", value: TabValue.Playground, icon: Palette },
    { label: "Gallery", value: TabValue.Gallery, icon: History },
    { label: "Tools", value: TabValue.Tools, icon: Wand2 },
    { label: "Dataset", value: TabValue.DatasetManager, icon: Layers },
    { label: "Settings", value: TabValue.Settings, icon: Settings },
];

export function NewSidebar({ currentTab, onTabChange }: NewSidebarProps) {
    const setHasGenerated = usePlaygroundStore(s => s.setHasGenerated);
    return (
        <header
            className="fixed top-0 left-0 right-0 h-14 z-50 flex items-center justify-between px-8 select-none bg-black/20 backdrop-blur-xl"
        >
            <div
                className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => {
                    onTabChange(TabValue.Playground);
                    setHasGenerated(false);
                }}
            >
                <span className="text-white font-bold text-lg ">
                    LEMO STUDIO
                </span>
            </div>

            <nav className="flex items-center space-x-1">
                {navItems.map((item) => {
                    const isActive = currentTab === item.value;

                    return (
                        <button
                            key={item.value}
                            onClick={() => {
                                onTabChange(item.value);
                                if (item.value === TabValue.Playground) {
                                    setHasGenerated(true);
                                }
                            }}
                            className={cn(
                                "px-4 h-10 flex items-center transition-all relative group text-sm whitespace-nowrap",
                                isActive
                                    ? "text-white font-medium"
                                    : "text-white/60 hover:text-white"
                            )}
                        >
                            <SplitText
                                text={item.label}
                                className="text-sm"
                                delay={30}
                                duration={0.5}
                                animateOnHover={true}
                                tag="span"
                            />
                            {isActive && (
                                <span className="absolute bottom-1 left-4 right-4 h-[1px] bg-white/20 rounded-full" />
                            )}
                        </button>
                    );
                })}
            </nav>

            <div className="flex items-center gap-4">
                <div className="text-white/20 text-[10px] tracking-tight">
                    v0.2.0
                </div>
                <div className="fixed bottom-10 right-4 z-[9999] pointer-events-auto">
                    <Toaster
                        position="bottom-right"
                        toastOptions={{
                            className: "navbar-toast",
                            classNames: {
                                description: "text-white",
                                title: "text-white font-medium"
                            },
                            style: {
                                background: 'linear-gradient(to bottom, rgba(18, 24, 45, 0.95), rgba(29, 36, 70, 0.95)) padding-box, linear-gradient(135deg, rgba(22, 38, 149, 0.3), rgba(58, 94, 251, 0.3)) border-box',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255, 255, 255, 0.31)',
                                color: '#fff',
                                fontSize: '11px',
                                width: '220px',
                                borderRadius: '12px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                            },
                        }}
                    />
                </div>
            </div>
        </header>
    );
}
