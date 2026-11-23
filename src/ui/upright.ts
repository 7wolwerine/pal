/** A phone held upright: wide pictures come out small, so some scenes lay themselves out differently. */
export const UPRIGHT_QUERY = '(orientation: portrait) and (max-width: 600px)';

export function isUpright(): boolean {
  return window.matchMedia(UPRIGHT_QUERY).matches;
}
