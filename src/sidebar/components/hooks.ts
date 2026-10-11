import type { RefObject } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

const COUNTDOWN_TICK_MS = 1000;
const SCROLLED_UP_THRESHOLD_PX = 80;

export function useFrameValue<T>(value: T): T {
  const [shown, setShown] = useState(value);
  const latest = useRef(value);
  const frame = useRef<number | null>(null);
  latest.current = value;

  useEffect(() => {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      setShown(latest.current);
    });
  }, [value]);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );
  return shown;
}

export function useScrolledUp(): { ref: RefObject<HTMLDivElement | null>; scrolledUp: boolean; scrollToBottom: () => void } {
  const ref = useRef<HTMLDivElement>(null);
  const [scrolledUp, setScrolledUp] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () =>
      setScrolledUp(element.scrollHeight - element.scrollTop - element.clientHeight > SCROLLED_UP_THRESHOLD_PX);
    element.addEventListener("scroll", update);
    return () => element.removeEventListener("scroll", update);
  }, []);
  const scrollToBottom = () => ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  return { ref, scrolledUp, scrollToBottom };
}

export function useCountdown(seconds: number | null): number {
  const [remaining, setRemaining] = useState(seconds ?? 0);
  useEffect(() => {
    setRemaining(seconds ?? 0);
    if (!seconds) return;
    const timer = setInterval(() => setRemaining((current) => Math.max(0, current - 1)), COUNTDOWN_TICK_MS);
    return () => clearInterval(timer);
  }, [seconds]);
  return remaining;
}
