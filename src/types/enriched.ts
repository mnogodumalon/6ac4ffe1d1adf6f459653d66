import type { Ansprechpartner } from './app';

export type EnrichedAnsprechpartner = Ansprechpartner & {
  firmaName: string;
};
