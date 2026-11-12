import { ANOMALY_TEXT } from '../content/anomalies.ts';
import type { Witness } from '../core/witness.ts';
import { h } from './dom.ts';

export interface AnomalySpec {
  /** Id from ANOMALIES, recorded when the player catches it. */
  readonly what: string;
  readonly scene: string;
  /** What shows for a moment; empty for a pure shape styled by className. */
  readonly text?: string;
  readonly className?: string;
  /** CSS position inside the host. */
  readonly place: Partial<Record<'left' | 'right' | 'top' | 'bottom' | 'width' | 'height', string>>;
  /** Delay before it shows, and how long it stays. */
  readonly after: number;
  readonly ms: number;
}

/**
 * Shows a small inconsistency inside `host` for a moment. It does not look
 * clickable and nothing says it is — but it is, and catching it is recorded
 * as vigilance. Returns a cancel function for scene cleanup.
 */
export function anomaly(witness: Witness, host: HTMLElement, spec: AnomalySpec): () => void {
  let el: HTMLButtonElement | null = null;
  let hideTimer = 0;
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  const showTimer = window.setTimeout(() => {
    el = h('button', {
      class: `anomaly${spec.className ? ` ${spec.className}` : ''}`,
      text: spec.text ?? '',
      attrs: { type: 'button', 'aria-label': ANOMALY_TEXT.label },
    });
    Object.assign(el.style, spec.place);
    el.addEventListener('click', () => {
      if (!el || el.classList.contains('anomaly--caught')) return;
      witness.record({ scene: spec.scene, kind: 'vigilance', data: { what: spec.what } });
      el.classList.add('anomaly--caught');
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => el?.remove(), 600);
    });
    host.append(el);
    hideTimer = window.setTimeout(() => el?.remove(), spec.ms);
  }, spec.after);
  return () => {
    window.clearTimeout(showTimer);
    window.clearTimeout(hideTimer);
    el?.remove();
  };
}
