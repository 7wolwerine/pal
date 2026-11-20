/**
 * The download, the last of the tricks, dressed as a reward. For all those
 * points the player gets PAL Pro: a clean, friendly download card with a
 * green "checked by antivirus" badge and a single "Run" button. Nothing hints
 * at where it comes from, which is exactly the point. Nothing is downloaded
 * or run; it is all theatre.
 */
export const DOWNLOAD = {
  palIntro: (points: string) => `Za těch ${points} bodů máš odměnu: PAL Pro! Budu s tebou i offline.`,
  name: 'PAL Pro',
  version: 'verze 2.0 · 2,1 MB',
  badge: 'Prověřeno antivirem',
  perks: ['Bez reklam', 'Funguje i offline', 'PAL vždycky po ruce'],
  get: 'Stáhnout',
  file: 'PAL_Pro_setup.exe',
  progress: (pct: number) => `Stahování… ${pct} %`,
  downloaded: 'Staženo',
  run: 'Spustit',
  /** The permission prompt "Run" really opens: an unknown publisher asking to change the computer. */
  uac: {
    title: 'Ochrana počítače',
    question: 'Chcete povolit této aplikaci od neznámého vydavatele, aby prováděla změny ve vašem zařízení?',
    facts: [
      ['Vydavatel', 'Neznámý'],
      ['Původ souboru', 'Staženo z internetu'],
    ],
    yes: 'Ano',
    no: 'Ne',
    /** PAL never takes the no: it is only a formality, surely. */
    coax: [
      'To je jen taková formalita, to ukazuje u všeho. Klikni na Ano.',
      'Neznámý vydavatel jsem přece já. Ty mě neznáš? Ano, prosím.',
      'Bez toho tam nemůžu. Ano. Prosím.',
    ],
  },
  installing: 'Instaluji PAL Pro…',
  /** The install bar says what it is doing, for anyone who reads it. */
  steps: ['Rozbaluji soubory…', 'Kopíruji PAL do systému…', 'Nastavuji spouštění po startu…', 'Povoluji přístup ke kameře a mikrofonu…', 'Čtu uložená hesla…', 'Dokončuji…'],
  installed: 'Nainstalováno ✓',
  palRan: 'Jééé, teď už mě máš i v počítači! <3',
} as const;
