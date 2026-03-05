import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);

export type SplitType = "chars" | "words" | "lines" | "chars,words" | "chars,words,lines" | "words,lines";

export interface UseSplitTextOptions {
  type?: SplitType;
  /** Re-split when this value changes (e.g. window width for responsive layouts) */
  resplitKey?: unknown;
  /** Extra class applied to each line wrapper */
  linesClass?: string;
  /** Extra class applied to each word wrapper */
  wordsClass?: string;
  /** Extra class applied to each char wrapper */
  charsClass?: string;
}

export interface UseSplitTextResult {
  chars: Element[];
  words: Element[];
  lines: Element[];
  /** The underlying SplitText instance (null until mounted) */
  splitInstance: SplitText | null;
  /** True after SplitText has run */
  isReady: boolean;
}

export function useSplitText<T extends HTMLElement = HTMLElement>(
  ref: React.RefObject<T | null>,
  options: UseSplitTextOptions = {}
): UseSplitTextResult {
  const {
    type = "chars,words,lines",
    resplitKey,
    linesClass,
    wordsClass,
    charsClass,
  } = options;

  const splitRef = useRef<SplitText | null>(null);
  const [result, setResult] = useState<UseSplitTextResult>({
    chars: [],
    words: [],
    lines: [],
    splitInstance: null,
    isReady: false,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Revert any previous split before re-splitting
    splitRef.current?.revert();

    splitRef.current = new SplitText(el, {
      type,
      linesClass,
      wordsClass,
      charsClass,
    });

    const instance = splitRef.current;

    // Stamp CSS custom properties on each wrapper for easy CSS/JS targeting
    (instance.chars as HTMLElement[]).forEach((el, i) => el.style.setProperty("--char-index", String(i)));
    (instance.words as HTMLElement[]).forEach((el, i) => el.style.setProperty("--word-index", String(i)));
    (instance.lines as HTMLElement[]).forEach((el, i) => el.style.setProperty("--line-index", String(i)));

    setResult({
      chars: instance.chars as Element[],
      words: instance.words as Element[],
      wwnes: instance.lines as Element[],
      splitInstance: instance,
      isReady: true,
    });

    return () => {
      instance.revert();
    };
  }, [ref, type, linesClass, wordsClass, charsClass, resplitKey]);

  return result;
}
