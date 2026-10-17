import type { OutcomeClass, RecommendedAction, SeverityBand } from '../types/contracts';

export type OutcomeGroup = 'missed' | 'paid' | 'hold' | 'review' | 'none';

export interface OutcomeInfo {
  label: string;
  /** One sentence an adjuster can read in two seconds */
  summary: string;
  group: OutcomeGroup;
}

/** Plain-language names for the decision table outcomes. */
export const OUTCOMES: Record<string, OutcomeInfo> = {
  PHENOLOGICAL_BASIS_RISK_GAP: {
    label: 'Missed by the index: badly timed dry spell',
    summary: 'Season rain looked normal, but a long dry spell hit at a critical growth stage. Photos and satellite both show crop stress.',
    group: 'missed',
  },
  SPATIAL_BASIS_RISK_GAP: {
    label: 'Missed by the index: local drought',
    summary: 'The area index did not trigger, but rain on this plot was low. Photos and satellite both show crop stress.',
    group: 'missed',
  },
  CONFIRMED_PAYOUT: {
    label: 'Index paid, damage confirmed',
    summary: 'The index triggered and the photos show weather damage. Safe to fast-track.',
    group: 'paid',
  },
  POSSIBLE_OVERPAYMENT: {
    label: 'Index paid, no damage seen',
    summary: 'The index triggered, but the photos show a healthy crop. Worth a look before paying.',
    group: 'review',
  },
  EVIDENCE_CONFLICT: {
    label: 'Photos and satellite disagree',
    summary: 'The photos show weather damage but the satellite shows healthy vegetation. Ask for more photos.',
    group: 'review',
  },
  NON_WEATHER_LOSS: {
    label: 'Loss not caused by weather',
    summary: 'The damage looks like pests, disease, weeds or nutrients. Weather cover does not apply; refer to advisory or other cover.',
    group: 'review',
  },
  CONSISTENT: {
    label: 'No loss, no payout',
    summary: 'The index did not pay and the photos and satellite show a healthy crop. Nothing to do.',
    group: 'none',
  },
  INTEGRITY_HOLD: {
    label: 'On hold: photo problem',
    summary: 'A photo failed the authenticity checks, so the system makes no recommendation.',
    group: 'hold',
  },
  ABSTAIN: {
    label: 'Needs your judgement',
    summary: 'The two independent photo checks disagreed, so the system stepped back and left the call to you.',
    group: 'hold',
  },
};

export function outcomeInfo(o: OutcomeClass | string): OutcomeInfo {
  return OUTCOMES[o] ?? { label: o.replace(/_/g, ' ').toLowerCase(), summary: '', group: 'review' };
}

export const GROUP_TONE: Record<OutcomeGroup, { dot: string; text: string; soft: string }> = {
  missed: { dot: 'bg-loss', text: 'text-loss-ink', soft: 'bg-loss-soft' },
  paid: { dot: 'bg-field', text: 'text-field', soft: 'bg-field-soft' },
  hold: { dot: 'bg-hold', text: 'text-hold', soft: 'bg-hold-soft' },
  review: { dot: 'bg-review', text: 'text-review', soft: 'bg-review-soft' },
  none: { dot: 'bg-calm', text: 'text-calm', soft: 'bg-calm-soft' },
};

export const ACTIONS: Record<RecommendedAction | string, string> = {
  FAST_TRACK: 'Fast-track the payout',
  REVIEW: 'Review before paying',
  ESCALATE: 'Escalate: likely a loss the index missed',
  ASK_MORE_PHOTOS_HUMAN_REVIEW: 'Ask the farmer for more photos',
  ROUTE_TO_ADVISORY: 'Refer to farm advisory or other cover',
  NO_ACTION: 'No action needed',
  HOLD_NO_RECOMMENDATION: 'Hold. No recommendation until the photos are resolved',
  ABSTAIN_TO_HUMAN: 'No suggestion. The photo checks disagreed',
};

export const SEVERITY: Record<SeverityBand | string, string> = {
  NONE: 'No damage',
  MILD: 'Mild damage',
  MODERATE: 'Moderate damage',
  SEVERE: 'Severe damage',
  ABSTAIN: 'Unclear',
};

export const DAMAGE_TYPE: Record<string, string> = {
  drought: 'drought',
  pest: 'pests',
  disease: 'disease',
  weed: 'weeds',
  nutrient: 'nutrient shortage',
  other: 'other cause',
  none: 'no damage',
};

/** Plain names for integrity flags the backend may send. Unknown flags are shown as readable text. */
export function flagText(flag: string): string {
  const f = flag.toLowerCase();
  if (f.includes('dup') && f.includes('across')) return 'Matches a photo from an earlier claim';
  if (f.includes('dup')) return 'Two photos in this claim are copies';
  if (f.includes('screen') || f.includes('recapture')) return 'Looks like a photo of a screen';
  if (f.includes('blur')) return 'Photo is blurry';
  if (f.includes('dark')) return 'Photo is too dark';
  if (f.includes('exif') || f.includes('metadata')) return 'Camera details missing';
  if (f.includes('not_crop') || f.includes('non_field') || f.includes('not_field')) return 'Not a photo of a field';
  if (f.includes('mismatch') || f.includes('same_field')) return 'Photos may be from different fields';
  return flag.replace(/_/g, ' ');
}
