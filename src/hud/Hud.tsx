import { useEffect, useRef } from 'react';
import { GameState } from '../app/App';

interface HudProps {
  readonly gameState: GameState;
  readonly onRestart: () => void;
}

const formatElapsed = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const Hud = ({ gameState, onRestart }: HudProps): JSX.Element => {
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