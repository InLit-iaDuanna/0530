# 0530 Codex 对话经验总结

本文档汇总了 Codex 本地会话中两个 0530 项目的经验：

- `/Users/isduanna/Documents/0530`：8 条会话，主要围绕多人协作、3D 迷宫、Web AR 追逐、小步/踏步识别、局域网 HTTPS。
- `/Users/isduanna/Documents/0530-world-render-demo`：13 条会话，主要围绕夜晚森林、山洞火把、岩石/洞穴材质、PBR 贴图适配、像素森林、轻量 GLB 森林。

范围说明：本总结只提炼 Codex 会话经验，不包含其他 `0530-*` 派生目录；当前“总结聊天”线程只用于确认范围，不作为技术经验主体。为避免泄漏隐私和无关噪音，文档不复刻完整聊天原文、临时素材路径或运行日志。

## 一句话结论

这批项目最有价值的经验不是某个单点技术，而是一套“快速原型 + 移动端真实验证 + 严格协作分支”的工作方法：先把可玩的最小场景跑起来，再用手机、局域网 HTTPS、截图、构建和 PR 描述把它变成可交付的 demo。

## 项目脉络

### `/Users/isduanna/Documents/0530`

这个项目从协作骨架开始，逐步长出多个 demo 分支：

- `main`：协作规则、GitHub Actions、PR 模板、`AGENTS.md`。
- `codex/3d-maze-demo`：3D 迷宫，本地原理验证，React + R3F + Rapier。
- `feature/web-ar-chase-demo`：手机 Web AR 追逐游戏，摄像头背景 + Three.js 追逐者。
- `feature/step-vs-shuffle-demo`：小步和拖步识别 demo，偏传感器算法验证。
- `feature/mobile-web-ar-element-sets`：移动端 Web AR 元素集合和局域网调试。
- `feature/mountain-escape-game`：山林/逃跑方向的早期探索。

核心经验：这个仓库像一个“原型孵化器”，主分支要保持轻，业务 demo 放分支或子目录，PR 描述要写清楚验证结果和风险。

### `/Users/isduanna/Documents/0530-world-render-demo`

这个项目更集中在 3D 世界渲染：

- `codex/cave-torch-scene`：夜晚森林 + 山洞 + 火把。
- `codex/apply-cave-texture`：洞穴贴图、岩石材质、PBR 近似、性能审查。
- `codex/first-person-pixel-forest-demo`：像素风第一人称森林前进 demo。
- `codex/lightweight-tree-day-night`：轻量 GLB 树模型、林间小路、白天/夜晚切换。

核心经验：视觉 demo 的难点不是“把东西放进去”，而是资产尺寸、材质质感、移动端性能、碰撞边界、截图验证一起成立。

## 协作经验

### 1. 分支和 worktree 是多人协作的护城河

多条会话反复出现一个模式：仓库里经常同时存在不同 agent、不同 demo、不同分支的工作。最稳妥的流程是：

1. 从最新 `main` 或 `origin/main` 开新分支。
2. 每个任务一个分支，每个 demo 一个 app 子目录。
3. 不在已有脏工作区里硬切分支；有未跟踪文件时，用新 worktree 更安全。
4. 不把别人的 staged/untracked 改动一起提交。
5. PR 里写清楚做了什么、怎么测、剩余风险。

在当前这次总结任务里，也采用了新 worktree：`/Users/isduanna/Documents/0530-world-render-demo-summary`，避免碰到原工作区里的未跟踪 app 和截图。

### 2. 主分支应保持“协作骨架”，不是 demo 大杂烩

早期会话里用户想让多人和多个 agent 同时干活，最后形成的有效结构是：

- `AGENTS.md` 写清楚分支、PR、安全、冲突处理规则。
- `CONTRIBUTING.md` 和 PR 模板把协作口径固定下来。
- 业务 demo 不直接堆到 `main`，而是以 PR 形式进入。
- 大资产、构建输出、缓存和本地证书不要进仓库。

这个规则尤其适合高频试错的 3D/AR demo。没有这个骨架，多 agent 很容易互相覆盖。

### 3. Subagent 适合做只读审查，不适合无边界改代码

洞穴质感优化时，用过多个只读 subagent：

- 洞穴几何质量审查：看 tunnel rings、segments、岩壁凸起、钟乳石和碎石。
- Three.js 材质审查：看 texture、material、lighting、bump/normal 替代方案。
- 性能/验证审查：看几何细分、draw calls、阴影、碰撞、移动端风险。
- 素材映射审查：看 zip 里的图片适合洞壁、洞地、树、雾还是 billboard。

这种方式很有用，因为它把“思考”和“编辑”分开了。复杂视觉问题先让几个只读视角给建议，再由主线程做最小改动，风险明显低。

## 技术经验

### 1. Web 3D/AR 原型优先用 Vite + TypeScript + Three.js

这批 demo 里最稳定的组合是：

- 普通 3D/AR 原型：Vite + TypeScript + Three.js。
- 需要 React 组件化和物理时：React + R3F + Drei + Rapier。
- 需要快速验证移动端：少依赖、少框架、先保证浏览器权限和渲染路径。

Web AR 追逐 demo 明确避开了 WebXR、SLAM、marker、GPS 和第三方 AR SDK。对 iPhone Safari 和 Android Chrome 来说，摄像头背景 + 设备方向 + 加速度特征，比真正 AR 更适合做快速可玩的原型。

### 2. 移动端不是“桌面页面缩小”，必须单独设计输入和权限

移动端会话里反复出现这些坑：

- iOS 的 `DeviceMotionEvent.requestPermission()` 必须由用户手势触发。
- 摄像头、传感器、Wake Lock 都要有明确状态机，不能页面加载时偷偷请求。
- 自签名 HTTPS 会让手机提示证书风险，用户需要知道访问哪个链接、如何继续。
- 手机 Safari/Chrome 可能缓存坏证书页或旧 bundle，需要带 query 参数绕缓存。
- 长按按钮会弹系统菜单，需要禁用 `user-select`、`-webkit-touch-callout`、`contextmenu`、`selectstart`、`dragstart`，关键按钮还要用非 passive touch 事件 `preventDefault()`。

有效做法：把移动端权限流程显式做成 `BOOT -> PERMISSION -> READY -> PLAYING -> CAUGHT` 这类状态机，让用户知道现在卡在哪一步。

### 3. 局域网 HTTPS 是移动端验证的基本设施

多个会话都因为“手机打不开、黑屏、没权限、HTTPS OK 但页面黑”而反复调试。沉淀出的检查顺序是：

1. 开发服务监听 `0.0.0.0`，不要只监听 `localhost`。
2. 给用户一个具体 LAN 地址，例如 `https://192.168.x.x:8443/`。
3. 提供 `/ping` 或 `curl -k -I` 检查服务是否活着。
4. 用 HTTPS，因为摄像头、传感器权限在手机浏览器里常需要安全上下文。
5. 手机端打不开时先确认同一 Wi-Fi、证书信任、缓存和端口。
6. 服务进程可能停掉，先查端口，再重启，而不是盲目改代码。

一句经验：移动端 demo 的第一关不是功能，是“手机真的能打开这个页面”。

### 4. 3D 迷宫要先解决碰撞、方向和校准

3D 迷宫会话里，用户反馈过左右方向反、墙太虚、体感不准。有效修正包括：

- 手机 yaw 映射可能需要反向，必须真机试。
- 启用体感后增加“开始运动校准”，把当前朝向归到迷宫前方。
- 清空步频状态，避免旧传感器数据影响新一局。
- 墙体不能只用线框，实体纹理墙更容易判断碰撞边界。
- 移动端和桌面输入要并存：WASD/鼠标、触控摇杆、体感都要有降级路径。

Rapier 适合做迷宫碰撞原型，但移动端体验仍然取决于校准、UI 提示和方向映射。

### 5. 传感器分类要用“物理硬底线 + 状态机”，不要只靠模型投票

小步/拖步识别 demo 的经验很清楚：

- 先做重力对齐投影，提取方向无关的垂直/水平加速度。
- 用滚动窗特征：峰值、jerk、频率、垂直占比等。
- KNN 或规则分类都可以，但必须加物理硬阈值。
- `踏步` 不能只靠投票，至少要满足 peak、jerk、vertRatio 等基本条件。
- 用 600ms 左右 hysteresis 做状态迟滞，避免单帧抖动。
- 标定数据可以先本地持久化，但生产接口要规划好，不要把算法和 UI/存储绑死。

经验句：传感器 demo 不是“识别出来就行”，而是要防止抖手机作弊、防止状态乱跳、防止不同人手感差异太大。

### 6. 视觉质感往往来自材质和光照，不只是模型数量

山洞和森林渲染里，用户多次反馈“效果不好、岩石质感低”。总结下来，问题通常出在：

- 几何轮廓太平滑，看起来像拱棚，不像天然洞。
- 岩石只有 `color` 和 `roughness`，没有 map、bump、normal 或 vertex color 层次。
- 贴图 repeat 不合适，拉伸或重复感明显。
- 火把/雾/环境光没有配合材质，导致不是太黑就是太平。
- 入口岩石、洞壁、洞地、森林石头用了不同逻辑，视觉不统一。

有效优化方向：

- 提高 tunnel rings/segments，但控制移动端成本。
- 给每个 ring 增加不对称 bulge、宽高缩放、顶部下垂和低频噪声。
- 用 Canvas 生成 noise/bump 作为无新资产时的替代。
- 真实图片只有一张时，也可以近似 PBR：从同图派生 color、roughness、bump/normal 感。
- 给岩石/地面使用 `RepeatWrapping`、`anisotropy`、合适的 `colorSpace`。
- 大量石头/草/树尽量实例化或 billboard，避免每个物体独立材质和阴影。

### 7. PBR 不是必须有全套贴图，但要理解每张图的用途

用户问“只有图片怎么变成 PBR”。经验是：

- 真正 PBR 最好有 albedo、normal、roughness、ao、height 等多张图。
- 只有一张图时，可以先做“伪 PBR”：把图片作为 albedo，再用 Canvas/灰度派生 bump 或 roughness。
- 图片不一定适合做无缝材质；透明 PNG 更适合做 billboard、洞口贴片、植被、雾层。
- 洞壁、洞地、入口岩石、森林地面、树皮、草丛、雾和背景要分配不同贴图，不要“都贴上去看看”。
- repeat 值太高会产生花纹，太低会糊；要在桌面和手机截图里检查。

经验句：PBR 的目标不是“参数都填满”，而是让光照、粗糙度、凹凸和几何形状互相说同一种语言。

### 8. GLB 资产要看尺寸、加载和语义，不是越精细越好

轻量树模型会话里，最关键的选择是放弃两个大 GLB，换成约 1.1MB 的树模型。

经验：

- 大 GLB 会拖慢加载、推高仓库体积，也让移动端更脆弱。
- 单个轻量树模型可以通过复制、缩放、旋转、路径布局做出树林感。
- 用“林间小路 + 两侧树林 + 草 + 石头 + 雾 + 昼夜光照”比堆很多大模型更有效。
- 夜晚模式要检查是否出现大色块、曝光问题、UI 不可读。
- PR 里要明确旧方案被新方案替代，关闭旧 PR 并链接新 PR。

## 验证经验

### 1. 每个 demo 至少要跑三类验证

建议固定成最小验证清单：

- 静态验证：`npm run typecheck`、`npm run test`。
- 构建验证：`npm run build`。
- 真实浏览器验证：桌面截图、移动视口截图、控制台无 error/warn。

Three.js 项目里 Vite 可能出现 chunk size warning，这不一定是失败，但 PR 里要说明它是 Three/Rapier 大包的预期提示，还是新改动引入的异常。

### 2. Playwright 截图比“我感觉能跑”可靠

多个会话里用 Playwright 做过：

- 打开本地 dev server。
- 检查 canvas 尺寸和非空渲染。
- 截桌面和手机尺寸图。
- 检查控制台 error/warn。
- 验证白天/夜晚切换。

经验：视觉 demo 必须留下截图证据，尤其是用户说黑屏、白屏、进不去时。

### 3. 黑屏调试先查路径和权限，再怀疑渲染

黑屏/白屏常见原因：

- 服务没启动或端口换了。
- 手机访问的是旧 URL、旧证书或旧缓存。
- HTTPS 没配好，权限请求被浏览器拦了。
- 资源路径在 dev 和 build 下不一致。
- JS bundle 没加载，或 canvas 渲染但被 CSS 遮住。
- 摄像头/传感器未授权，状态机卡在等待态。

调试顺序应该是：`curl`/`/ping` -> HTML 是否有新 bundle -> 控制台 -> 权限状态 -> canvas 像素/截图。

## 产品和体验经验

### 1. 用户要的是“能打开能玩”，不是技术解释

会话里用户经常直接说：

- “本地部署一下”
- “打开？告诉我链接”
- “进不去网内 https”
- “还是黑屏”
- “效果还是不好”
- “你可以直接做？”

这类场景里，最有用的回复不是解释架构，而是：

- 给具体链接。
- 说明服务是否还在跑。
- 说明刚才改了什么。
- 说明已经用什么验证过。
- 如果 GitHub 推不上，明确说本地已完成、远端未更新、原因是什么。

### 2. 视觉原型要敢于快速换技术栈

像素森林会话里，用户问过 Godot、PlayCanvas、Web 引擎。经验是：

- 如果需求是浏览器里跑，优先考虑 Web 原生可控方案。
- PlayCanvas、Three.js、R3F 都可以，但要看交付目标。
- 对“第一人称一直前进的像素风场景”，可以先用代码生成视觉和运动，不必一开始引入完整游戏引擎。
- 技术栈选择要围绕“能不能快速看到画面、能不能手机跑、能不能继续迭代”。

### 3. “真实感”来自组合，不来自单个资产

夜晚森林、山洞、白天/夜晚 GLB 森林都说明：

- 小路提供方向感。
- 树木/石头/草提供空间层次。
- 雾和光照提供氛围。
- 碰撞边界提供可信交互。
- 昼夜切换提供对比。
- 音效、火把、粒子、远处轮廓可以加强沉浸，但不能替代基础构图。

做 3D 世界时，先把“空间可读性”做出来，再追求真实材质。

## 可复用流程模板

### 新建 3D/AR demo

1. 从最新 `main` 新建分支，必要时用独立 worktree。
2. 新增 `apps/<demo-name>/`，不要污染主分支根目录。
3. 先写一个最小可运行场景：canvas、相机、灯光、输入、状态 UI。
4. 如果涉及手机权限，先做权限状态机，再做玩法。
5. 用 LAN HTTP/HTTPS 跑起来，给用户明确链接。
6. 用桌面和手机视口截图验证。
7. 跑 typecheck/test/build。
8. commit、push、开 PR，PR 写清楚测试和风险。

### 优化 3D 视觉质感

1. 先判断是几何问题、材质问题、灯光问题、贴图问题还是性能问题。
2. 只读审查可以拆成几何、材质、性能、资产映射四个方向。
3. 有贴图时先做正确映射和 repeat，不要一股脑全贴。
4. 没贴图时用 Canvas noise、vertex colors、bump 近似。
5. 大量重复物体优先实例化或 billboard。
6. 每次优化后都用截图对比，不只看代码。

### 调试移动端打不开

1. 查服务是否监听 `0.0.0.0`。
2. 查端口是否还活着。
3. 用 `curl -k -I` 或 `/ping` 验证。
4. 给手机一个带版本参数的新 URL。
5. 检查 HTTPS 证书、同一 Wi-Fi、浏览器缓存。
6. 查控制台和权限状态。
7. 最后才改业务逻辑。

## 不要踩的坑

- 不要直接在 `main` 上开发 demo。
- 不要把大 GLB、构建输出、缓存、真实证书和临时截图随手提交。
- 不要在有别人未跟踪文件的工作区里强行切分支。
- 不要只用桌面 Chrome 判断移动端 AR/传感器体验。
- 不要把 iOS 传感器权限当成普通 API 调用。
- 不要让 UI 按钮在手机上触发长按菜单。
- 不要以为有一张图片就等于有完整 PBR。
- 不要把每个小石头都做独立 Mesh、独立材质、独立阴影。
- 不要看到 Vite chunk warning 就误判失败，也不要完全忽略它。
- 不要只说“服务启动了”，要给可访问链接和验证结果。

## 会话索引

### `/Users/isduanna/Documents/0530`

| 时间 | 会话 | 分支 | 主题 |
|---|---|---|---|
| 2026-05-30 08:17 | `019e77f5-e937-7e40-a201-96c840692f4a` | `feature/mountain-escape-game` | 多人协作、GitHub、AGENTS、分支技术栈梳理 |
| 2026-05-30 09:18 | `019e782d-66af-7f73-bd8f-2b316514bad8` | `feature/web-ar-chase-demo` | 3D 迷宫 demo、局域网、移动端体感校准 |
| 2026-05-30 09:41 | `019e7842-84e5-7573-a751-d4300da343fa` | `feature/mountain-escape-game` | Web AR 追逐 demo、摄像头背景、移动端长按菜单修复 |
| 2026-05-30 11:18 | `019e789b-214d-78f1-b1ff-1eda2bbcd3f3` | `feature/step-vs-shuffle-demo` | 小步/踏步识别 staged 内容审查 |
| 2026-05-30 11:18 | `019e789b-cb71-7910-a4cd-2c487fb44254` | `feature/web-ar-chase-demo` | 小步识别局域网 HTTPS、黑屏/证书/服务调试 |
| 2026-05-30 13:02 | `019e78fa-2f2b-7a53-ac44-a311c9df1b58` | `feature/web-ar-chase-demo` | 世界渲染、夜晚森林、山洞火把、HTTPS |
| 2026-05-30 16:49 | `019e79ca-6b1e-7123-a4f5-62a95110e82a` | `feature/mountain-escape-game` | 山林/逃跑方向补充迭代 |
| 2026-05-30 20:08 | `019e7a80-6b11-7983-a34d-0334c0cdb55d` | `feature/mobile-web-ar-element-sets` | 移动 Web AR 元素、局域网验证 |

### `/Users/isduanna/Documents/0530-world-render-demo`

| 时间 | 会话 | 分支 | 主题 |
|---|---|---|---|
| 2026-05-30 15:58 | `019e799b-508e-7111-b0dc-4c3edba8378c` | `codex/cave-torch-scene` | 山洞火把、服务启动、碰撞边界、PR 更新 |
| 2026-05-30 16:47 | `019e79c8-4b3c-7721-a75e-e34dd1bf9722` | `codex/cave-torch-scene` | 岩石明暗贴图需求，中途中断 |
| 2026-05-30 16:48 | `019e79c9-9168-7223-906d-7961b51373e2` | `codex/apply-cave-texture` | 洞穴贴图资产识别和初步适配 |
| 2026-05-30 16:59 | `019e79d3-56f3-78d3-8781-b55f4b853c4f` | `codex/apply-cave-texture` | 洞穴贴图、PBR 材质、资产包接入、效果优化 |
| 2026-05-30 20:20 | `019e7a8b-473d-7422-87bd-85b23cfa6694` | `codex/apply-cave-texture` | 洞穴几何质量只读审查 |
| 2026-05-30 20:20 | `019e7a8b-799c-7013-a9c2-de279a5767e2` | `codex/apply-cave-texture` | Three.js 材质/贴图只读审查 |
| 2026-05-30 20:20 | `019e7a8b-a696-79e2-95bc-961cafcd1fd7` | `codex/apply-cave-texture` | 性能/交互/测试风险只读审查 |
| 2026-05-30 20:36 | `019e7a9a-9f6a-7410-8107-14a459a9a3a8` | `codex/apply-cave-texture` | 继续 PBR 和贴图资产优化，PR 更新，关闭本地服务 |
| 2026-05-30 20:37 | `019e7a9b-9d87-7b71-90e3-c8276cc651df` | `codex/apply-cave-texture` | 贴图 zip 素材映射只读分析 |
| 2026-05-30 20:38 | `019e7a9b-b571-7003-a372-de9a3c9ae498` | `codex/apply-cave-texture` | 当前材质入口和最小改动方案只读分析 |
| 2026-05-30 22:22 | `019e7afb-3421-7d52-9720-f0964f5a4f3c` | `codex/first-person-pixel-forest-demo` | 第一人称像素森林、PlayCanvas/技术栈探索 |
| 2026-05-30 22:55 | `019e7b19-2f36-70d0-93f1-2bd475bda30a` | `codex/lightweight-tree-day-night` | 轻量 GLB 树、林间小路、昼夜切换、PR #10 |
| 2026-06-08 02:44 | `019ea51e-7470-7ca1-9902-06ae1376cd6e` | `codex/lightweight-tree-day-night` | 当前总结线程，确认范围和生成本文档 |
