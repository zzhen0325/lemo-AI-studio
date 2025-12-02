import { SquareTerminal, LifeBuoy, FileJson, Cloud,Star, History, Palette, Layers, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button"
import { Sidebar as UISidebar, SidebarHeader, SidebarContent, SidebarFooter } from "@/components/ui/sidebar"
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
    MappingEditor = 'mapping_editor'
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
            className="w-full justify-start"
            onClick={onClick}
        >
            {icon}
            <span className="ml-2">{label}</span>
        </Button>
    )
}

export function Sidebar({ currentTab, onTabChange, deployWindow, onDeployWindow }: SidebarProps) {
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

    // 设置CSS变量来定义边栏宽度
    useEffect(() => {
        const sidebarWidth = isCondensed ? '48px' : '240px';
        document.documentElement.style.setProperty('--sidebar-width', sidebarWidth);
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
        <UISidebar collapsed={isCondensed} className={`m-6 rounded-3xl !h-[calc(100vh-3rem)]`}>
            <SidebarHeader className={`${isCondensed ? 'justify-center' : ''} h-15`}>
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                    <div className="flex items-center ">
                        <Image src="/images/logos/logo.png" alt="Lemon8 AI" width={36} height={36} className="size-12" />
                        {!isCondensed && <span className="text-xl font-semibold">Lemon8 AI</span>}
                    </div>
                </motion.div>
                {!isSmallScreen && (
                    <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
                        {collapsed ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}
                    </Button>
                )}
            </SidebarHeader>
            <SidebarContent>
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
                       
                        {/* ByteArtist 按钮带角标 */}
                        <div className="relative">
                            <SidebarButton
                                icon={<Palette className="size-5" />}
                                label="Playground 2.0"
                                isActive={currentTab === TabValue.ByteArtist}
                                onClick={() => onTabChange(TabValue.ByteArtist)}
                                isSmallScreen={isCondensed}
                            />
                            {/* NEW 角标 */}
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
                                isActive={false}
                                onClick={() => window.open('http://10.75.163.225:1000/browser/web/index.html', '_blank')}
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
                        {/* <SidebarButton
                            icon={<Cloud className="size-5" />}
                            label="Deploy"
                            isActive={deployWindow === true}
                            onClick={() => onDeployWindow(!deployWindow)}
                            isSmallScreen={isSmallScreen}
                        /> */}
                    </>
                )}
            </SidebarContent>
            <SidebarFooter>
                <Link href="https://bytedance.larkoffice.com/wiki/M0hxw9xARiigSTkq2iJcQUrOn3e" target="_blank" rel="noopener noreferrer">
                    {isSmallScreen ? (
                        <TooltipButton
                            icon={<Image src="/images/logos/lark_logo.png" alt="Lemon8 AI 文档" width={20} height={20} className="size-5" />}
                            label="Lemon8 AI 文档"
                            tooltipContent="Lemon8 AI 文档"
                            
                        />
                    ) : (
                        <Button variant="outline" className="w-full justify-start rounded-3xl">
                            <Image src="/images/logos/lark_logo.png" alt="Lemon8 AI 文档" width={20} height={20} className="size-5 mr-2" />
                            Lemon8 AI 文档
                        </Button>
                    )}
                </Link>
            </SidebarFooter>
        </UISidebar>
    )
}
