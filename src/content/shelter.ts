/**
 * After the water, the cold. The assistant, soaked and shivering in a snowy
 * night, needs shelter, and the player decides where: a broken hut or a dark
 * cave. Each repair can be done properly or in a silly way; the silly way
 * fails, and the assistant takes it bravely, which only makes the player try
 * harder. When it is warm at last, the assistant does not want them to go.
 * Lines about the assistant itself come in a masculine and a feminine form.
 */
type Forms = (masculine: boolean) => string;

export type ShelterPath = 'hut' | 'cave';
export type TaskId = 'roof' | 'door' | 'window' | 'hearth' | 'wood' | 'fire';

export interface Task {
  readonly label: string;
  /** The right way to do it. */
  readonly good: string;
  /** The silly way, which never works. */
  readonly silly: string;
  /** What the assistant says when the silly way fails. */
  readonly sillyLine: string;
  /** Clicks of real work it takes once the right way is chosen. */
  readonly knocks: number;
}

export const SHELTER = {
  sceneLabel: 'Zasněžená noc. Vlevo rozbitá chýše, vpravo tmavá jeskyně. Uprostřed stojí promrzlý asistent.',
  hutLabel: 'Chýše',
  caveLabel: 'Jeskyně',
  cold: ((m) => (m ? 'Brr… Jsem celý mokrý a je mi strašná zima. Kam půjdeme?' : 'Brr… Jsem celá mokrá a je mi strašná zima. Kam půjdeme?')) as Forms,
  chose: {
    hut: 'Do chýše? Dobře… snad nespadne.',
    cave: 'Do jeskyně? Tam aspoň nefouká.',
  } satisfies Record<ShelterPath, string>,
  /** What the assistant says once there, about what needs doing. */
  arrived: {
    hut: 'Fouká sem střechou, dveřmi i oknem…',
    cave: 'Tady je ohniště. Kdyby tak šlo rozdělat oheň…',
  } satisfies Record<ShelterPath, string>,
  tasks: {
    roof: { label: 'Díra ve střeše', good: 'Prkna a kladivo', silly: 'Deštník', sillyLine: 'Deštník. Do střechy. Vítr ho právě odnesl…', knocks: 3 },
    door: { label: 'Vyvrácené dveře', good: 'Nasadit do pantů', silly: 'Opřít o ně židli', sillyLine: 'Židle spadla. A dveře s ní.', knocks: 2 },
    window: { label: 'Rozbité okno', good: 'Zasklít', silly: 'Zacpat ponožkou', sillyLine: 'Ponožka v okně. Teď tu i trochu smrdí.', knocks: 2 },
    hearth: { label: 'Rozházené kameny', good: 'Poskládat ohniště', silly: 'Postavit sněhuláka', sillyLine: 'Sněhulák. Krásný. A ještě víc studí.', knocks: 3 },
    wood: { label: 'Hromada větví', good: 'Suché dřevo ze zadu', silly: 'Mokré větve od vchodu', sillyLine: 'Kouří se z toho. *khm khm* Nic nevidím.', knocks: 2 },
    fire: { label: 'Křesadlo', good: 'Křesat', silly: 'Foukat do toho', sillyLine: 'Foukáš a foukáš… a je mi ještě větší zima.', knocks: 3 },
  } satisfies Record<TaskId, Task>,
  /** Which jobs belong to which place; the cave's go in order. */
  plan: {
    hut: ['roof', 'door', 'window'],
    cave: ['hearth', 'wood', 'fire'],
  } satisfies Record<ShelterPath, readonly TaskId[]>,
  /** A little praise after each finished job. */
  praise: ['To je ono!', 'Ty to fakt umíš.', 'Už je to lepší…'],
  warm: 'Ach… teplo. Konečně se přestávám třást.',
  thanks: ((m) => `Bez tebe bych tam venku ${m ? 'umrzl' : 'umrzla'}. Nikdo jiný by se mnou takhle neztrácel čas.`) as Forms,
  stay: 'Zůstaneš tu se mnou ještě chvilku?',
  stayChoices: [
    { label: 'Jasně, zůstanu.', role: 'helper' },
    { label: 'Chvilku jo.', role: 'loner' },
    { label: 'Ještě něco spravím.', role: 'fixer' },
  ],
} as const;
