import type { GameScene } from '../game.ts';
import { chest } from './chest.ts';
import { crash } from './crash.ts';
import { desk } from './desk/index.ts';
import { download } from './download.ts';
import { dontclick } from './dontclick.ts';
import { fidgets } from './fidgets/index.ts';
import { flower } from './flower/index.ts';
import { glass } from './glass/index.ts';
import { mailbox } from './mailbox/index.ts';
import { paint } from './paint/index.ts';
import { plea } from './plea.ts';
import { prize } from './prize.ts';
import { rescue } from './rescue/index.ts';
import { shelter } from './shelter/index.ts';
import { reveal } from './reveal.ts';
import { welcome } from './welcome.ts';

/**
 * The whole game, in order. The reveal stays last; the Director enforces it.
 * It lives in its own module (not in main.ts, which boots the game on import)
 * so a test can check the real order against the music and the journey bar.
 */
export const SCENES: readonly GameScene[] = [mailbox, desk, welcome, fidgets, paint, rescue, shelter, flower, dontclick, chest, plea, download, prize, glass, crash, reveal];

/** The scene the journey bar counts down to. */
export const JOURNEY_GOAL = 'prize';
