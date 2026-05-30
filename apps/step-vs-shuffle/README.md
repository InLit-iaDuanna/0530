# Step vs Shuffle

手机网页 demo：实时区分「**踏步 / 跑**」「**小步移动 / 抖手机**」「**静止**」。

只用浏览器自带的 `DeviceMotionEvent`（加速度 + 陀螺仪），不联网、不依赖摄像头、不依赖云端模型。

## 思路

阈值规则跨用户、跨持机方式不准。这个 demo 的做法：

1. **方向不变特征**：把加速度投影到重力方向，得到与手机朝向无关的「垂直分量 / 水平分量」。
2. **2.56 秒滑窗 × 12 维特征**：peakVert / rmsVert / vertJerkPeak / dominantFreq / vertRatio …
3. **每用户 30 秒标定**：3 段 × 5 秒（静止 / 小步 / 踏步），系统学习这台手机 + 这个人的特征。
4. **物理硬底线 + KNN 投票**：踏步必须满足 `peakVert ≥ 2.5 ∧ vertJerk ≥ 30 ∧ vertRatio ≥ 0.9`，光抖动手机绕不过去。
5. **状态机 600 ms hysteresis**：单帧抖动不会切状态。

## 运行

```bash
cd apps/step-vs-shuffle
npm install
npm run dev
```

Vite 默认监听 `0.0.0.0:5173`。

### 在手机上打开

`devicemotion` 在 iOS Safari 必须是 **HTTPS** 才能拿到权限。两种简便方式：

**方法 A — ngrok（推荐）**
```bash
npx ngrok http 5173
```
把 ngrok 给你的 `https://xxx.ngrok.io` 在手机浏览器打开。

**方法 B — 本机自签 + iOS「信任此证书」**
用 `mkcert` 生成本机证书，配 `vite.config.ts` 的 `server.https`，手机要装并信任根证书。

打开页面 → 点「开始标定」→ Safari 弹运动权限 → 同意 → 跟着提示做 3 段 5 秒动作 → 进入实时识别页。

## 验证

```bash
npm run typecheck   # 类型
npm test            # 单元测试 (extractor + classifier)
npm run build       # 生产构建
```

当前包体积：JS ≈ 19 KB（gzip 7.5 KB），远低于「微站点 80 KB」预算。

## 调参

`src/lib/constants.ts` 的 `HARD_RULES` 段是物理硬底线。如果实测发现：

- **小步被误判成 step** → 提高 `stepPeakVertMin`（2.5 → 3.0）
- **慢踏步被误判成 shuffle** → 降低 `stepPeakVertMin`（2.5 → 2.0）
- **静止被误判成 shuffle** → 提高 `idleRmsMax`（0.12 → 0.18）

实时页面下方的特征值面板，超过硬阈值的格子会变红，方便现场调。

## 验证标准

在 iPhone 真机上：

- 静止放桌 5 s → 持续 `idle`，不触发 `shuffle`。
- 手持原地小幅抖动 / 拖步 5 s → 持续 `shuffle`，**不会**误升到 `step`。
- 原地踏步 3 s → ≤ 800 ms 切到 `step`，停下后 ≤ 800 ms 回落。

## 已知限制

- 仅前台运行：iOS / Android 锁屏或切后台后停止采样。
- 兜里 / 手持 / 桌上三种姿态下重力方向不同，但因为做了重力对齐投影，识别本身不受影响；标定建议用「实际场景」做。
- 没用 FFT 库（手撸的 Goertzel 风格），50 Hz 采样、12 个频点已足够 demo 用；如需更准的频域特征可换 `fft.js`。
