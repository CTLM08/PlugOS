import { useEffect } from 'react';

/**
 * Hook to lock body scroll when a modal/overlay is open
 * Prevents background content from scrolling while modal is visible
 * @param {boolean} enabled - Whether the scroll lock is enabled (default: true)
 */
export default function useBodyScrollLock(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    // Save the original overflow value
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    
    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    // Lock scroll
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    // Cleanup: restore original values when component unmounts or enabled becomes false
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [enabled]);
}
