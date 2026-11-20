import { prefersReducedMotion } from './dom.ts';

/**
 * PAL's window has a fixed height and shows no scrollbar. Scenes are made to
 * fit it, but if something still does not (a long line on a small phone),
 * the window glides by itself to what just appeared — the newest thing on the
 * stage, or the field being typed in — so the player never has to scroll.
 */
export function keepInView(body: HTMLElement, stage: HTMLElement): () => void {
  let frame = 0;
  const glide = (): void => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (body.scrollHeight <= body.clientHeight + 1) {
        if (body.scrollTop !== 0) body.scrollTo({ top: 0 });
        return;
      }
      const active = document.activeElement;
      const target = active instanceof HTMLElement && body.contains(active) && active !== body ? active : stage.lastElementChild;
      if (!(target instanceof HTMLElement)) return;
      const box = body.getBoundingClientRect();
      const it = target.getBoundingClientRect();
      const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';
      // Below the window: bring its bottom up. Above it: bring its top down.
      if (it.bottom > box.bottom - 4) body.scrollBy({ top: it.bottom - box.bottom + 12, behavior });
      else if (it.top < box.top + 4) body.scrollBy({ top: it.top - box.top - 12, behavior });
    });
  };
  const watch = new MutationObserver(glide);
  watch.observe(stage, { childList: true, subtree: true });
  body.addEventListener('focusin', glide);
  window.addEventListener('resize', glide);
  return () => {
    watch.disconnect();
    body.removeEventListener('focusin', glide);
    window.removeEventListener('resize', glide);
    cancelAnimationFrame(frame);
  };
}
