import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';

export interface KeyboardControlsEntry<T extends string = string> {
  readonly name: T;
  readonly keys: readonly string[];
}

export type KeyboardState<T extends string = string> = Record<T, boolean>;
export type GetKeyboardState<T extends string = string> = () => KeyboardState<T>;

const KeyboardContext = createContext<GetKeyboardState<string> | null>(null);

interface KeyboardControlsProps<T extends string> {
  readonly map: readonly KeyboardControlsEntry<T>[];
  readonly children: ReactNode;
}

export const KeyboardControls = <T extends string>({
  map,
  children,
}: KeyboardControlsProps<T>): JSX.Element => {
  const stateRef = useRef<KeyboardState<T>>({} as KeyboardState<T>);
  const keyLookup = useMemo(() => {
    const lookup = new Map<string, T>();

    map.forEach((entry) => {
      entry.keys.forEach((key) => lookup.set(key, entry.name));
      stateRef.current[entry.name] = false;
    });

    return lookup;
  }, [map]);

  useEffect(() => {
    const setKey = (event: KeyboardEvent, pressed: boolean): void => {
      const control = keyLookup.get(event.code);

      if (!control) {
        return;
      }

      event.preventDefault();
      stateRef.current[control] = pressed;
    };

    const handleKeyDown = (event: KeyboardEvent): void => setKey(event, true);
    const handleKeyUp = (event: KeyboardEvent): void => setKey(event, false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [keyLookup]);

  const getState = useMemo<GetKeyboardState<T>>(() => () => stateRef.current, []);

  return (
    <KeyboardContext.Provider value={getState as GetKeyboardState<string>}>
      {children}
    </KeyboardContext.Provider>
  );
};

export const useKeyboardControls = <T extends string>(): GetKeyboardState<T> => {
  const getState = useContext(KeyboardContext);

  if (!getState) {
    throw new Error('useKeyboardControls must be used inside KeyboardControls.');
  }

  return getState as GetKeyboardState<T>;
};