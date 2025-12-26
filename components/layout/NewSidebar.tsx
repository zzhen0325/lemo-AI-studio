"use client";

import React from "react";
import {
    SquareTerminal,
    History,
    Palette,
    Layers,
    Settings,
    Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TabValue } from "./sidebar";
import { Toaster } from "sonner";

interface NewSidebarProps {
    currentTab: TabValue;
    onTabChange: (tab: TabValue) => void;
}

const navItems = [
    { label: "Playground", value: TabValue.Playground, icon: Palette },
    { label: "Mapping Editor", value: TabValue.MappingEditor, icon: SquareTerminal },
    { label: "Gallery", value: TabValue.Gallery, icon: History },
    { label: "Tools", value: TabValue.Tools, icon: Wand2 },
    { label: "Dataset", value: TabValue.DatasetManager, icon: Layers },
    { label: "Settings", value: TabValue.Settings, icon: Settings },
];

export function NewSidebar({ currentTab, onTabChange }: NewSidebarProps) {
    return (
        <aside
            className="fixed left-0 top-0 h-screen z-50 flex flex-col mt-6 select-none w-28 "
        >
            <div className="px-6 mb-4 flex items-center h-10">

                <span className="ml-3 text-white font-bold  text-md whitespace-nowrap">
                    LEMO STUDIO
                </span>
            </div>

            <nav className="flex-1 px-3 space-y-1">
                {navItems.map((item) => {
                    const isActive = currentTab === item.value;

                    return (
                        <button
                            key={item.value}
                            onClick={() => onTabChange(item.value)}
                            className={cn(
                                "w-full flex items-center h-10 ml-6  border-b border-white/10 hover:font-bold  transition-all relative group",
                                isActive
                                    ? " text-white "
                                    : "text-white/70  hover:text-white "
                            )}
                        >
                            {/* <div className="w-[54px] flex-shrink-0 flex items-center justify-center">
                                <Icon className={cn("size-5 transition-transform", isActive && "scale-110")} />
                            </div> */}

                            <span className="text-sm whitespace-nowrap">
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </nav>

            <div className="px-6 mt-auto pb-4">
                <div className="flex items-center text-white/30 text-xs mb-2">
                    v0.2.0
                </div>
                <div className="fixed bottom-80 left-4 z-[9999] pointer-events-auto">
                    <Toaster
                        position="bottom-left"
                        toastOptions={{
                            className: "sidebar-toast",
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
                                width: '160px',
                                minWidth: '160px',
                                borderRadius: '12px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                            },
                        }}
                    />
                </div>
            </div>
        </aside>
    );
}
