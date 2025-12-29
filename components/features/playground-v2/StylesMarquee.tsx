'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { StyleStackCard } from './StyleStackCard';
import { usePlaygroundStore } from '@/lib/store/playground-store';

interface StylesMarqueeProps {
    className?: string;
}

export const StylesMarquee: React.FC<StylesMarqueeProps> = () => {
    const styles = usePlaygroundStore(s => s.styles);
    const initStyles = usePlaygroundStore(s => s.initStyles);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        if (styles.length === 0) {
            initStyles();
        }
    }, [styles.length, initStyles]);

    if (styles.length === 0) return null;

    // To create an infinite loop, we duplicate the list
    // We need enough items to fill the screen width twice
    const duplicatedStyles = [...styles, ...styles, ...styles];

    return (
        <div
            className="relative w-full overflow-hidden py-16 select-none pointer-events-auto"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <motion.div
                className="flex gap-20 w-max px-8"
                animate={{
                    x: isHovered ? undefined : ["0%", "-33.33%"],
                }}
                transition={{
                    x: {
                        repeat: Infinity,
                        repeatType: "loop",
                        duration: styles.length * 10,
                        ease: "linear",
                    }
                }}
            >
                {duplicatedStyles.map((style, idx) => (
                    <div key={`${style.id}-${idx}`} className="w-[200px] shrink-0">
                        <StyleStackCard
                            style={style}
                            size="sm"
                        />
                    </div>
                ))}
            </motion.div>
        </div>
    );
};
