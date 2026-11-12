/**
 * What any web page can read about the device it runs on, without asking.
 * Collected locally, shown only to the player at the end, never sent anywhere.
 */

export interface DeviceFact {
  readonly label: string;
  readonly value: string;
}

type NavigatorExtras = Navigator & {
  deviceMemory?: number;
  userAgentData?: { platform?: string; mobile?: boolean; brands?: { brand: string; version: string }[] };
};

export function collectDevice(win: Window = window): DeviceFact[] {
  const nav = win.navigator as NavigatorExtras;
  const facts: DeviceFact[] = [];
  const add = (label: string, value: unknown): void => {
    if (value === undefined || value === null || value === '') return;
    facts.push({ label, value: String(value) });
  };

  const brands = nav.userAgentData?.brands?.filter((b) => !/not.?a.?brand/i.test(b.brand));
  add('Prohlížeč', brands?.length ? brands.map((b) => `${b.brand} ${b.version}`).join(', ') : nav.userAgent);
  add('Systém', nav.userAgentData?.platform || nav.platform);
  add('Mobil', nav.userAgentData?.mobile === undefined ? undefined : nav.userAgentData.mobile ? 'ano' : 'ne');
  add('Jazyky', (nav.languages?.length ? nav.languages : [nav.language]).join(', '));
  try {
    add('Časové pásmo', Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    // ignore
  }
  add('Místní čas', new Date().toLocaleString('cs-CZ'));
  add('Obrazovka', `${win.screen.width} × ${win.screen.height} px, hustota ${win.devicePixelRatio}`);
  add('Okno', `${win.innerWidth} × ${win.innerHeight} px`);
  add('Jádra procesoru', nav.hardwareConcurrency);
  add('Paměť (přibližně)', nav.deviceMemory ? `${nav.deviceMemory} GB` : undefined);
  add('Dotyková obrazovka', nav.maxTouchPoints > 0 ? `ano (${nav.maxTouchPoints} doteky)` : 'ne');
  add('Tmavý režim', win.matchMedia('(prefers-color-scheme: dark)').matches ? 'ano' : 'ne');
  add('Omezení animací', win.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'ano' : 'ne');
  add('Cookies povolené', nav.cookieEnabled ? 'ano' : 'ne');
  return facts;
}
