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
            className="fixed left-0 top-0 h-screen z-50 flex flex-col py-6 select-none w-[240px]"
        >
            <div className="px-6 mb-10 flex items-center h-10">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold text-lg">L</span>
                </div>
                <span className="ml-3 text-white font-semibold text-lg whitespace-nowrap">
                    Lemon8 AI
                </span>
            </div>

            <nav className="flex-1 px-3 space-y-1">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.value;

                    return (
                        <button
                            key={item.value}
                            onClick={() => onTabChange(item.value)}
                            className={cn(
                                "w-full flex items-center h-10 ml-6 rounded-xl transition-all relative group",
                                isActive
                                    ? " text-white"
                                    : "text-white/50  hover:text-white"
                            )}
                        >
                            {/* <div className="w-[54px] flex-shrink-0 flex items-center justify-center">
                                <Icon className={cn("size-5 transition-transform", isActive && "scale-110")} />
                            </div> */}

                            <span className="text-sm font-medium whitespace-nowrap">
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </nav>

            <div className="px-6 mt-auto">
                <div className="flex items-center text-white/30 text-xs transition-opacity duration-300">
                    v0.2.0
                </div>
            </div>
        </aside>
    );
}
