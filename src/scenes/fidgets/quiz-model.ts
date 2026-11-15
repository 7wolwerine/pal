import { QUIZ, isRightAnswer, type QuizQuestion } from '../../content/fidgets.ts';

/** What sending the quiz leads to. */
export type QuizVerdict =
  | { readonly kind: 'incomplete'; readonly id: string }
  /** A wrong answer, the first time: PAL gives a hint. */
  | { readonly kind: 'hint'; readonly id: string }
  /** The same answer wrong again: PAL writes the right one in. */
  | { readonly kind: 'fill'; readonly id: string; readonly answer: string }
  | { readonly kind: 'done' };

/**
 * The quiz's rules, without the DOM. A lamp is green only while its field
 * holds exactly a right answer; nothing else (a hint, a send, a second try)
 * ever turns it green. The personal question takes anything that is not empty.
 */
export class QuizModel {
  readonly #hinted = new Set<string>();
  readonly questions: readonly QuizQuestion[];

  constructor(questions: readonly QuizQuestion[] = QUIZ) {
    this.questions = questions;
  }

  /** Whether the lamp beside this question is green for this text. */
  lit(id: string, value: string): boolean {
    const question = this.questions.find((q) => q.id === id);
    if (!question || !value.trim()) return false;
    return question.personal === true || isRightAnswer(question, value);
  }

  /** How many questions PAL has had to hint at. */
  get hints(): number {
    return this.#hinted.size;
  }

  /** Sends the answers (by question id) and says what happens next. */
  submit(values: Readonly<Record<string, string>>): QuizVerdict {
    const empty = this.questions.find((q) => !(values[q.id] ?? '').trim());
    if (empty) return { kind: 'incomplete', id: empty.id };
    const wrong = this.questions.find((q) => !this.lit(q.id, values[q.id] ?? ''));
    if (!wrong) return { kind: 'done' };
    if (!this.#hinted.has(wrong.id)) {
      this.#hinted.add(wrong.id);
      return { kind: 'hint', id: wrong.id };
    }
    return { kind: 'fill', id: wrong.id, answer: wrong.answers?.[0] ?? '' };
  }
}
