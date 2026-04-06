import type { CardRef, MatchupCurve } from '../types/curve'

/** Shorthand: real `card_set_id` values — names and art load from OPTCG API */
const C = (id: string, title?: string): CardRef =>
  title ? { id, title } : { id }

/** Sample curve using real English card IDs (optcgapi.com). */
export const sampleMatchup: MatchupCurve = {
  title: 'Sample matchup curve',
  firstDeck: {
    name: 'Red / Blue — Leader: Lucy',
    subtitle: 'Goes first',
    colors: { primary: 'red', secondary: 'blue' },
  },
  secondDeck: {
    name: 'Blue / Yellow — Leader: Nami',
    subtitle: 'Goes second',
    colors: { primary: 'blue', secondary: 'yellow' },
  },
  turns: [
    {
      turn: 1,
      firstPlayer: {
        play: {
          t: 'or',
          branches: [
            { t: 'card', card: C('OP01-001') },
            { t: 'card', card: C('ST01-012') },
          ],
        },
      },
      secondPlayer: {
        play: {
          t: 'card',
          card: C('ST06-004'),
        },
      },
    },
    {
      turn: 2,
      firstPlayer: {
        play: {
          t: 'seq',
          steps: [
            { t: 'card', card: C('OP03-040') },
            { t: 'card', card: C('OP02-015') },
          ],
        },
      },
      secondPlayer: {
        play: {
          t: 'seq',
          steps: [
            { t: 'card', card: C('ST07-001') },
            { t: 'card', card: C('ST07-002') },
          ],
        },
        callout: 'All Don!! Attack',
      },
    },
    {
      turn: 3,
      firstPlayer: {
        play: {
          t: 'or',
          branches: [
            {
              t: 'seq',
              steps: [
                { t: 'card', card: C('OP01-020') },
                { t: 'card', card: C('OP01-021') },
              ],
            },
            { t: 'card', card: C('OP04-030') },
          ],
        },
      },
      secondPlayer: {
        play: {
          t: 'and',
          parts: [
            { t: 'card', card: C('OP03-001') },
            { t: 'card', card: C('OP03-040') },
          ],
        },
      },
    },
    {
      turn: 4,
      firstPlayer: {
        play: {
          t: 'card',
          card: C('OP05-060'),
        },
      },
      secondPlayer: {
        play: {
          t: 'or',
          branches: [
            {
              t: 'fork',
              head: { t: 'card', card: C('OP02-015') },
              tails: [
                { t: 'card', card: C('OP08-010') },
                { t: 'card', card: C('OP04-030') },
              ],
            },
            { t: 'card', card: C('OP06-080') },
          ],
        },
      },
    },
    {
      turn: 5,
      firstPlayer: {
        play: {
          t: 'and',
          parts: [
            {
              t: 'or',
              branches: [
                { t: 'card', card: C('OP01-020') },
                { t: 'card', card: C('OP01-021') },
              ],
            },
            {
              t: 'seq',
              steps: [
                { t: 'card', card: C('OP03-001') },
                {
                  t: 'or',
                  branches: [
                    { t: 'card', card: C('OP02-015') },
                    { t: 'card', card: C('OP04-030') },
                  ],
                },
              ],
            },
          ],
        },
      },
      secondPlayer: {
        play: {
          t: 'seq',
          steps: [
            { t: 'card', card: C('ST07-001') },
            { t: 'card', card: C('ST07-002') },
          ],
        },
      },
    },
    {
      turn: 6,
      firstPlayer: {
        play: {
          t: 'card',
          card: C('OP05-060'),
        },
      },
      secondPlayer: {
        play: {
          t: 'or',
          branches: [
            { t: 'card', card: C('OP03-040') },
            { t: 'card', card: C('OP08-010') },
          ],
        },
      },
    },
  ],
}
