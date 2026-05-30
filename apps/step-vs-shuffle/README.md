# Small Walk vs Other

手机网页 demo：手持手机实时识别「**小步走**」和「**其他**」。

核心信号来自浏览器 `DeviceMotionEvent`（加速度 + 陀螺仪）。如果运行在 iOS 原生壳里，可通过 `window.healthBridge` 接入 HealthKit 步数增量作为辅助校验；纯 Safari/Web 不直接读取运动健康数据。

## 思路

1. **重力对齐投影**：把加速度投影为水平/垂直分量，降低手机朝向影响。
2. **2.56 秒滑窗特征**：包含能量、主频、谱熵、jerk、陀螺仪比例和 cadence drift。
3. **三段标定**：静止 5 秒、小步走 8 秒、手动伪造 8 秒；静止和手动伪造都训练为 `other`。
4. **IMU 门控 + KNN**：小步走必须满足稳定 cadence、水平/垂直能量区间、低谱熵和低手部旋转伪造特征。
5. **状态机防抖**：`smallWalk` 需要约 1.2 秒连续成立才提交，回落到 `other` 更快。

## HealthKit bridge

iOS 原生壳如需接入 HealthKit，向 WebView 注入：

```ts
window.healthBridge = {
  async getStepDelta(startMs: number, endMs: number) {
    return { steps: 2, available: true };
  },
};
```

Web 端只把 HealthKit 当辅助信号：

- `smallWalk` 且近 6 秒步数有增长 → 提高置信度，source 变为 `healthkit-assisted`。
- `smallWalk` 但 HealthKit 可用且无步数增长 → 降低置信度，但不直接否决。
- 无 bridge 或授权失败 → 降级为 IMU-only，并在 UI 显示 HealthKit 未接入。

## 运行

```bash
cd apps/step-vs-shuffle
npm install
npm run dev
```

Vite 默认监听 `0.0.0.0:5173`。iOS Safari 获取 `devicemotion` 权限需要 HTTPS。

## 验证

```bash
npm run typecheck
npm test
npm run build
```

## 调参

主要阈值在 `src/lib/constants.ts` 的 `IMU_RULES`：

- 小步走漏判偏多：放宽 `smallWalkRmsMin`、`smallWalkVertRatioMax` 或 `spectralEntropyMax`。
- 晃手机误判偏多：收紧 `handGyroPeakMax`、`handGyroAccelRatioMax` 或 `singleAxisVertRatioMin`。
- 切换太慢/太快：调整 `SMALL_WALK_HOLD_MS` 和 `OTHER_HOLD_MS`。

## 真机验证标准

- 手持静止 5 秒 → 稳定 `other`。
- 手持自然小步走 10 秒 → 约 1-2 秒内切到 `smallWalk`。
- 原地上下摆、左右晃、画圈或快速旋转手机 → 稳定 `other`。
- iOS 壳接入 HealthKit 后，步数增量只影响置信度，不会绕过 IMU 门控。

## 已知限制

- 手持场景无法证明用户真的在走，只能提高伪造成本。
- HealthKit 需要 iOS 原生 App 授权；纯网页不能读取运动健康数据。
- iOS / Android 锁屏或切后台后会停止网页采样。
