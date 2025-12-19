'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { HTMLMotionProps, motion, Transition } from 'motion/react';

const GRADIENT_ANGLES = {
  top: 0,
  right: 90,
  bottom: 180,
  left: 270,
} as const;

export type ProgressiveBlurProps = {
  direction?: keyof typeof GRADIENT_ANGLES;
  blurLayers?: number;
  className?: string;
  blurIntensity?: number;
  /**
   * 是否启用鼠标悬停渐显效果。
   * 如果为 true，初始状态下模糊层是透明的，鼠标移入时渐变显示。
   * @default false
   */
  hoverReveal?: boolean;
  /**
   * 渐显动画的过渡配置
   */
  revealTransition?: Transition;
  /**
   * 外部控制可见性，如果提供此属性，将忽略 hoverReveal 和内部 hover 状态
   */
  visible?: boolean;
} & Omit<HTMLMotionProps<'div'>, 'onMouseEnter' | 'onMouseLeave'>; // 排除掉我们即将占用的事件处理类型

export function ProgressiveBlur({
  direction = 'bottom',
  blurLayers = 8,
  className,
  blurIntensity = 2,
  hoverReveal = false,
  revealTransition = { duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }, // 默认使用一个平滑的 cubic-bezier
  visible,
  ...props
}: ProgressiveBlurProps) {
  const [isHovered, setIsHovered] = useState(false);
  const layersCount = Math.min(Math.max(blurLayers, 2), 16);

  // 使用 useMemo 缓存图层数据计算（沿用之前的优化）
  const layers = useMemo(() => {
    const segmentSize = 1 / (layersCount + 1);
    const angle = GRADIENT_ANGLES[direction];

    return Array.from({ length: layersCount }).map((_, index) => {
      const gradientStops = [
        index * segmentSize,
        (index + 1) * segmentSize,
        (index + 2) * segmentSize,
        (index + 3) * segmentSize,
      ].map(
        (pos, posIndex) =>
          // 使用黑色作为 Mask 标准色
          `rgba(0, 0, 0, ${posIndex === 1 || posIndex === 2 ? 1 : 0}) ${Math.min(pos * 100, 100)}%`
      );

      return {
        gradient: `linear-gradient(${angle}deg, ${gradientStops.join(', ')})`,
        // 使用轻微的非线性增长让模糊更自然
        blur: Math.pow(index, 1.1) * blurIntensity,
      };
    });
  }, [layersCount, direction, blurIntensity]);

  // 处理鼠标事件
  // 仅当没有外部控制且开启了 hoverReveal 时才处理内部 hover
  const shouldHandleHover = visible === undefined && hoverReveal;
  const handleMouseEnter = shouldHandleHover ? () => setIsHovered(true) : undefined;
  const handleMouseLeave = shouldHandleHover ? () => setIsHovered(false) : undefined;

  // 计算目标透明度
  // 1. 如果有 visible 属性，直接使用 visible (true->1, false->0)
  // 2. 如果没有 visible 且没开启 hoverReveal，始终为 1 (常显)
  // 3. 如果开启了 hoverReveal，根据 isHovered 状态决定 (true->1, false->0)
  const targetOpacity = visible !== undefined
    ? (visible ? 1 : 0)
    : (!hoverReveal ? 1 : isHovered ? 1 : 0);

  // 计算初始透明度以避免闪烁
  const initialOpacity = visible !== undefined
    ? (visible ? 1 : 0)
    : (hoverReveal ? 0 : 1);

  return (
    <div
      className={cn('relative overflow-hidden z-0', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    // 这里不需要传 props，因为外层 div 主要是作为容器处理 hover 事件
    >
      {layers.map((layer, index) => (
        <motion.div
          key={index}
          className="pointer-events-none absolute inset-0 will-change-[opacity,backdrop-filter]"
          // 初始状态
          initial={{ opacity: initialOpacity }}
          // 动画状态：根据计算出的目标透明度进行动画
          animate={{ opacity: targetOpacity }}
          // 过渡效果配置
          transition={revealTransition}
          style={{
            maskImage: layer.gradient,
            WebkitMaskImage: layer.gradient,
            backdropFilter: `blur(${layer.blur}px)`,
            WebkitBackdropFilter: `blur(${layer.blur}px)`,
          }}
          // 将剩余的 props 传递给内部的 motion.div 层
          // 注意：如果有 onClick 等事件，也会被传递给所有层，但因为有 pointer-events-none，所以不会触发。
          // 如果需要容器响应点击，应将 onClick 放到外层 div。
          {...props}
        />
      ))}
      {/* 这里可以放置需要被模糊覆盖的内容 */}
    </div>
  );
}