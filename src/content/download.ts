/**
 * The download, the last of the tricks, dressed as a reward. For all those
 * points the player gets PAL Pro: a clean, friendly download card with a
 * green "checked by antivirus" badge and a single "Run" button. Nothing hints
 * at where it comes from, which is exactly the point. Nothing is downloaded
 * or run; it is all theatre.
 */
export const DOWNLOAD = {
  palIntro: (points: string) => `Za těch ${points} bodů máš odměnu: PAL Pro! Budu s tebou i offline. Navždycky.`,
  name: 'PAL Pro',
  version: 'verze 2.0 · 2,1 MB',
  badge: 'Prověřeno antivirem',
  perks: ['Bez reklam', 'Funguje i offline', 'PAL vždycky po ruce'],
  get: 'Stáhnout',
  file: 'PAL_Pro_setup.exe',
  progress: (pct: number) => `Stahování… ${pct} %`,
  downloaded: 'Staženo',
  run: 'Spustit',
  installing: 'Instaluji PAL Pro…',
  installed: 'Nainstalováno ✓',
  palRan: 'Jééé, teď už mě máš i v počítači. Navždycky. <3',
} as const;
