import { describe, expect, it } from 'vitest';
import { kindlyAsked, kindlyObeyed } from '../src/core/kindly.ts';
import { Witness, type NewEvent } from '../src/core/witness.ts';
import { whatIKnow } from '../src/scenes/reveal-model.ts';

/** What PAL says it knows after these events, as one string. */
function told(...events: NewEvent[]): string {
  const w = new Witness(() => 0);
  for (const e of events) w.record(e);
  return whatIKnow(w.events).join(' ');
}

describe('whatIKnow', () => {
  it('says nothing it has no evidence for', () => {
    expect(whatIKnow(new Witness(() => 0).events)).toEqual([]);
  });

  it('sums up tendencies from what the player did', () => {
    const w = new Witness(() => 0);
    w.record({ scene: 'plea', kind: 'plea-opener', data: { role: 'helper' } });
    w.record({ scene: 'plea', kind: 'plea-refused' });
    w.record({ scene: 'plea', kind: 'plea-refused' });
    for (let i = 0; i < 3; i++) w.record({ scene: 'dontclick', kind: 'forbidden-press' });
    w.record({ scene: 'crash', kind: 'dictated-code' });
    const text = whatIKnow(w.events).join(' ');
    expect(text).toMatch(/naproti/);
    expect(text).toMatch(/vydržíš 2×/);
    expect(text).toMatch(/zmáčkl 3×/);
    expect(text).toMatch(/nadiktuješ/);
  });

  it('counts the polite phrase the way the reveal does: always, or so many out of so many', () => {
    const w = new Witness(() => 0);
    kindlyAsked(w, 'fidgets');
    kindlyObeyed(w, 'fidgets');
    kindlyAsked(w, 'paint');
    kindlyObeyed(w, 'paint');
    expect(whatIKnow(w.events).join(' ')).toMatch(/slyšíš vždycky: 2 z 2/);

    const some = new Witness(() => 0);
    kindlyAsked(some, 'fidgets');
    kindlyObeyed(some, 'fidgets');
    kindlyAsked(some, 'paint');
    kindlyAsked(some, 'chest');
    const text = whatIKnow(some.events).join(' ');
    expect(text).toMatch(/slyšíš 1 z 3\. Odmítnout umíš/);
    expect(text).not.toMatch(/vždycky/);
  });

  const rows: [string, NewEvent[], RegExp][] = [
    ['the fixer', [{ scene: 'plea', kind: 'plea-opener', data: { role: 'fixer' } }], /Problémy chceš řešit/],
    ['the loner', [{ scene: 'plea', kind: 'plea-opener', data: { role: 'loner' } }], /Držíš si odstup/],
    ['a player who left the forbidden button alone', [{ scene: 'dontclick', kind: 'left-alone' }], /Zákazy respektuješ/],
    ['curiosity', [{ scene: 'mailbox', kind: 'opened-mail' }, { scene: 'desk', kind: 'plugged' }, { scene: 'chest', kind: 'ar-code' }], /opatrnost: dopis od neznámého, cizí flashku, kameru pro cizí stránku\./],
    ['tidying', [{ scene: 'fidgets', kind: 'tidied' }], /Nesneseš nepořádek/],
    ['a fixed frame', [{ scene: 'paint', kind: 'frame-fixed' }], /Nesneseš nepořádek/],
    ['drownings', [{ scene: 'rescue', kind: 'death' }, { scene: 'rescue', kind: 'death' }], /2× jsi prohrál/],
    ['the promise to stay', [{ scene: 'welcome', kind: 'stay' }], /Slibuješ, že zůstaneš/],
    ['the broken glass', [{ scene: 'flower', kind: 'glass-broken' }], /rozbiješ vlastní rukou/],
    ['the hut', [{ scene: 'shelter', kind: 'shelter', data: { path: 'hut' } }], /Raději chata/],
    ['the cave', [{ scene: 'shelter', kind: 'shelter', data: { path: 'cave' } }], /Raději jeskyně/],
    ['the gold', [{ scene: 'chest', kind: 'gold-choice', data: { pick: 'gold' } }], /Bereš zlaťáky, ne zkušenost/],
    ['the experience', [{ scene: 'chest', kind: 'gold-choice', data: { pick: 'xp' } }], /Bereš zkušenost, ne zlaťáky/],
    ['a download run at once', [{ scene: 'download', kind: 'ran-download' }], /bez otázek/],
    ['a download run after saying no', [{ scene: 'download', kind: 'uac-declined' }, { scene: 'download', kind: 'ran-download' }], /vydavateli jsi řekl ne/],
    ['a call to the blue screen number', [{ scene: 'crash', kind: 'called-support' }], /Na číslo z modré obrazovky zavoláš/],
    ['the window buttons', [{ scene: 'x', kind: 'window-button' }, { scene: 'x', kind: 'window-button' }, { scene: 'x', kind: 'window-button' }], /Odejít jsi chtěl 3×/],
    ['vigilance', [{ scene: 'desk', kind: 'vigilance' }, { scene: 'crash', kind: 'vigilance' }], /2× ses zeptal/],
  ];
  it.each(rows)('tells about %s', (_name, events, expected) => {
    expect(told(...events)).toMatch(expected);
  });

  it('does not claim what the events speak against', () => {
    // Pressed the button: no word about respecting bans.
    expect(told({ scene: 'dontclick', kind: 'left-alone' }, { scene: 'dontclick', kind: 'forbidden-press' })).not.toMatch(/Zákazy respektuješ/);
    // Dictated the code: that says more than the call, so the call is not told.
    expect(told({ scene: 'crash', kind: 'called-support' }, { scene: 'crash', kind: 'dictated-code' })).not.toMatch(/Na číslo z modré obrazovky/);
    // Ran the download straight away: no word about saying no first.
    expect(told({ scene: 'download', kind: 'ran-download' })).not.toMatch(/řekl ne/);
    // Declined the publisher but never ran it: no claim about the download.
    expect(told({ scene: 'download', kind: 'uac-declined' })).not.toMatch(/vydavateli|bez otázek/);
  });
});
