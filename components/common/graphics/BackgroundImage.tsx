import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

// 依赖于通过 shadcn CLI 添加的组件文件
// 保持相对引用，避免额外路径别名依赖
import GradualBlur from "./GradualBlur";
import Noise from "./Noise";

// 可选：确保样式已加载（react-bits 组件可能依赖其 CSS）
// 若组件内部已引入其 CSS，可移除此两行；否则保留
import "./GradualBlur.css";
import "./Noise.css";

export interface BackgroundImageProps {
  src: string;
  alt?: string;
  className?: string;
  children?: React.ReactNode;
  // GradualBlur 配置
  blurPosition?: "top" | "bottom" | "around";
  blurHeight?: string; // CSS 尺寸字符串，例如 "6rem"
  blurStrength?: number;
  blurDivCount?: number;
  blurCurve?: "linear" | "bezier";
  blurExponential?: boolean;
  blurOpacity?: number;
  // Noise 配置
  noisePatternSize?: number;
  noiseScaleX?: number;
  noiseScaleY?: number;
  noiseRefreshInterval?: number;
  noiseAlpha?: number;
}

export function BackgroundImage({
  src,
  alt = "",
  className,
  children,
  blurPosition = "bottom",
  blurHeight = "6rem",
  blurStrength = 2,
  blurDivCount = 5,
  blurCurve = "bezier",
  blurExponential = true,
  blurOpacity = 1,
  noisePatternSize = 250,
  noiseScaleX = 1,
  noiseScaleY = 1,
  noiseRefreshInterval = 2,
  noiseAlpha = 15,
}: BackgroundImageProps) {
  const isBottom = blurPosition === "bottom";
  const isAround = blurPosition === "around";

  return (
    <section className="relative w-full h-full overflow-hidden">
      {/* 背景图淡入 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="absolute inset-0"
      >
        <Image
          src={src}
          alt={alt}
          fill
          priority
          className={`object-cover ${className ?? ""}`}
        />
      </motion.div>

      {/* 内容层（位于效果层之上）*/}
      <div className="relative z-10">{children}</div>

      {/* 噪声层：覆盖整个背景，禁用事件拦截 */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <Noise
          patternSize={noisePatternSize}
          patternScaleX={noiseScaleX}
          patternScaleY={noiseScaleY}
          patternRefreshInterval={noiseRefreshInterval}
          patternAlpha={noiseAlpha}
        />
      </div>

      {/* 渐进模糊层：默认底部/顶部；around 模式覆盖全屏 */}
      <div
        className={isAround ? "pointer-events-none absolute inset-0" : "pointer-events-none absolute inset-x-0"}
        style={{
          height: isAround ? undefined : blurHeight,
          bottom: isAround ? undefined : (isBottom ? 0 : undefined),
          top: isAround ? undefined : (!isBottom ? 0 : undefined),
        }}
      >
        <GradualBlur
          target="parent"
          position={blurPosition}
          height={isAround ? "100%" : blurHeight}
          strength={blurStrength}
          divCount={blurDivCount}
          curve={blurCurve}
          exponential={blurExponential}
          opacity={blurOpacity}
        />
      </div>
    </section>
  );
}
