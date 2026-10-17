import type { ClaimBundle } from '../services/api';
import type { Verdict } from '../components/ui';

export interface SourceReading { verdict: Verdict; short: string }

/** What each of the three sources says, as loss / no loss. */
export function readSources(c: ClaimBundle): { index: SourceReading; photos: SourceReading; satellite: SourceReading } {
  const { grading: g, evidence: e } = c;

  const index: SourceReading = e.index_pays
    ? { verdict: 'loss', short: 'Paid' }
    : { verdict: 'none', short: 'Did not pay' };

  let photos: SourceReading;
  if (!g.integrity_passed) photos = { verdict: 'na', short: 'Not graded' };
  else if (g.abstain_to_human || g.final_severity_band === 'ABSTAIN') photos = { verdict: 'unclear', short: 'Checks disagree' };
  else if (g.final_severity_band === 'SEVERE' || g.final_severity_band === 'MODERATE')
    photos = { verdict: 'loss', short: g.final_severity_band === 'SEVERE' ? 'Severe' : 'Moderate' };
  else if (g.final_severity_band === 'MILD') photos = { verdict: 'mild', short: 'Mild' };
  else photos = { verdict: 'none', short: 'No damage' };

  const satellite: SourceReading = e.satellite_stress
    ? { verdict: 'loss', short: 'Stressed' }
    : { verdict: 'none', short: 'Normal' };

  return { index, photos, satellite };
}
