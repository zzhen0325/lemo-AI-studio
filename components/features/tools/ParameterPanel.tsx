"use client";

import React, { useMemo } from 'react';
import { WebGLToolConfig, ToolParameter } from './tool-configs';

interface ParameterPanelProps {
    config: WebGLToolConfig;
    values: Record<string, number | string | boolean>;
    onChange: (id: string, value: number | string | boolean) => void;
}

// --- Aesthetic UI Components ---

const AestheticSlider: React.FC<{ 
    label: string; 
    value: number; 
    min: number; 
    max: number; 
    step: number; 
    onChange: (v: number) => void 
}> = ({ label, value, min, max, step, onChange }) => (
    <div className="space-y-2.5 group">
        <div className="flex items-center justify-between">
            <label className="text-[10px] text-white/30 uppercase font-bold tracking-wider group-hover:text-white/50 transition-colors">
                {label}
            </label>
            <span className="text-[10px] font-mono text-blue-400/80 tabular-nums">
                {Number(value) % 1 === 0 ? value : Number(value).toFixed(2)}
            </span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-4 aesthetic-range"
        />
    </div>
);

const AestheticSwitch: React.FC<{
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}> = ({ label, checked, onChange }) => (
    <div 
        className="flex items-center justify-between group cursor-pointer" 
        onClick={() => onChange(!checked)}
    >
        <span className="text-[11px] text-white/50 group-hover:text-white transition-colors">
            {label}
        </span>
        <div className={`w-8 h-4 rounded-full transition-all duration-300 relative ${checked ? 'bg-blue-600' : 'bg-white/10'}`}>
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
        </div>
    </div>
);

const AestheticColorSlot: React.FC<{
    color: string;
    index: number;
    onChange: (v: string) => void;
}> = ({ color, index, onChange }) => (
    <div className="flex items-center gap-3 group">
        <div className="relative w-full h-10 flex items-center px-4 rounded-xl bg-white/[0.03] border border-white/10 group-hover:border-white/20 transition-all cursor-pointer overflow-hidden">
            <input
                type="color"
                value={color}
                onChange={(e) => onChange(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div 
                className="w-6 h-6 rounded-lg border border-white/20 shadow-lg shrink-0 transition-transform group-hover:scale-110" 
                style={{ backgroundColor: color }} 
            />
            <span className="ml-3 text-[11px] font-mono text-white/60 group-hover:text-white transition-colors tracking-tight uppercase">
                {color}
            </span>
            <span className="ml-auto text-[8px] text-white/10 group-hover:text-white/30 font-bold uppercase tracking-tighter">
                Slot_{index + 1}
            </span>
        </div>
    </div>
);

// --- Main Panel ---

const ParameterPanel: React.FC<ParameterPanelProps> = ({ config, values, onChange }) => {
    
    // Group parameters by category
    const groups = useMemo(() => {
        const grouped: Record<string, ToolParameter[]> = {};
        const defaultGroup = 'Parameters';
        
        config.parameters.forEach(param => {
            const category = param.category || defaultGroup;
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(param);
        });
        
        // Ensure specific order if possible, otherwise alphabetical or insertion order
        // We might want Geometry -> Simulation -> Palette order if they exist
        const order = ['Geometry', 'Simulation', 'Palette', 'Parameters'];
        const sortedKeys = Object.keys(grouped).sort((a, b) => {
            const idxA = order.indexOf(a);
            const idxB = order.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
        });

        return sortedKeys.map(key => ({
            name: key,
            params: grouped[key]
        }));
    }, [config.parameters]);

    return (
        <div className="flex flex-col h-full bg-[#0a0a0c]/85 backdrop-blur-xl border-l border-white/10 select-none font-mono">
             <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
                .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); }
                
                .aesthetic-range { -webkit-appearance: none; background: transparent; }
                .aesthetic-range::-webkit-slider-runnable-track { 
                  width: 100%; height: 2px; cursor: pointer; background: rgba(255,255,255,0.1); border-radius: 1px;
                }
                .aesthetic-range::-webkit-slider-thumb {
                  height: 14px; width: 14px; border-radius: 50%; background: #ffffff;
                  cursor: pointer; -webkit-appearance: none; margin-top: -6px;
                  box-shadow: 0 0 10px rgba(0,0,0,0.5);
                  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .aesthetic-range:active::-webkit-slider-thumb { 
                  transform: scale(1.2);
                  background: #3b82f6;
                  box-shadow: 0 0 20px rgba(59,130,246,0.4);
                }
            `}</style>

            {/* Header */}
            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02] shrink-0">
                <div className="flex flex-col">
                    <h1 className="text-[11px] font-black uppercase tracking-[0.3em] text-white">
                        {config.name}
                    </h1>
                    <span className="text-[8px] text-white/30 uppercase mt-0.5 tracking-widest truncate max-w-[200px]">
                        {config.description}
                    </span>
                </div>
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                {groups.map((group, groupIndex) => (
                    <section key={group.name} className="space-y-4">
                        <div className="flex items-center gap-3">
                            <span className="text-[9px] text-blue-500 font-bold">
                                {String(groupIndex + 1).padStart(2, '0')}
                            </span>
                            <h3 className="text-[10px] uppercase tracking-widest font-bold text-white/40">
                                {group.name}
                            </h3>
                            <div className="h-px flex-1 bg-white/5" />
                        </div>

                        <div className={`space-y-4 px-1 ${group.name === 'Palette' ? 'grid grid-cols-1 gap-2.5 space-y-0' : ''}`}>
                            {group.params.map((param, paramIndex) => (
                                <React.Fragment key={param.id}>
                                    {param.type === 'number' && (
                                        <AestheticSlider
                                            label={param.name}
                                            value={values[param.id] as number}
                                            min={param.min || 0}
                                            max={param.max || 1}
                                            step={param.step || 0.01}
                                            onChange={(val) => onChange(param.id, val)}
                                        />
                                    )}
                                    {param.type === 'boolean' && (
                                        <AestheticSwitch
                                            label={param.name}
                                            checked={values[param.id] as boolean}
                                            onChange={(val) => onChange(param.id, val)}
                                        />
                                    )}
                                    {param.type === 'color' && (
                                        <AestheticColorSlot
                                            color={values[param.id] as string}
                                            index={paramIndex} // Use local index for slot number
                                            onChange={(val) => onChange(param.id, val)}
                                        />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

             {/* Footer - Optional Placeholder */}
             {/* <div className="p-4 border-t border-white/5 shrink-0">
                <button className="w-full py-3.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl text-[10px] uppercase font-black tracking-[0.2em] transition-all active:scale-95 text-white/40 hover:text-white">
                    Reset Settings
                </button>
            </div> */}
        </div>
    );
};

export default ParameterPanel;
