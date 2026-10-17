/**
 * Farmer-facing text in English.
 * The insurer screens are in English (the adjuster's working language).
 */
export type Language = 'en';

export const LANGUAGES: { code: Language; name: string }[] = [
  { code: 'en', name: 'English' },
];

export interface FarmerStrings {
  appBar: string;
  greeting: (name: string) => string;
  intro: string;
  plot: string;
  crop: string;
  crops: { maize: string; sorghum: string; cowpea: string };
  photosTitle: string;
  photoHint: string;
  slots: { title: string; hint: string }[];
  take: string;
  retake: string;
  photosReady: (n: number) => string;
  send: string;
  sending: string;
  needAll: string;
  received: string;
  ref: string;
  steps: { photos: string; damage: string; evidence: string; officer: string };
  photoProblemTitle: string;
  photoProblemBody: string;
  messageForYou: string;
  nextNote: string;
  startOver: string;
  error: string;
}

export const farmerText: Record<Language, FarmerStrings> = {
  en: {
    appBar: 'Crop claim',
    greeting: (n) => `Hello, ${n}`,
    intro: 'Did your crop fail but the weather index did not pay? Send three photos of your field. An insurance officer will look at them.',
    plot: 'Plot number',
    crop: 'Crop',
    crops: { maize: 'Maize', sorghum: 'Sorghum', cowpea: 'Cowpea' },
    photosTitle: 'Take three photos',
    photoHint: 'Stand in daylight. Take new photos, not photos of a screen.',
    slots: [
      { title: 'Whole field', hint: 'Step back so the whole plot fits' },
      { title: 'Leaves up close', hint: 'Show the leaves of a few plants' },
      { title: 'Soil', hint: 'Show the ground between the rows' },
    ],
    take: 'Take photo',
    retake: 'Retake',
    photosReady: (n) => `${n} of 3 photos`,
    send: 'Send my claim',
    sending: 'Sending your photos…',
    needAll: 'Add all three photos to send',
    received: 'We received your claim',
    ref: 'Claim number',
    steps: {
      photos: 'Photos checked',
      damage: 'Damage assessed',
      evidence: 'Rain and satellite records checked',
      officer: 'An insurance officer will decide',
    },
    photoProblemTitle: 'One photo needs to be taken again',
    photoProblemBody: 'We could not use one of your photos. Please take a new photo of your own field in daylight.',
    messageForYou: 'Message for you',
    nextNote: 'You will get an SMS when the officer decides. A computer never makes the payment decision.',
    startOver: 'Send another claim',
    error: 'We could not send your claim. Check your connection and try again.',
  },
};

