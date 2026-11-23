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
      // A field being typed in brings its whole form: the answers under it stay in view too.
      const form = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement ? active.form : null;
      const focused = active instanceof HTMLElement && body.contains(active) && active !== body ? active : null;
      const target = form && body.contains(form) && form.offsetHeight <= body.clientHeight ? form : (focused ?? stage.lastElementChild);
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
  // PAL's bubble growing as a line is typed pushes the stage down: glide after that too.
  const sizes = new ResizeObserver(glide);
  for (const child of body.children) sizes.observe(child);
  body.addEventListener('focusin', glide);
  window.addEventListener('resize', glide);
  return () => {
    watch.disconnect();
    sizes.disconnect();
    body.removeEventListener('focusin', glide);
    window.removeEventListener('resize', glide);
    cancelAnimationFrame(frame);
  };
}
