import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check, Clock, X } from 'lucide-react';
import { api, UploadResult } from '../services/api';
import { Language, LANGUAGES, farmerText } from '../i18n/translations';
import { ActiveTab } from '../App';
import { Logo } from './Navbar';

interface FarmerViewProps {
  language?: Language;
  setLanguage?: (l: Language) => void;
  onNavigate: (tab: ActiveTab, claimId?: string) => void;
}

type Crop = 'maize' | 'sorghum' | 'cowpea';
interface Photo { url: string; name: string; file?: File }
type Slots = [Photo | null, Photo | null, Photo | null];

interface Sample {
  id: string;
  title: string;
  expect: string;
  farmer: string;
  plot: string;
  crop: Crop;
  county: string;
  season: string;
  photos: Slots;
}

const SAMPLES: Sample[] = [
  {
    id: 'ramesh',
    title: "Ramesh's drought claim",
    expect: 'Three photos of his maize plot after a dry spell. Expect it to reach the adjuster as a loss the index missed.',
    farmer: 'Ramesh', plot: 'P-0142', crop: 'maize', county: 'Beed', season: 'Kharif 2025',
    photos: [
      { url: '/images/L429F00196C01S01028Rp12846.jpg', name: 'L429F00196C01S01028Rp12846.jpg' },
      { url: '/images/L429F00196C01S01028Rp13485.jpg', name: 'L429F00196C01S01028Rp13485.jpg' },
      { url: '/images/L429F00196C01S01028Rp14607.jpg', name: 'L429F00196C01S01028Rp14607.jpg' },
    ],
  },
  {
    id: 'duplicate',
    title: 'A copied photo',
    expect: 'The same picture is sent twice. Expect the photo check to catch it and ask for a new one.',
    farmer: 'Suresh', plot: 'P-0389', crop: 'maize', county: 'Jalna', season: 'Kharif 2025',
    photos: [
      { url: '/images/L354F03993C01S01042Rp09436.jpg', name: 'L354F03993C01S01042Rp09436.jpg' },
      { url: '/images/L354F03993C01S01042Rp09436.jpg', name: 'L354F03993C01S01042Rp09436.jpg' },
      { url: '/images/L354F03993C01S01042Rp12141.jpg', name: 'L354F03993C01S01042Rp12141.jpg' },
    ],
  },
  {
    id: 'mismatch',
    title: 'Photos from different fields',
    expect: 'Three pictures from three different plots. Expect the claim to be held with no recommendation.',
    farmer: 'Rajesh', plot: 'P-0891', crop: 'maize', county: 'Latur', season: 'Kharif 2025',
    photos: [
      { url: '/images/L341F02966C01S08093Rp29091.jpg', name: 'L341F02966C01S08093Rp29091.jpg' },
      { url: '/images/L1089F02180C01S07348Rp18597.jpg', name: 'L1089F02180C01S07348Rp18597.jpg' },
      { url: '/images/L1084F01969C01S07500Rp23425.jpg', name: 'L1084F01969C01S07500Rp23425.jpg' },
    ],
  },
];

async function toBlob(p: Photo): Promise<Blob> {
  if (p.file) return p.file;
  const r = await fetch(p.url);
  return r.blob();
}

export const FarmerView: React.FC<FarmerViewProps> = ({ onNavigate }) => {
  const t = farmerText.en;
  const [sample, setSample] = useState<Sample>(SAMPLES[0]);
  const [plot, setPlot] = useState(SAMPLES[0].plot);
  const [crop, setCrop] = useState<Crop>(SAMPLES[0].crop);
  const [photos, setPhotos] = useState<Slots>(SAMPLES[0].photos);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const phoneTop = useRef<HTMLDivElement>(null);

  const loadSample = (s: Sample) => {
    setSample(s);
    setPlot(s.plot);
    setCrop(s.crop);
    setPhotos([...s.photos] as Slots);
    setResult(null);
    setError(false);
  };

  useEffect(() => {
    phoneTop.current?.scrollTo?.({ top: 0 });
  }, [result]);

  const setSlot = (i: number, f: File | undefined) => {
    if (!f) return;
    const next = [...photos] as Slots;
    next[i] = { url: URL.createObjectURL(f), name: f.name, file: f };
    setPhotos(next);
  };

  const ready = photos.filter(Boolean).length;

  const send = async () => {
    if (ready < 3) return;
    setSending(true);
    setError(false);
    try {
      const blobs = await Promise.all((photos as Photo[]).map(toBlob));
      const res = await api.uploadClaim(
        { plot_id: plot, crop, county: sample.county, season: sample.season },
        blobs,
        (photos as Photo[]).map((p) => p.name),
      );
      setResult(res);
    } catch {
      setError(true);
    } finally {
      setSending(false);
    }
  };

  const retakeRejected = () => {
    const next = [...photos] as Slots;
    const bad = result?.rejected_photo_indices?.length ? result.rejected_photo_indices : [];
    bad.forEach((i) => { if (i >= 0 && i < 3) next[i] = null; });
    setPhotos(next);
    setResult(null);
  };

  const message = result?.farmer_messages?.en || null;

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 lg:grid-cols-12 lg:px-8">
      {/* Guide for the person demoing */}
      <aside className="order-2 lg:order-1 lg:col-span-5">
        <h1 className="text-2xl font-semibold sm:text-3xl">The farmer's side</h1>
        <p className="mt-3 max-w-prose text-muted">
          This is what a farmer sees on their phone. Open this page on a phone and the photo buttons use the real camera.
        </p>

        <h2 className="mt-8 text-base font-semibold">Pick a sample claim</h2>
        <div role="radiogroup" aria-label="Sample claims" className="mt-3 divide-y divide-line rounded-lg border border-line bg-surface">
          {SAMPLES.map((s) => {
            const on = s.id === sample.id;
            return (
              <button
                key={s.id}
                role="radio"
                aria-checked={on}
                onClick={() => loadSample(s)}
                className={`flex w-full items-start gap-3 p-4 text-left transition-colors ${on ? 'bg-field-soft' : 'hover:bg-canvas'}`}
              >
                <span className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-field' : 'border-faint'}`}>
                  {on && <span className="h-2 w-2 rounded-full bg-field" />}
                </span>
                <span>
                  <span className="block font-semibold">{s.title}</span>
                  <span className="mt-0.5 block text-sm text-muted">{s.expect}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 border-t border-line pt-6">
          <h2 className="text-base font-semibold">After sending the claim</h2>
          <p className="mt-2 max-w-prose text-sm text-muted">
            The farmer is told the claim was received and that a person makes the decision. The claim lands in the adjuster's
            queue with everything the system found.
          </p>
          <button
            onClick={() => onNavigate('insurer', result?.claim_id || undefined)}
            className={result ? 'btn-primary mt-4' : 'btn-quiet mt-4'}
          >
            {result?.claim_id ? `See claim ${result.claim_id} as the adjuster` : 'See the adjuster’s queue'}
          </button>
        </div>
      </aside>

      {/* The phone */}
      <div className="order-1 lg:order-2 lg:col-span-7">
        <div className="mx-auto w-full max-w-[400px] overflow-hidden rounded-[28px] border border-line bg-surface shadow-[0_24px_60px_-30px_rgba(22,35,28,0.45)] sm:border-[10px] sm:border-ink">
          {/* App bar */}
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div className="flex items-center gap-2">
              <Logo className="h-6 w-6" />
              <span className="font-semibold">{t.appBar}</span>
            </div>
          </div>

          <div ref={phoneTop} lang="en" className="scroll-thin max-h-[720px] overflow-y-auto">
            {!result ? (
              <div className="settle p-5">
                <p className="font-display text-xl font-semibold">{t.greeting(sample.farmer)}</p>
                <p className="mt-2 text-[15px] leading-6 text-muted">{t.intro}</p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="label">{t.plot}</span>
                    <input value={plot} onChange={(e) => setPlot(e.target.value)} className="field-input mt-1" inputMode="text" autoComplete="off" />
                  </label>
                  <label className="block">
                    <span className="label">{t.crop}</span>
                    <select value={crop} onChange={(e) => setCrop(e.target.value as Crop)} className="field-input mt-1">
                      {(['maize', 'sorghum', 'cowpea'] as Crop[]).map((c) => (
                        <option key={c} value={c}>{t.crops[c]}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-6 flex items-baseline justify-between">
                  <p className="font-semibold">{t.photosTitle}</p>
                  <p className="text-sm text-muted">{t.photosReady(ready)}</p>
                </div>
                <p className="mt-1 text-sm text-muted">{t.photoHint}</p>

                <ul className="mt-3 space-y-2.5">
                  {t.slots.map((slot, i) => {
                    const p = photos[i];
                    return (
                      <li key={i} className="flex items-center gap-3 rounded-lg border border-line p-2.5">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-sunk">
                          {p ? <img src={p.url} alt="" className="h-full w-full object-cover" /> : <Camera className="h-6 w-6 text-faint" aria-hidden />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold leading-5">{slot.title}</p>
                          <p className="text-sm leading-5 text-muted">{slot.hint}</p>
                        </div>
                        <label className={`shrink-0 cursor-pointer rounded-md px-3 py-2 text-sm font-semibold ${p ? 'border border-line text-ink' : 'bg-field text-white'}`}>
                          {p ? t.retake : t.take}
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="sr-only"
                            onChange={(e) => setSlot(i, e.target.files?.[0])}
                          />
                        </label>
                      </li>
                    );
                  })}
                </ul>

                {error && <p role="alert" className="mt-4 rounded-md bg-hold-soft p-3 text-sm text-hold">{t.error}</p>}

                <button onClick={send} disabled={ready < 3 || sending} className="btn-primary mt-5 w-full py-3.5 text-base">
                  {sending ? t.sending : t.send}
                </button>
                {ready < 3 && <p className="mt-2 text-center text-sm text-muted">{t.needAll}</p>}
              </div>
            ) : (
              <ResultScreen
                result={result}
                t={t}
                photos={photos}
                message={message}
                onRetake={retakeRejected}
                onStartOver={() => loadSample(sample)}
                onNavigate={onNavigate}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ResultScreen: React.FC<{
  result: UploadResult;
  t: (typeof farmerText)['en'];
  photos: Slots;
  message: string | null;
  onRetake: () => void;
  onStartOver: () => void;
  onNavigate: (tab: ActiveTab, claimId?: string) => void;
}> = ({ result, t, photos, message, onRetake, onStartOver, onNavigate }) => {
  const ok = result.integrity_passed;
  const steps = [
    { label: t.steps.photos, state: ok ? 'done' : 'fail' },
    { label: t.steps.damage, state: ok ? 'done' : 'skip' },
    { label: t.steps.evidence, state: ok ? 'done' : 'skip' },
    { label: t.steps.officer, state: 'wait' },
  ] as const;

  return (
    <div className="settle p-5" role="status">
      <p className="font-display text-xl font-semibold">{ok ? t.received : t.photoProblemTitle}</p>
      {result.claim_id && (
        <div className="mt-1">
          <p className="text-sm text-muted">
            {t.ref}: <span className="font-semibold text-ink">{result.claim_id}</span>
          </p>
          <button
            onClick={() => onNavigate('insurer', result.claim_id)}
            className="btn-primary mt-3 flex w-full items-center justify-center gap-1.5 py-2.5 text-sm font-semibold"
          >
            Open in Claims Queue →
          </button>
        </div>
      )}

      {!ok && (
        <>
          <p className="mt-3 text-[15px] leading-6">{t.photoProblemBody}</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {photos.map((p, i) => {
              const bad = result.rejected_photo_indices.includes(i);
              return (
                <div key={i} className={`relative aspect-square overflow-hidden rounded-md ${bad ? 'ring-[3px] ring-hold' : ''}`}>
                  {p && <img src={p.url} alt="" className={`h-full w-full object-cover ${bad ? 'opacity-70' : ''}`} />}
                  {bad && (
                    <span className="absolute right-1 top-1 rounded-full bg-hold p-0.5 text-white"><X className="h-3.5 w-3.5" aria-hidden /></span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <ol className="mt-5 space-y-3">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-3">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
              s.state === 'done' ? 'bg-field text-white'
                : s.state === 'fail' ? 'bg-hold text-white'
                : s.state === 'wait' ? 'border-2 border-field text-field'
                : 'border-2 border-line text-faint'
            }`}>
              {s.state === 'done' && <Check className="h-3.5 w-3.5" aria-hidden />}
              {s.state === 'fail' && <X className="h-3.5 w-3.5" aria-hidden />}
              {s.state === 'wait' && <Clock className="h-3 w-3" aria-hidden />}
            </span>
            <span className={s.state === 'skip' ? 'text-faint' : ''}>{s.label}</span>
          </li>
        ))}
      </ol>

      {message && (
        <div className="mt-6 rounded-lg bg-canvas p-4">
          <p className="label">{t.messageForYou}</p>
          <p className="mt-1 text-[15px] leading-6">{message}</p>
        </div>
      )}

      <p className="mt-5 text-sm text-muted">{t.nextNote}</p>

      {!ok && result.rejected_photo_indices.length > 0 ? (
        <button onClick={onRetake} className="btn-primary mt-5 w-full py-3.5 text-base">{t.retake}</button>
      ) : (
        <button onClick={onStartOver} className="btn-quiet mt-5 w-full py-3">{t.startOver}</button>
      )}
    </div>
  );
};
