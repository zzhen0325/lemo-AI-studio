# Lemo-AI-Studio 性能优化深度评估报告

## 一、 总体诊断与现状分析

本章节旨在对 lemo-AI-studio 项目进行宏观层面的性能评估，梳理其技术栈、架构特点以及核心交互路径中存在的性能瓶颈。我们将从页面切换体验和图片加载响应速度两大核心关注点出发，为后续的深度优化提供基准和方向。

### 1.1 项目技术栈与架构概览

lemo-AI-studio 是一个基于 **Next.js 15** 和 **React 19** 的现代化 AI 艺术创作平台，前端技术栈核心包括：

- **框架层**: Next.js 15 (App Router 模式), React 19
- **UI 与样式**: Tailwind CSS, shadcn/ui, framer-motion (用于动画)
- **状态管理**: Zustand
- **重型依赖**: @react-three/fiber, three, gsap (用于 WebGL 和复杂动画), fabric (用于图片编辑)

项目采用混合渲染策略，大部分页面为客户端组件（"use client"），这为富交互提供了便利，但也带来了 JavaScript 负载较重、首屏渲染和水合（Hydration）压力大的潜在问题。

#### 核心交互路径分析

1. **页面切换**:
   - 主要通过 `app/page.tsx` 中的 `currentTab` 状态来控制不同视图（Playground, Gallery, Tools 等）的条件渲染。这种方式本质上是在**单一页面内的组件切换**，而非 Next.js 基于路由的代码分割。
   - `pages/_app.tsx` 中使用了 `AnimatePresence` 和 `PageTransition` 组件，为页面切换增加了基于 `framer-motion` 的淡入淡出动画，这会占用主线程资源，可能导致切换时出现卡顿。

2. **图片加载与展示**:
   - **历史记录 (GalleryView, HistoryList)**: 采用 CSS columns 实现瀑布流布局，在图片量大时会引发**频繁的重排（Reflow）**，显著影响滚动性能。
   - **图片预览 (ImagePreviewModal)**: 使用 `next/image`，但未显式配置 `sizes` 属性，可能导致浏览器选择尺寸不当的图片版本。
   - **首屏背景 (app/page.tsx)**: 直接使用 `<video>` 标签播放 `public/images/1.mp4`，缺少 poster 图像和 `preload="metadata"` 等优化，导致首屏加载时网络开销巨大。

### 1.2 关键性能瓶颈总结

> [!IMPORTANT]
> 项目当前最大的性能瓶颈在于**前端 JavaScript 负载过重**和**未经优化的资源加载策略**。

具体表现为：

- **页面切换体验不佳**: 由于缺乏基于路由的代码拆分，切换 Tab 会导致大量组件同时渲染，加之 `framer-motion` 动画的阻塞，使得切换过程缓慢、不流畅。
- **图片加载效率低下**: `GalleryView` 的瀑布流布局在大数据量下存在严重性能问题；`next/image` 的使用不够精细；首屏视频资源未经优化，严重拖慢了初始加载速度。
- **数据获取与缓存缺失**: `/api/history` 接口在读多写少的场景下，每次都进行文件 I/O，缺乏有效的服务端和客户端缓存。
- **构建产物庞大**: 未对 `three.js`, `fabric.js` 等重型库进行按需加载，导致主包体积过大。

后续章节将针对这些问题，提供具体的、可落地的优化方案。

## 二、 页面切换性能优化

当前应用的核心交互模式是基于 `app/page.tsx` 内的**状态驱动视图切换**，而非 Next.js App Router 的原生路由导航。这种模式虽然在简单场景下易于实现，但在 lemo-AI-studio 这样包含多个重型视图（Playground, Gallery, Tools）的应用中，已成为页面切换体验的主要瓶颈。本章将深入分析其问题并提供改造方案。

### 2.1 问题诊断：动画阻塞与同步渲染

#### 1. framer-motion 动画的影响

- **问题点**: `pages/_app.tsx` 和 `components/common/PageTransition.tsx` 中使用了 `AnimatePresence` 和 `motion.div` 来实现页面切换动画。
- **原理**: `framer-motion` 的动画计算和执行都发生在**浏览器主线程**。当切换 Tab 时，新旧视图的淡入淡出动画会与 React 的渲染更新（Diffing & Reconciliation）抢占主线程资源。如果新视图渲染成本高，主线程会被长时间阻塞，导致动画掉帧、交互卡顿，给用户带来“慢”的直观感受。
- **涉及文件**:
  - `pages/_app.tsx`
  - `components/common/PageTransition.tsx`

#### 2. 缺乏代码拆分与同步渲染

- **问题点**: 在 `app/page.tsx` 中，所有 Tab 对应的视图组件（PlaygroundV2Page, GalleryView, DatasetManagerView, ToolsView）都是**静态导入**的。
- **原理**: 这意味着首次加载页面时，所有这些视图的代码，包括它们庞大的依赖（如 `three.js`, `fabric.js`），都会被打包进初始的 JavaScript Chunk 中。切换 Tab 时，即便某个视图尚未显示，其代码也已加载并可能已参与部分计算。视图的渲染是同步发生的，React 需要在一次更新中完成整个新视图的渲染树计算，期间无法响应用户输入。
- **涉及文件**:
  - `app/page.tsx`

### 2.2 优化方案与实施步骤

#### 1. 引入 React.useTransition 降低切换阻塞

`React.useTransition` 是 React 18+ 提供的并发特性，允许我们将某些状态更新标记为“非紧急”，从而避免在更新过程中阻塞用户界面。

**实施步骤**:
1. 修改 `app/page.tsx` 中的 `handleTabChange` 函数。
2. 使用 `useTransition` hook 来包裹 `setCurrentTab` 的状态更新。

**代码示例 (app/page.tsx)**:

```diff
- import { Suspense, useEffect, useState } from "react";
+ import { Suspense, useEffect, useState, useTransition } from "react";

export default function Page() {
  const [currentTab, setCurrentTab] = useState<TabValue>(TabValue.Playground);
+ const [isPending, startTransition] = useTransition();

  const handleTabChange = (tab: TabValue) => {
    // ... (省略部分逻辑)
+   startTransition(() => {
      setCurrentTab(tab);
      if (typeof window !== 'undefined') {
        window.location.hash = tab as string;
      }
+   });
  };
  // ...
}
```

- **效果**: 当 `startTransition` 中的代码执行时，React 知道这是一个过渡更新。它会在后台准备新 Tab 的 UI，同时保持当前 UI 的响应性。我们可以利用 `isPending` 状态来显示一个加载指示器，提升体验。

#### 2. 组件级代码拆分与延迟加载

将每个 Tab 对应的重型视图改造为动态加载组件，是降低初始 JS 负载和加速 Tab 切换的关键。

**实施步骤**:
1. 使用 `next/dynamic` 来包裹各个视图组件。
2. 在 `app/page.tsx` 中，使用 `React.Suspense` 为动态组件提供加载中的 fallback UI。

**代码示例 (app/page.tsx)**:

```javascript
import { Suspense, lazy } from 'react';
import { TabValue } from "@/components/layout/sidebar";

// 使用 next/dynamic 进行动态导入
const PlaygroundV2Page = lazy(() => import('@/pages/playground-v2').then(m => ({ default: m.PlaygroundV2Page })));
const GalleryView = lazy(() => import('@/components/features/playground-v2/GalleryView'));
const DatasetManagerView = lazy(() => import('@/components/features/dataset/DatasetManagerView'));
const ToolsView = lazy(() => import('@/components/features/tools/ToolsView'));
const SettingsView = lazy(() => import('@/components/features/settings/SettingsView').then(m => ({ default: m.SettingsView })));

// Loading 组件
const ViewLoader = () => (
    <div className="flex items-center justify-center h-full text-white">
        Loading View...
    </div>
);

export default function Page() {
    // ... (state and handlers)

    return (
        // ... (Layout)
        <div className="flex flex-col flex-1 h-full overflow-hidden transition-all duration-500">
            <Suspense fallback={<ViewLoader />}>
                {currentTab === TabValue.Playground && <PlaygroundV2Page onGenerate={() => {}} />}
                {currentTab === TabValue.Gallery && <GalleryView variant="full" />}
                {currentTab === TabValue.Settings && <SettingsView />}
                {currentTab === TabValue.DatasetManager && <DatasetManagerView />}
                {currentTab === TabValue.Tools && <ToolsView />}
            </Suspense>
        </div>
        // ...
    );
}
```

**效果**:
- **减小初始包体积**: `PlaygroundV2Page`, `GalleryView` 等组件及其依赖项会被拆分成独立的 JS 文件，只在用户首次点击对应 Tab 时才从网络加载。
- **加速页面切换**: 结合 `useTransition`，切换 Tab 时应用可以立即响应，显示 `Suspense` 的 fallback UI，然后在后台加载和渲染新组件，过程更平滑。

#### 3. 将静态布局迁移至服务端组件 (Server Components)

对于应用中几乎不变的 UI 结构，如布局、侧边栏等，应尽可能转换为服务端组件，以消除不必要的前端 JavaScript 和水合开销。

**可迁移的模块**:
- **`app/layout.tsx`**: `RootLayout` 已经是一个服务端组件，很好。但它内部的 `ThemeProvider` 和 `TooltipProvider` 是客户端组件，应将它们抽离到更小的客户端组件中，以 "use client" 隔离。
- **`components/layout/NewSidebar.tsx`**: 这个侧边栏组件目前是客户端组件，但其结构是静态的。可以将其重构为一个服务端组件，仅将需要交互的部分（如按钮点击事件）通过 props 传递给小型客户端子组件。
- **`app/page.tsx` 的外层布局**: `Page` 组件本身是客户端的，但其内部的 `main`、`header` 等结构可以抽离成一个服务端组件，将 Tab 视图作为 children 传入。

**实施步骤 (以 NewSidebar 为例)**:
1. 创建一个新的客户端组件 `SidebarClient`, 负责处理 `onClick` 等交互。
2. 重构 `NewSidebar.tsx` 为服务端组件，它只负责渲染结构，并将交互逻辑委托给 `SidebarClient`。

**代码示例**:

```javascript
// components/layout/SidebarClient.tsx
"use client";
import { TabValue } from "./sidebar";
// ... imports

export function SidebarClient({ currentTab, onTabChange, navItems }) {
  return (
    <nav className="flex items-center space-x-1">
      {navItems.map((item) => (
        <button key={item.value} onClick={() => onTabChange(item.value)}>
          {/* ... button content */}
        </button>
      ))}
    </nav>
  );
}
```

```javascript
// components/layout/NewSidebar.tsx (Refactored as Server Component)
import { SidebarClient } from './SidebarClient';
import { TabValue } from "./sidebar";
// ... imports

const navItems = [/* ... nav items array ... */];

export function NewSidebar({ currentTab, onTabChange }) {
  return (
    <header>
      {/* ... logo and other static parts ... */}
      <SidebarClient currentTab={currentTab} onTabChange={onTabChange} navItems={navItems} />
      {/* ... other static parts ... */}
    </header>
  );
}
```

**效果**: 减少了发送到客户端的 JavaScript 代码量，降低了页面的水合成本，从而加快了初始加载和交互响应速度。

> [!TIP]
> **总结建议**：
> 1. **立即实施**：在 `app/page.tsx` 中使用 `React.useTransition` 包装 `setCurrentTab`，这是成本最低、见效最快的优化。
> 2. **核心改造**: **必须**对 `PlaygroundV2Page`, `GalleryView`, `ToolsView` 等重型视图进行动态导入（`next/dynamic` 或 `React.lazy`），这是解决切换卡顿和初始负载问题的根本手段。
> 3. **长期重构**: 逐步将 `NewSidebar.tsx` 等包含大量静态结构的客户端组件重构为服务端组件，以最大化利用 Next.js 15 的 App Router 优势。

## 三、 图片加载与响应速度优化

图片是 lemo-AI-studio 项目的核心资产，其加载性能直接决定了用户体验的优劣。当前项目在图片处理方面存在多个可优化点，从首屏大图到历史记录的瀑布流，都存在改进空间。本章将详细剖析这些问题并提供解决方案。

### 3.1 next/image 使用核查与优化

`next/image` 是一个强大的图片优化工具，但需要正确配置才能发挥最大效用。

#### 1. 缺失 sizes 属性导致资源浪费

- **问题点**: 项目中多处（如 `GalleryView.tsx`, `HistoryList.tsx`）使用的 `next/image` 组件在 fill 模式或指定固定宽高时，普遍**缺少 sizes 属性**。
- **原理**: `sizes` 属性告知浏览器在不同视口宽度下，图片将占据多大的尺寸。如果缺失，浏览器会默认一个保守值（通常是 100vw），这可能导致在桌面端为一个仅占屏幕一小部分的缩略图加载了**过大尺寸的图片版本**，造成带宽浪费和加载延迟。
- **涉及文件**:
  - `components/features/playground-v2/GalleryView.tsx`
  - `components/features/playground-v2/HistoryList.tsx`
  - `pages/history.tsx`
- **优化方案**: 根据图片在不同断点下的实际渲染宽度，为 `next/image` 组件精确添加 `sizes` 属性。

**代码示例 (GalleryView.tsx)**:

```diff
 <Image
   src={item.imageUrl}
   alt="Generated masterwork"
   width={item.metadata?.img_width || 1024}
   height={item.metadata?.img_height || 1024}
+  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
   quality={75}
   className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
 />
```

*   **解读**: 这个 `sizes` 属性告诉浏览器：
    *   当视口宽度小于 640px 时，图片宽度为视口宽度的 100%。
    *   当视口宽度在 641px 到 1024px 之间时，图片宽度为视口宽度的 50%。
    *   依此类推，浏览器会根据这些信息选择最接近且不小于所需尺寸的图片变体进行加载。

#### 2. placeholder 与 blurDataURL 的应用

- **问题点**: 对于动态加载的图片，缺少有效的占位符策略，导致图片加载时出现空白或布局抖动。
- **方案**:
  1. 为所有 `next/image` 组件添加 `placeholder="blur"`。
  2. Next.js 会自动为静态导入的图片生成模糊图。对于动态 URL，我们需要提供一个 `blurDataURL`。
  3. 一个绝佳的实践是，在图片上传或生成时，**将生成的缩略图 base64 复用为 blurDataURL**。这在 `/api/ai/describe` 接口中已经有所体现，可以推广到所有图片生成流程。当无法获得 base64 时，可使用一个通用的、极小的 base64 字符串作为后备。

**代码示例**:

```javascript
<Image
  src={item.imageUrl}
  alt="Generated image"
  fill
  sizes="..."
  placeholder="blur"
  blurDataURL={item.blurDataURL || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='}
/>
```

### 3.2 首屏背景视频与大图优化

- **问题点**: `app/page.tsx` 中直接使用 `<video>` 标签播放一个 **4.2MB** 的 `1.mp4` 文件，且没有 poster 图像。这会阻塞首屏渲染，即使用户网络状况不佳，也需要等待视频开始加载才能看到内容。
- **涉及文件**: `app/page.tsx`
- **优化方案**:
  1. **添加 poster 属性**: 为 `<video>` 标签添加一个 `poster` 属性，指向一个高质量压缩的视频首帧图像。这样浏览器可以立即显示该图像，而视频在后台加载。
  2. **使用 preload="metadata"**: 该属性能提示浏览器仅预加载视频的元数据（如时长、尺寸），而非整个视频文件。
  3. **视频压缩**: 对 `1.mp4` 进行再压缩，或转换为更高效的格式如 WebM。
  4. **考虑渐进式图片**: 对于静态大图背景（如注释掉的 `9.webp`），应使用渐进式 JPEG 或 WebP 格式，并确保 `next/image` 的 `priority` 属性被正确设置，以便预加载。

**代码示例 (app/page.tsx)**:

```diff
 <video
   src="/images/1.mp4"
+  poster="/images/1_poster.jpg" // 一个高质量压缩的首帧图片
   autoPlay
   loop
   muted
   playsInline
+  preload="metadata"
   className="w-full h-full object-cover"
 />
```

### 3.3 GalleryView 瀑布流布局的性能瓶颈

- **问题点**: `GalleryView.tsx` 使用 `columns` CSS 属性实现瀑布流。这种布局方式非常简单，但在项目数量巨大时，每次新增或移除元素都会导致**所有列的重新计算和重排**，引发严重的性能问题，尤其是在滚动时。
- **涉及文件**: `components/features/playground-v2/GalleryView.tsx`
- **优化方案**:
  1. **【推荐】虚拟化列表 (Virtualization)**: 引入 `react-window` 或 `react-virtualized` 库。这些库只渲染视口内可见的少数几个列表项，当用户滚动时，动态回收不可见的项并渲染新的项。这是处理长列表性能问题的**根本解决方案**。
  2. **CSS content-visibility**: 这是一个较新的 CSS 属性，可以告诉浏览器在元素滚动到视口外时跳过其内容的渲染。可以作为虚拟化方案的补充或轻量级替代。

**实施建议 (虚拟化)**:
- 这需要对 `GalleryView.tsx` 的布局进行较大重构。需要一个库如 `react-window-infinite-loader` 来结合无限滚动加载数据，并使用 `FixedSizeList` 或 `VariableSizeList` 来管理列表项的渲染。
- 鉴于改造成本，此项可作为**阶段性路线图**中的一个重要任务。

**实施建议 (CSS Containment)**:
作为快速收益方案，可以尝试为 `GalleryCard` 添加 CSS containment。

```css
.gallery-card {
  content-visibility: auto;
  contain: layout style paint;
}
```

这能隔离卡片的渲染，减少重排影响，但效果不如虚拟化彻底。

### 3.4 静态资源与缓存策略

- **问题点**: `next.config.mjs` 中设置了 `minimumCacheTTL: 604800` (7天)，这是一个全局设置，但对于不同类型的资源，我们需要更精细的缓存策略。同时，`remotePatterns` 允许所有域名的图片，存在一定的安全风险。
- **涉及文件**: `next.config.mjs`
- **优化方案**:
  1. **精细化 Cache-Control 头**: 通过 `next.config.mjs` 的 `headers` 函数，为不同路径的资源设置不同的缓存策略。
  2. **文件名哈希**: 确保构建过程中对静态资源（JS, CSS, 图片）文件名进行哈希处理（Next.js 默认行为），以实现长期缓存（immutable）。
  3. **收紧 remotePatterns**: 明确列出合法的图片来源域名，避免潜在的安全问题。

**代码示例 (next.config.mjs)**:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'allowed-domain.com', // 明确指定允许的域名
      },
    ],
    // minimumCacheTTL: 604800, // 移除全局设置，改用 headers
  },
  async headers() {
    return [
      {
        source: '/:all*(svg|png|jpg|jpeg|webp|gif|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/Font/:all*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/outputs/:all*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
```

> [!TIP]
> **总结建议**：
> 1. **快速收益**:
>    - 为 `<video>` 添加 `poster` 和 `preload="metadata"`。
>    - 为所有关键的 `next/image` 组件添加 `sizes` 属性和 `placeholder="blur"`。
>    - 在 `next.config.mjs` 中通过 `headers` 函数为字体和静态图片设置 `immutable` 缓存。
> 2. **核心改造**:
>    - **必须**将 `GalleryView` 的瀑布流布局从 CSS columns 改造为基于 `react-window` 的虚拟化列表，以根治大数据量下的滚动性能问题。

## 四、 数据获取与缓存优化

高效的数据获取策略是保障应用流畅响应的关键。当前 lemo-AI-studio 在历史记录的获取上存在明显的性能瓶颈，主要集中在 `/api/history` 接口的实现上。本章将对其进行深入分析，并提供客户端与服务端协同的优化方案。

### 4.1 /api/history 接口的 I/O 瓶颈

- **问题点**: `app/api/history/route.ts` 中的 GET 和 POST 请求处理方式存在严重的性能问题。
- **频繁的磁盘读写**: 每次 GET 请求都会**同步读取** `history.json` 文件。每次 POST 请求（即使用户只是生成一张图片），都会**完整地读取、解析、修改、序列化并写回**整个 `history.json` 文件。
- **无差别排序**: 每次 GET 请求都会对历史记录全量数据进行一次基于时间的**服务端排序**。
- **缺乏缓存**: 接口没有利用任何 HTTP 缓存机制，如 ETag 或 Cache-Control，导致客户端无法有效缓存数据，每次切换到 Gallery 或 History 视图都会触发一次完整的网络请求和后端 I/O。
- **涉及文件**:
  - `app/api/history/route.ts`

### 4.2 服务端优化方案

#### 1. 引入内存缓存与增量写入

对于读多写少的历史记录场景，应引入内存缓存来避免不必要的磁盘 I/O。

**实施步骤**:
1. 在模块作用域内创建一个变量作为内存缓存（`inMemoryHistory`）。
2. 应用启动时，首次 GET 请求将 `history.json` 加载到内存中。
3. 后续的 GET 请求直接从内存缓存中读取数据并返回。
4. POST 请求仅将新记录**增量添加**到内存缓存和 `history.json` 文件中，而不是重写整个文件。可以使用 `fs.appendFile` 来实现高效的增量写入。
5. 引入一个简单的锁机制（或使用队列）来防止并发写入冲突。

#### 2. 利用 HTTP 缓存头 (ETag, Last-Modified)

HTTP 缓存是减少不必要数据传输的有效手段。

**实施步骤**:
1. 在 GET 响应中添加 ETag 或 Last-Modified 响应头。
2. 在处理 GET 请求时，检查请求头中的 `If-None-Match` 或 `If-Modified-Since`。
3. 如果内容未发生变化，直接返回 304 Not Modified 状态码。

**代码示例 (app/api/history/route.ts 改造思路)**:

```typescript
// 伪代码，展示核心思路
import { createHash } from 'crypto';

let inMemoryHistory: HistoryItem[] | null = null;
let historyEtag: string | null = null;

async function loadHistory() {
    // ... 从 history.json 读取数据 ...
    inMemoryHistory = sortedHistory;
    historyEtag = `"${createHash('sha1').update(JSON.stringify(inMemoryHistory)).digest('hex')}"`;
}

export async function GET(request: Request) {
    if (!inMemoryHistory) {
        await loadHistory();
    }

    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === historyEtag) {
        return new Response(null, { status: 304 });
    }

    return new Response(JSON.stringify({ history: inMemoryHistory }), {
        headers: {
            'Content-Type': 'application/json',
            'ETag': historyEtag!,
        },
    });
}
```

### 4.3 客户端优化方案

#### 1. 使用 react-query 或 SWR 进行请求去重与缓存

`react-query` 和 `SWR` 等库提供了强大的数据获取和缓存能力。

**实施步骤**:
1. 将 `fetchHistory` 的逻辑由 `useEffect` 移至 `react-query` 的 `useQuery` hook 中。
2. `useQuery` 会自动处理请求去重、后台重新验证、失败重试等。

**代码示例 (GalleryView.tsx 改造)**:

```javascript
import { useQuery } from '@tanstack/react-query';

async function fetchHistoryAPI() {
  const resp = await fetch('/api/history');
  if (!resp.ok) throw new Error('Network error');
  const data = await resp.json();
  return data.history;
}

export default function GalleryView(...) {
    const { data: history, isLoading } = useQuery({
        queryKey: ['history'],
        queryFn: fetchHistoryAPI,
        staleTime: 5 * 60 * 1000,
    });
    // ...
}
```

#### 2. 上传预览 Base64 复用为 blurDataURL

- **问题点**: 在 `pages/playground-v2.tsx` 的 `handleFilesUpload` 函数中，生成了 base64 预览图但未充分利用。
- **优化方案**:
  1. 将预览 base64 字符串赋值给 `GenerationResult` 的 `blurDataURL` 属性。
  2. 在 `HistoryCard` 或 `GalleryCard` 中，应用至 `next/image` 的 `placeholder="blur"`。

> [!TIP]
> **总结建议**：
> 1. **服务端核心改造**: **必须**为 `/api/history` 的 GET 接口添加 HTTP 缓存（ETag 或 Last-Modified）。
> 2. **客户端核心改造**: 引入 `SWR` 或 `react-query` 来管理客户端的数据请求和缓存。
> 3. **快速收益**: 将预览 base64 字符串作为 `blurDataURL` 传递给 `next/image`。

## 五、 构建与体积优化

应用的初始加载性能与 JavaScript 包体积直接相关。

### 5.1 识别并拆分重型依赖

- **问题点**: `three`, `fabric`, `gsap` 等重型库可能被打包进了主 chunk。
- **实施步骤**:
  1. **路由/Tab 级拆分**: 对各 Tab 视图进行动态导入（第二章已详述）。
  2. **组件级拆分**: 对 `ImageEditorModal` 等重型子组件使用动态导入。

**代码示例 (动态导入 ImageEditorModal)**:

```javascript
const ImageEditorModal = lazy(() => import('@/components/features/playground-v2/ImageEditorModal'));

export function PlaygroundV2Page(...) {
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    return (
        <>
            {isEditorOpen && (
                <Suspense fallback={<div>Loading Editor...</div>}>
                    <ImageEditorModal isOpen={isEditorOpen} ... />
                </Suspense>
            )}
        </>
    );
}
```

### 5.2 优化 next/image 配置

- **涉及文件**: `next.config.mjs`
- **优化方案**: 精简 `deviceSizes` 和 `imageSizes` 以匹配实际 UI 需求。

```javascript
const nextConfig = {
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200, 1400],
    imageSizes: [96, 128, 256, 384],
    formats: ['image/webp'],
  },
};
```

> [!TIP]
> **总结建议**：
> 1. **首要任务**: 确保所有重型视图都通过**动态导入**进行代码拆分。
> 2. **精细化配置**: 精简 `next.config.mjs` 中的图片尺寸配置。
> 3. **使用分析工具**: 强烈建议使用 `@next/bundle-analyzer` 可视化分析构建产物。

## 六、 状态管理与渲染策略优化

### 6.1 Zustand 造成的全局重渲染风险

- **问题点**: 订阅整个 store 会导致不必要的重渲染。
- **优化方案**: 使用 Selector 选择性订阅，并配合 `shallow` 比较。

```javascript
import { shallow } from 'zustand/shallow';

// 只有当指定字段实际改变时才会重渲染
const { prompt, gen_num } = usePlaygroundStore(
    state => ({ prompt: state.config.prompt, gen_num: state.config.gen_num }),
    shallow
);
```

### 6.2 列表渲染性能优化 (HistoryList, GalleryView)

- **优化方案**:
  1. **使用 React.memo**: 包裹 `HistoryCard` 等列表项组件。
  2. **稳定的 key**: 确保 `map` 中的 `key` 使用稳定的 `id`。

### 6.3 搜索输入卡顿优化

- **优化方案**: 使用 `useDeferredValue` 延迟列表过滤逻辑。

```diff
- import React, { useEffect, useState } from 'react';
+ import React, { useEffect, useState, useDeferredValue } from 'react';

export default function GalleryView(...) {
    const [searchQuery, setSearchQuery] = useState("");
+   const deferredSearchQuery = useDeferredValue(searchQuery);

    const combinedHistory = React.useMemo(() => {
        const filtered = deferredSearchQuery.trim() === ""
            ? combined
            : combined.filter(item => item.metadata?.prompt?.includes(deferredSearchQuery));
        return filtered.sort(...);
-   }, [history, generationHistory, searchQuery]);
+   }, [history, generationHistory, deferredSearchQuery]);
}
```

> [!TIP]
> **总结建议**：
> 1. **Zustand 使用规范**: 强制使用 selector 和 `shallow`。
> 2. **列表渲染**: 为列表项组件包裹 `React.memo`。
> 3. **高频交互**: 引入 `useDeferredValue` 解决搜索卡顿。

## 七、 可操作的改造清单

| 改造点名称 | 影响面与风险 | 实施步骤 | 涉及文件 | 验收标准 |
| :--- | :--- | :--- | :--- | :--- |
| **P0: 核心瓶颈** | | | | |
| 1. 动态导入核心视图 | 首屏体积显著降低 | `React.lazy` 改造视图组件 + `Suspense` | `app/page.tsx` 等 | Lighthouse 提升 10+ 分 |
| 2. 优化首屏视频 | 提升 LCP 速度 | 添加 `poster` 和 `preload="metadata"` | `app/page.tsx` | LCP 减少 500ms+ |
| 3. next/image sizes | 减少带宽消耗 | 为 Image 添加精确 `sizes` 属性 | 各 View 组件 | 网络面板加载正确尺寸 |
| 4. 接口 HTTP 缓存 | 降低 I/O 压力 | 添加 ETag 和 304 处理 | `api/history/route.ts` | 返回 304 响应 |
| **P1: 重要优化** | | | | |
| 5. 虚拟化瀑布流 | 根治滚动卡顿 | 引入 `react-window` 重构布局 | `GalleryView.tsx` | 500+ 图片滚动 FPS > 50 |
| 6. Zustand 订阅优化 | 减少冗余渲染 | 使用 selector 和 `shallow` | 各 Store 使用处 | Profiler 验证渲染次数 |
| 7. Tab 切换过渡 | 提升感知流畅度 | 引入 `useTransition` | `app/page.tsx` | 切换时不冻结 UI |

## 八、 快速收益与阶段性路线图

### 8.1 Quick Wins (本周内可完成)

1. **动态导入核心视图 (P0)**: 使用 `React.lazy` 按需加载。
2. **优化首屏背景视频 (P0)**: 添加 `poster` 和 `preload`。
3. **优化 next/image 配置 (P0)**: 添加 `sizes` 属性并精简 `next.config.js`。
4. **优化高频交互 (P1)**: 使用 `useDeferredValue` 和 `React.memo`。
5. **页面切换使用 useTransition (P1)**: 包装 Tab 切换逻辑。

### 8.2 阶段性路线图 (Roadmap)

- **第一阶段 (1–3 周)**: 虚拟化瀑布流、服务端缓存、Zustand 规范。
- **第二阶段 (3–6 周)**: 迁移至 Server Components、引入 SWR/react-query、完善占位符策略。

## 九、 实施校验清单（验收标准）

### 通用指标
- **Lighthouse Performance Score**: 提升 **15-20 分**。
- **FCP / LCP**: 分别小于 **1.8s / 2.5s**。
- **TBT**: 小于 **200ms**。

### 专项指标
- **页面切换**: 过渡动画流畅 (FPS > 50)，初始包体积减少 **30%**。
- **图片加载**: GalleryView 滚动稳定，根据 `sizes` 加载正确尺寸。
- **数据获取**: `/api/history` 命中缓存 (304)，TTFB 低于 **50ms**。
- **渲染性能**: Profiler 验证局部更新，搜索框无延迟。
