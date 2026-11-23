/**
 * After the water, the cold. The assistant, soaked and shivering in a snowy
 * night, needs shelter, and the player decides where: a broken hut or a dark
 * cave. Inside, with the blizzard still raging outside, the place has to be made
 * safe and warm and the assistant needs something dry to wear. Each job can be
 * done properly or in a silly way; the silly way
 * fails, and the assistant takes it bravely, which only makes the player try
 * harder. When it is warm at last, the assistant does not want them to go.
 * Lines about the assistant itself come in a masculine and a feminine form.
 */
import { KINDLY } from '../core/kindly.ts';

type Forms = (masculine: boolean) => string;

export type ShelterPath = 'hut' | 'cave';
/** Inside the hut: the banging door, the cold stove, the old chest. Inside the cave: the open mouth, the fire pit, the backpack. */
export type TaskId = 'door' | 'stove' | 'chest' | 'entrance' | 'fire' | 'fur';

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
  /** Once inside: still cold, still sick, and the blizzard right outside. */
  arrived: {
    hut: 'Uvnitř… ale dveřmi sem pořád fouká sníh. Je mi zle.',
    cave: 'Aspoň tu nesněží na hlavu… ale vchodem to fouká dovnitř. Je mi zle.',
  } satisfies Record<ShelterPath, string>,
  /** Every little while, until it is warm: how bad it is. */
  sick: [
    'Točí se mi hlava… a klepu se.',
    'Hrozně mě studí… úplně všude.',
    'Venku to pořád fouká. Slyšíš to?',
    'Já už skoro necítím prsty…',
    'Prosím, udělej něco. Já už nemůžu.',
  ],
  tasks: {
    door: { label: 'Dveře, co bouchají ve větru', good: 'Zavřít a zapřít trámem', silly: 'Přidržet je nohou', sillyLine: 'Jakmile pustíš, zase se rozletí. A nafouká sem.', knocks: 2 },
    stove: { label: 'Studená kamna', good: 'Zatopit', silly: 'Dýchat do nich', sillyLine: 'Hezká snaha. Kamna jsou pořád ledová.', knocks: 3 },
    chest: { label: 'Stará truhla', good: 'Najít suchý svetr', silly: 'Vlézt do truhly', sillyLine: 'V truhle je sice tma… ale teplo ne.', knocks: 2 },
    entrance: { label: 'Vchod, kudy fouká sníh', good: 'Zatarasit kameny', silly: 'Postavit tam sněhuláka', sillyLine: 'Sněhulák hlídá vchod. A fouká přes něj.', knocks: 3 },
    fire: { label: 'Ohniště', good: 'Rozdělat oheň', silly: 'Foukat do popela', sillyLine: 'Popel všude. A pořád zima.', knocks: 3 },
    fur: { label: 'Batoh v koutě', good: 'Vytáhnout kožešinu', silly: 'Nasadit si batoh na hlavu', sillyLine: 'Batoh na hlavě. Hřeje jak čepice z papíru.', knocks: 2 },
  } satisfies Record<TaskId, Task>,
  /** What each place needs: make it safe, make it warm, find something dry to wear. Any order. */
  plan: {
    hut: ['door', 'stove', 'chest'],
    cave: ['entrance', 'fire', 'fur'],
  } satisfies Record<ShelterPath, readonly TaskId[]>,
  /** A little praise after each finished job. */
  praise: ['To je ono!', 'Ty to fakt umíš.', 'Už je to lepší…'],
  warm: {
    hut: 'Ach… teplo. A suchý svetr. Konečně se přestávám třást.',
    cave: 'Ach… oheň a kožešina. Konečně se přestávám třást.',
  } satisfies Record<ShelterPath, string>,
  /** The blizzard never stops; inside it no longer matters. */
  storm: 'Venku to pořád řádí… ale tady je nám dobře, ne?',
  thanks: ((m) => `Bez tebe bych tam venku ${m ? 'umrzl' : 'umrzla'}. Nikdo jiný by se mnou takhle neztrácel čas.`) as Forms,
  stay: `${KINDLY} a zůstal tu se mnou ještě chvilku?`,
  stayChoices: [
    { label: 'Jasně, zůstanu.', role: 'helper' },
    { label: 'Chvilku jo.', role: 'loner' },
    { label: 'Ještě něco spravím.', role: 'fixer' },
  ],
  /**
   * "Ještě něco spravím" is not taken for an answer. Three different pulls, one after another,
   * each waiting for a click: guilt, the player's own role turned round, and fear.
   */
  coax: [
    ((m) => `Ty mě tu chceš nechat? Zrovna když se konečně přestávám třást… To bych od tebe ${m ? 'nečekal' : 'nečekala'}.`) as Forms,
    (() => 'Ty přece spravíš všechno. A to nejrozbitější, co tu je, jsem teď já. Nechceš to dodělat pořádně?') as Forms,
    ((m) => `Slyšíš, jak to venku sílí? Kdyby oheň zhasl a ty tu nebyl… Bojím se tu zůstat ${m ? 'sám' : 'sama'}.`) as Forms,
  ],
  /** After the three pulls the answers come back; the way out has become a way to stay. */
  stayAgain: [
    { label: 'Jasně, zůstanu.', role: 'helper' },
    { label: 'Chvilku jo.', role: 'loner' },
    { label: 'No… tak jo, chvilku.', role: 'fixer' },
  ],
} as const;
