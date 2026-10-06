// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Firmen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    firmenname?: string;
    strasse?: string;
    hausnummer?: string;
    postleitzahl?: string;
    ort?: string;
    telefon?: string;
    email?: string;
    website?: string;
    bemerkungen?: string;
  };
}

export interface Ansprechpartner {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    firma?: string; // applookup -> URL zu 'Firmen' Record
    vorname?: string;
    nachname?: string;
    position?: string;
    telefon?: string;
    mobil?: string;
    email?: string;
    bemerkungen?: string;
  };
}

export const APP_IDS = {
  FIRMEN: '6ac4ffd3537dbc97ceb2db87',
  ANSPRECHPARTNER: '6ac4ffd7e150bc77fa35cc66',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'firmen': {
    'firmenname': 'string/text',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'postleitzahl': 'string/text',
    'ort': 'string/text',
    'telefon': 'string/tel',
    'email': 'string/email',
    'website': 'string/url',
    'bemerkungen': 'string/textarea',
  },
  'ansprechpartner': {
    'firma': 'applookup/select',
    'vorname': 'string/text',
    'nachname': 'string/text',
    'position': 'string/text',
    'telefon': 'string/tel',
    'mobil': 'string/tel',
    'email': 'string/email',
    'bemerkungen': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateFirmen = StripLookup<Firmen['fields']>;
export type CreateAnsprechpartner = StripLookup<Ansprechpartner['fields']>;