import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { openLibrary } from "../library";
import type { Library } from "../library";

export function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export type LibraryState = { library: Library | null; error: boolean };

export function useOpenLibrary(): LibraryState {
  const [state, setState] = useState<LibraryState>({ library: null, error: false });
  useEffect(() => {
    openLibrary().then(
      (library) => setState({ library, error: false }),
      () => setState({ library: null, error: true }),
    );
  }, []);
  return state;
}

/** Loads data, reloading when the library changes and ignoring results made stale by newer loads. */
export function useLibraryData<T>(library: Library, load: (library: Library) => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [revision, setRevision] = useState(0);
  const latest = useRef(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => library.onChange(reload), [library, reload]);
  useEffect(() => {
    const ticket = ++latest.current;
    load(library).then((result) => ticket === latest.current && setData(result));
  }, [library, revision, ...deps]);

  return { data, reload };
}

export function useSelection() {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const toggle = useCallback(
    (id: string) =>
      setSelected((current) => {
        const next = new Set(current);
        if (!next.delete(id)) next.add(id);
        return next;
      }),
    [],
  );
  const clear = useCallback(() => setSelected(new Set()), []);
  return { selected, toggle, clear };
}
