import { useEffect, useRef } from 'react';
import { GameState } from '../app/App';
import { SensorControlStatus } from '../player/usePlayerInput';

interface HudProps {
  readonly gameState: GameState;
  readonly onRestart: () => void;
  readonly isSensorMode: boolean;
  readonly sensorStatus: SensorControlStatus;
  readonly cadenceSpm: number;
  readonly forwardSpeed: number;
  readonly isSensorCalibrated: boolean;
  readonly onEnableSensors: () => void;
  readonly onRecalibrateSensors: () => void;
}

const formatElapsed = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const Hud = ({
  gameState,
  onRestart,
  isSensorMode,
  sensorStatus,
  cadenceSpm,
  forwardSpeed,
  isSensorCalibrated,
  onEnableSensors,
  onRecalibrateSensors,
}: HudProps): JSX.Element => {
  const restartButtonRef = useRef<HTMLButtonElement>(null);
  const isWon = gameState.kind === 'won';
  const elapsed =
    gameState.kind === 'won'
      ? formatElapsed(gameState.finishedAt - gameState.startedAt)
      : null;

  useEffect(() => {
    if (isWon) {
      restartButtonRef.current?.focus();
    }
  }, [isWon]);

  return (
    <div className="hud">
      <button className="hud__button" type="button" onClick={onRestart}>
        重开
      </button>
      {isSensorMode ? (
        <section className="hud__sensor" aria-live="polite">
          <p className="hud__sensor-readout">
            步频 {Math.round(cadenceSpm)} spm · 速度 {forwardSpeed.toFixed(1)} m/s
          </p>
          {sensorStatus === 'active' ? (
            <>
              <p className="hud__sensor-status">
                {isSensorCalibrated
                  ? '已校准。转动手机同步方向，原地踏步前进。'
                  : '面向迷宫前方，点击开始运动校准。'}
              </p>
              <button
                className="hud__button hud__button--compact"
                type="button"
                onClick={onRecalibrateSensors}
              >
                {isSensorCalibrated ? '重新校准方向' : '开始运动校准'}
              </button>
            </>
          ) : (
            <>
              <p className="hud__sensor-status">{readSensorStatus(sensorStatus)}</p>
              <button
                className="hud__button hud__button--primary hud__button--compact"
                type="button"
                onClick={onEnableSensors}
                disabled={sensorStatus === 'requesting' || sensorStatus === 'unsupported' || sensorStatus === 'insecure'}
              >
                {sensorStatus === 'denied' ? '再次请求权限' : '启用体感控制'}
              </button>
            </>
          )}
        </section>
      ) : null}
      {isWon ? (
        <section className="hud__overlay" role="dialog" aria-modal="true" aria-labelledby="win-title">
          <p className="hud__eyebrow">完成</p>
          <h1 id="win-title" className="hud__title">
            已到达出口
          </h1>
          <p className="hud__time">用时 {elapsed}</p>
          <button
            ref={restartButtonRef}
            className="hud__button hud__button--primary"
            type="button"
            onClick={onRestart}
          >
            再来一次
          </button>
        </section>
      ) : null}
    </div>
  );
};

const readSensorStatus = (status: SensorControlStatus): string => {
  if (status === 'insecure') {
    return '体感控制需要 HTTPS，请使用 https 局域网或 tunnel 链接。';
  }

  if (status === 'unsupported') {
    return '当前浏览器不支持运动或方向传感器。';
  }

  if (status === 'denied') {
    return '运动与方向权限被拒绝。';
  }

  if (status === 'requesting') {
    return '正在请求运动与方向权限。';
  }

  return '面向迷宫前方，启用体感后先做运动校准。';
};
