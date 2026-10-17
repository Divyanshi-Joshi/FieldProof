/**
 * Farmer-facing text in English, Hindi and Swahili.
 * The insurer screens are in English (the adjuster's working language);
 * the farmer page and the farmer message switch language.
 * Have a native speaker read the HI and SW strings once before the demo.
 */
export type Language = 'en' | 'hi' | 'sw';

export const LANGUAGES: { code: Language; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'sw', name: 'Kiswahili' },
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
  language: string;
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
    language: 'Language',
  },
  hi: {
    appBar: 'फसल दावा',
    greeting: (n) => `नमस्ते, ${n}`,
    intro: 'क्या आपकी फसल खराब हुई, पर मौसम सूचकांक से भुगतान नहीं मिला? अपने खेत की तीन तस्वीरें भेजें। बीमा अधिकारी उन्हें देखेंगे।',
    plot: 'प्लॉट नंबर',
    crop: 'फसल',
    crops: { maize: 'मक्का', sorghum: 'ज्वार', cowpea: 'लोबिया' },
    photosTitle: 'तीन तस्वीरें लें',
    photoHint: 'दिन की रोशनी में नई तस्वीरें लें। स्क्रीन की तस्वीर न लें।',
    slots: [
      { title: 'पूरा खेत', hint: 'पीछे हटें ताकि पूरा खेत दिखे' },
      { title: 'पत्तियाँ पास से', hint: 'कुछ पौधों की पत्तियाँ दिखाएँ' },
      { title: 'मिट्टी', hint: 'कतारों के बीच की ज़मीन दिखाएँ' },
    ],
    take: 'तस्वीर लें',
    retake: 'दोबारा लें',
    photosReady: (n) => `${n} / 3 तस्वीरें`,
    send: 'दावा भेजें',
    sending: 'तस्वीरें भेजी जा रही हैं…',
    needAll: 'भेजने के लिए तीनों तस्वीरें जोड़ें',
    received: 'आपका दावा मिल गया है',
    ref: 'दावा नंबर',
    steps: {
      photos: 'तस्वीरें जाँची गईं',
      damage: 'नुकसान का आकलन हुआ',
      evidence: 'बारिश और उपग्रह रिकॉर्ड जाँचे गए',
      officer: 'बीमा अधिकारी फ़ैसला करेंगे',
    },
    photoProblemTitle: 'एक तस्वीर दोबारा लेनी होगी',
    photoProblemBody: 'हम आपकी एक तस्वीर का उपयोग नहीं कर सके। कृपया दिन की रोशनी में अपने खेत की नई तस्वीर लें।',
    messageForYou: 'आपके लिए संदेश',
    nextNote: 'अधिकारी के फ़ैसले पर आपको SMS मिलेगा। भुगतान का फ़ैसला कभी कंप्यूटर नहीं करता।',
    startOver: 'नया दावा भेजें',
    error: 'दावा नहीं भेजा जा सका। इंटरनेट जाँचें और फिर कोशिश करें।',
    language: 'भाषा',
  },
  sw: {
    appBar: 'Dai la mazao',
    greeting: (n) => `Habari, ${n}`,
    intro: 'Je, mazao yako yameharibika lakini bima ya mvua haikulipa? Tuma picha tatu za shamba lako. Afisa wa bima atazikagua.',
    plot: 'Nambari ya shamba',
    crop: 'Zao',
    crops: { maize: 'Mahindi', sorghum: 'Mtama', cowpea: 'Kunde' },
    photosTitle: 'Piga picha tatu',
    photoHint: 'Piga picha mpya mchana. Usipige picha ya skrini.',
    slots: [
      { title: 'Shamba zima', hint: 'Rudi nyuma ili shamba lote lionekane' },
      { title: 'Majani karibu', hint: 'Onyesha majani ya mimea michache' },
      { title: 'Udongo', hint: 'Onyesha ardhi kati ya mistari' },
    ],
    take: 'Piga picha',
    retake: 'Piga tena',
    photosReady: (n) => `Picha ${n} kati ya 3`,
    send: 'Tuma dai langu',
    sending: 'Inatuma picha zako…',
    needAll: 'Ongeza picha zote tatu ili kutuma',
    received: 'Tumepokea dai lako',
    ref: 'Nambari ya dai',
    steps: {
      photos: 'Picha zimekaguliwa',
      damage: 'Uharibifu umepimwa',
      evidence: 'Rekodi za mvua na satelaiti zimekaguliwa',
      officer: 'Afisa wa bima ataamua',
    },
    photoProblemTitle: 'Picha moja inahitaji kupigwa tena',
    photoProblemBody: 'Hatukuweza kutumia moja ya picha zako. Tafadhali piga picha mpya ya shamba lako mchana.',
    messageForYou: 'Ujumbe kwako',
    nextNote: 'Utapokea SMS afisa akiamua. Uamuzi wa malipo haufanywi kamwe na kompyuta.',
    startOver: 'Tuma dai jingine',
    error: 'Hatukuweza kutuma dai lako. Angalia mtandao kisha ujaribu tena.',
    language: 'Lugha',
  },
};
