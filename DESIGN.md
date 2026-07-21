# DESIGN.md

遵循 [Google Stitch DESIGN.md 格式](https://stitch.withgoogle.com/docs/design-md/format/)

## Colors

### Brand
- **Brand**: `oklch(0.50 0.18 65)` - 温暖的橙棕色，作为主要强调色
- **Brand Hover**: `oklch(0.55 0.20 65)`
- **Brand Active**: `oklch(0.45 0.16 65)`
- **Brand Subtle**: `oklch(0.50 0.18 65 / 0.08)` - 用于背景高亮

### Light Theme
- **Surface**: `oklch(0.96 0.006 60)` - 暖色调的浅色背景
- **Surface Raised**: `oklch(0.93 0.008 60)`
- **Text Primary**: `oklch(0.20 0.01 60)`
- **Text Secondary**: `oklch(0.40 0.012 60)`
- **Text Muted**: `oklch(0.55 0.01 60)`
- **Border**: `oklch(0.85 0.008 60)`

### Dark Theme
- **Surface**: `oklch(0.14 0.012 60)` - 温暖的深色背景，不是纯黑
- **Text Primary**: `oklch(0.93 0.008 60)`
- **Text Secondary**: `oklch(0.72 0.012 60)` - 提高对比度
- **Text Muted**: `oklch(0.58 0.01 60)`
- **Border**: `oklch(0.26 0.012 60)`

### Semantic
- **Error**: `oklch(0.60 0.22 25)`

## Typography

### Font Stack
使用系统字体，无需加载外部字体：
- **Serif**: Georgia, Cambria, Times New Roman
- **Sans**: system-ui, -apple-system, BlinkMacSystemFont, Segoe UI
- **Mono**: SF Mono, Menlo, Monaco, Consolas

### Scale
- **H1**: `text-2xl font-medium` - 页面标题
- **H2**: `text-2xl font-medium text-text-secondary` - 分类标题
- **H3**: `text-sm font-medium` - 卡片标题
- **Body**: `text-sm` - 正文和描述
- **Muted**: `text-xs` - 辅助信息

### Hierarchy
- 标题使用 `font-medium` 而非 `font-serif`
- 分类标题使用 `text-text-secondary` 区分层级
- 保持清晰的视觉层次

## Spacing

- **Page Padding**: `px-10 py-4` (主内容区)
- **Section Gap**: `mb-10` (分类间距)
- **Card Gap**: `gap-4` (卡片间距)
- **Card Padding**: `p-4` (卡片内边距)
- **Sidebar Item**: `py-2.5 px-3`

## Components

### LinkCard
- 使用 CSS Grid 响应式布局 `grid-cols-[repeat(auto-fill,minmax(280px,1fr))]`
- 圆角 `rounded-[0.625rem]`
- 边框 1px subtle
- Hover: 上移 2px + 边框加深 + 微妙阴影

### AppSidebar
- 宽度 `w-52`
- 分类按钮 `py-2.5 px-3 rounded-md`
- 激活状态: brand 背景 + 白色文字 + 微妙阴影

### AppHeader
- 高度约 60px
- Logo 使用 `text-xl font-medium`
- 包含: Logo、搜索框、时间、主题切换、Admin 入口

### UiButton
- 三种变体: `fill` (实心)、`ghost` (透明)、`text` (文字)
- 小尺寸: `px-3 py-1.5 text-sm`
- 添加 focus-visible 状态支持键盘导航

### PortalRoutePanel
- 首页保持原始浅色网格和黑白面板语言，不使用营销型大字或装饰性拓扑
- Interface Docs、Event Architecture、Bookmarks 与 API 作为“设计模式”书籍中的四个可点击页面
- 首页以书籍为单一视觉中心；原有 Surface 切换保持可用
- 书页包含目录、路线说明、对应设计模式、划线和页边批注，避免空白装饰页
- Three.js 书页先停留，再从上到下逐段画完批注线，最后缓慢翻动；悬停与聚焦时暂停自动阅读
- 每张纸拥有正反两面；翻页时正面内容随纸张翻走，背面内容自然落到左页，并同步露出下一张纸的正面
- 支持上一页、下一页按钮与左右方向键手动翻页；点击可见页面进入对应路径，减少动态效果时即时切页
- 封面采用暖棕布面精装：硬壳包边、织物凹凸纹理、压印边线、纹理衬页、书脊关节、凸带与堵头共同建立真实装订层次；书芯保留纸张层、弯曲页面、自阴影与接触阴影

## Do's

- 使用 OKLCH 色彩空间
- 保持暖色调的一致性
- 使用系统字体，避免加载外部字体
- 深色模式使用温暖的深灰而非纯黑
- 卡片使用微妙的边框和阴影
- 保持清晰的视觉层次

## Don'ts

- 不要使用纯黑 `#000` 或纯白 `#fff`
- 不要使用紫色渐变
- 不要过度使用动画
- 不要嵌套卡片
- 不要使用 bounce 或 elastic 缓动
- 不要加载外部字体（系统字体足够好）
