import React from 'react';
import EtherealGradient from '@/components/common/graphics/EtherealGradient';

interface EtherealToolAdapterProps {
    wireframe?: boolean;
    density?: number;
    amplitude?: number;
    speed?: number;
    frequency?: number;
    color1: string;
    color2: string;
    color3: string;
    color4: string;
    color5: string;
    camPosX?: number;
    camPosY?: number;
    camPosZ?: number;
    targetX?: number;
    targetY?: number;
    targetZ?: number;
    onChange?: (id: string, value: number | string | boolean) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

const EtherealToolAdapter: React.FC<EtherealToolAdapterProps> = (props) => {
    const {
        color1, color2, color3, color4, color5,
        wireframe, density, amplitude, speed, frequency,
        scaleX, scaleY, enableOrbit,
        paused,
        camPosX, camPosY, camPosZ,
        targetX, targetY, targetZ,
        onChange
    } = props;

    const colors = [color1, color2, color3, color4, color5];

    return (
        <div className="w-full h-full relative bg-black">
            <EtherealGradient
                colors={colors}
                wireframe={wireframe}
                density={density}
                amplitude={amplitude}
                speed={speed}
                frequency={frequency}
                scaleX={scaleX}
                scaleY={scaleY}
                enableOrbit={enableOrbit}
                paused={paused}
                camPosX={camPosX}
                camPosY={camPosY}
                camPosZ={camPosZ}
                targetX={targetX}
                targetY={targetY}
                targetZ={targetZ}
                onChange={onChange}
                className="absolute inset-0 size-full"
            />
        </div>
    );
};

export default EtherealToolAdapter;
