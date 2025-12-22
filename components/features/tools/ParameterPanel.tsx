"use client";

import React from 'react';
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { WebGLToolConfig } from './tool-configs';

interface ParameterPanelProps {
    config: WebGLToolConfig;
    values: Record<string, number | string | boolean>;
    onChange: (id: string, value: number | string | boolean) => void;
}

const ParameterPanel: React.FC<ParameterPanelProps> = ({ config, values, onChange }) => {
    return (
        <div className="space-y-6 p-4">
            <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white">{config.name}</h3>
                <p className="text-sm text-white/60">{config.description}</p>
            </div>

            <div className="space-y-8">
                {config.parameters.map((param) => (
                    <div key={param.id} className="space-y-3">
                        <div className="flex justify-between">
                            <Label className="text-white/80">{param.name}</Label>
                            <span className="text-xs text-white/40">{values[param.id]}</span>
                        </div>

                        {param.type === 'number' && (
                            <Slider
                                value={[values[param.id] as number]}
                                min={param.min || 0}
                                max={param.max || 1}
                                step={param.step || 0.01}
                                onValueChange={(val) => onChange(param.id, val[0])}
                                className="py-2"
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ParameterPanel;
