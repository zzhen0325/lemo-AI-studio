import { SquareTerminal, Star, History, Palette, Layers, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button"

import { TooltipButton } from "@/components/ui/tooltip-button"
import Link from "next/link";
import { useMediaQuery } from "@/hooks/common/use-media-query"
import { motion } from "framer-motion";
import { useEffect, createContext, useContext, useState } from "react";

export enum TabValue {
    Playground = 'playground',
    Models = 'models',
    API = 'api',
    Documentation = 'documentation',
    Settings = 'settings',
    Help = 'help',
    Account = 'account',
    WorkflowApi = 'workflow_api',
    ByteArtist = 'byte_artist',
    MappingEditor = 'mapping_editor',
    Gallery = 'gallery',
    Tools = 'tools',
    DatasetManager = 'dataset_manager',
    History = 'history'
}

export type TabContextValue = {
    currentTab: TabValue;
    setCurrentTab: (tab: TabValue) => void;
    deployWindow: boolean;
    setDeployWindow: (open: boolean) => void;
};

export const TabContext = createContext<TabContextValue | null>(null);

export function useTabContext(): TabContextValue {
    const ctx = useContext(TabContext);
    if (!ctx) {
        throw new Error('useTabContext must be used within TabContext Provider');
    }
    return ctx;
}

interface SidebarProps {
    currentTab: TabValue;
    onTabChange: (tab: TabValue) => void;
    deployWindow: boolean;
    onDeployWindow: (deployWindow: boolean) => void;
}

const SidebarButton = ({ icon, label, isActive, onClick, isSmallScreen }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void, isSmallScreen: boolean }) => {
    if (isSmallScreen) {
        return (
            <TooltipButton
                icon={icon}
                label={label}
                tooltipContent={label}
                className={isActive ? 'bg-muted' : ''}
                onClick={onClick}
            />
        )
    }
    return (
        <Button
            variant={isActive ? "secondary" : "ghost"}
            className="justify-start"
            onClick={onClick}
        >
            {icon}
            <span className="ml-2">{label}</span>
        </Button>
    )
}

export function Sidebar({ currentTab, onTabChange }: SidebarProps) {
    console.log(process.env.PORT, 'process.env.PORT')
    const viewMode = process.env.PORT === '3000';
    const isSmallScreen = useMediaQuery("(max-width: 1024px)");
    const [collapsed, setCollapsed] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            const v = window.localStorage.getItem('SIDEBAR_COLLAPSED');
            if (v === '1') return true;
            if (v === '0') return false;
        }
        return false;
    });
    const isCondensed = isSmallScreen || collapsed;

    useEffect(() => {
        const topbarHeight = '60px';
        document.documentElement.style.setProperty('--topbar-height', topbarHeight);
    }, [isCondensed]);

    useEffect(() => {
        const v = window.localStorage.getItem('SIDEBAR_COLLAPSED');
        if (v === null) {
            setCollapsed(isSmallScreen);
        }
    }, [isSmallScreen]);

    useEffect(() => {
        window.localStorage.setItem('SIDEBAR_COLLAPSED', collapsed ? '1' : '0');
    }, [collapsed]);

    return (
        <header className="fixed top-0 left-0 right-0 z-50   text-white  bg-white/10 backdrop-blur-md border-b border-white/20 shadow-[0_0_24px_rgba(255,255,255,0.15)]">
            <div className="flex items-center h-14 px-4 gap-3">
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                    <div className="flex items-center ">
                        {!isCondensed && <span className="text-xl font-semibold font-aquebella">Lemon8 AI</span>}
                    </div>
                </motion.div>
                {!isSmallScreen && (
                    <Button variant="ghost" size="icon" className="ml-1" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
                        {collapsed ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}
                    </Button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                    {viewMode ? (
                        <SidebarButton
                            icon={<SquareTerminal className="size-5" />}
                            label="Playground"
                            isActive={currentTab === TabValue.Playground}
                            onClick={() => onTabChange(TabValue.Playground)}
                            isSmallScreen={isCondensed}
                        />
                    ) : (
                        <>
                            <SidebarButton
                                icon={<Layers className="size-5" />}
                                label="Mapping Editor"
                                isActive={currentTab === TabValue.MappingEditor}
                                onClick={() => onTabChange(TabValue.MappingEditor)}
                                isSmallScreen={isCondensed}
                            />
                            <div className="relative">
                                <SidebarButton
                                    icon={<Palette className="size-5" />}
                                    label="Playground 2.0"
                                    isActive={currentTab === TabValue.ByteArtist}
                                    onClick={() => onTabChange(TabValue.ByteArtist)}
                                    isSmallScreen={isCondensed}
                                />
                                <div className="absolute -top-3 -right-1 z-10">
                                    <Image
                                        src="/images/new.svg"
                                        alt="New"
                                        width={20}
                                        height={20}
                                        className="w-16 h-16"
                                    />
                                </div>
                            </div>
                            <SidebarButton
                                icon={<History className="size-5" />}
                                label="history"
                                isActive={currentTab === TabValue.Gallery}
                                onClick={() => onTabChange(TabValue.Gallery)}
                                isSmallScreen={isCondensed}
                            />
                            <SidebarButton
                                icon={<Star className="size-5" />}
                                label="Goodcase"
                                isActive={false}
                                onClick={() => window.open('https://goodcase-v3-383688111435.europe-west1.run.app/', '_blank')}
                                isSmallScreen={isCondensed}
                            />
                            <SidebarButton
                                icon={<Settings className="size-5" />}
                                label="Settings"
                                isActive={currentTab === TabValue.Settings}
                                onClick={() => onTabChange(TabValue.Settings)}
                                isSmallScreen={isCondensed}
                            />
                            <SidebarButton
                                icon={<Layers className="size-5" />}
                                label="Dataset"
                                isActive={currentTab === TabValue.DatasetManager}
                                onClick={() => onTabChange(TabValue.DatasetManager)}
                                isSmallScreen={isCondensed}
                            />
                        </>
                    )}
                    <Link href="https://bytedance.larkoffice.com/wiki/M0hxw9xARiigSTkq2iJcQUrOn3e" target="_blank" rel="noopener noreferrer" className="ml-2">
                        {isSmallScreen ? (
                            <TooltipButton
                                icon={<Image src="/images/logos/lark_logo.png" alt="Lemon8 AI 文档" width={20} height={20} className="size-5" />}
                                label="Lemon8 AI 文档"
                                tooltipContent="Lemon8 AI 文档"
                            />
                        ) : (
                            <Button variant="outline" className="justify-start rounded-2xl">
                                <Image src="/images/logos/lark_logo.png" alt="Lemon8 AI 文档" width={20} height={20} className="size-5 mr-2" />
                                Lemon8 AI 文档
                            </Button>
                        )}
                    </Link>
                </div>
            </div>
        </header>
    )
}
