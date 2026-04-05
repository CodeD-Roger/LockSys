import { useCallback, useRef, useState } from 'react';

/**
 * Clipboard hook that:
 * 1. Writes text to the clipboard
 * 2. Tracks which item was copied (by id)
 * 3. Shows a live countdown timer
 * 4. Automatically clears the clipboard when the timer reaches zero
 *
 * @param clearAfterMs  How long to keep the value in the clipboard (default: 30s)
 */
export function useClipboard(clearAfterMs = 30_000) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAll = useCallback(() => {
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    setCopiedId(null);
    setCountdown(0);
  }, []);

  const copy = useCallback(
    async (text: string, id: string) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // Fallback for browsers that don't support clipboard API
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      // Cancel any in-progress countdown
      clearAll();

      setCopiedId(id);
      const seconds = Math.floor(clearAfterMs / 1000);
      setCountdown(seconds);

      // Tick every second
      tickRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            if (tickRef.current) clearInterval(tickRef.current);
            return 0;
          }
          return c - 1;
        });
      }, 1000);

      // Clear clipboard and reset state
      clearTimerRef.current = setTimeout(async () => {
        try {
          await navigator.clipboard.writeText('');
        } catch { /* ignore */ }
        setCopiedId(null);
        setCountdown(0);
      }, clearAfterMs);
    },
    [clearAfterMs, clearAll],
  );

  return { copiedId, countdown, copy, clearClipboard: clearAll };
}
