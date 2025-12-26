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
    [key: string]: any;
}

const EtherealToolAdapter: React.FC<EtherealToolAdapterProps> = (props) => {
    const { 
        color1, color2, color3, color4, color5,
        wireframe, density, amplitude, speed, frequency,
        ...rest 
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
                className="absolute inset-0 size-full"
            />
        </div>
       
    );
};

export default EtherealToolAdapter;
