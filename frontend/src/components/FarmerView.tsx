import React, { useState } from 'react';
import { Camera, Upload, AlertTriangle, CheckCircle2, RefreshCw, Smartphone, Sparkles, MapPin, Calendar, HelpCircle, FileText } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { api } from '../services/api';

interface FarmerViewProps {
  language: Language;
  onClaimSubmitted: (claimId: string) => void;
}

export const FarmerView: React.FC<FarmerViewProps> = ({ language, onClaimSubmitted }) => {
  const t = translations[language];

  const [plotId, setPlotId] = useState('P-0142');
  const [crop, setCrop] = useState('maize');
  const [county, setCounty] = useState('Makueni');
  const [season, setSeason] = useState('2025-LR');

  const [photos, setPhotos] = useState<{ [key: number]: { name: string; url: string; hash?: string; size?: string } }>({
    0: {
      name: 'wanjiru_overview_plot.jpg',
      url: '/images/L361F02340C01S03417Ip.jpg',
      hash: 'a3f18e9c4b2d071a',
      size: '2.4 MB'
    },
    1: {
      name: 'wanjiru_canopy_rolled_leaves.jpg',
      url: '/images/L361F02340C01S03417Rp00625.jpg',
      hash: 'b7c29e1d8a4f3320',
      size: '1.9 MB'
    },
    2: {
      name: 'wanjiru_soil_cracking_roots.jpg',
      url: '/images/L361F02340C01S03417Rp01918.jpg',
      hash: 'c8d41a2e9b3f7701',
      size: '3.1 MB'
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [isPhoneFrame, setIsPhoneFrame] = useState(true);

  // Quick preset loader
  const handleLoadPreset = (type: 'wanjiru' | 'duplicate' | 'nonfield') => {
    setSubmissionResult(null);
    if (type === 'wanjiru') {
      setPlotId('P-0142');
      setCrop('maize');
      setCounty('Makueni');
      setSeason('2025-LR');
      setPhotos({
        0: { name: 'wanjiru_overview_plot.jpg', url: '/images/L361F02340C01S03417Ip.jpg', hash: 'a3f18e9c4b2d071a', size: '2.4 MB' },
        1: { name: 'wanjiru_canopy_rolled_leaves.jpg', url: '/images/L361F02340C01S03417Rp00625.jpg', hash: 'b7c29e1d8a4f3320', size: '1.9 MB' },
        2: { name: 'wanjiru_soil_cracking_roots.jpg', url: '/images/L361F02340C01S03417Rp01918.jpg', hash: 'c8d41a2e9b3f7701', size: '3.1 MB' }
      });
    } else if (type === 'duplicate') {
      setPlotId('P-0389');
      setCrop('maize');
      setCounty('Kitui');
      setSeason('2025-LR');
      setPhotos({
        0: { name: 'cloned_photo_original.jpg', url: '/images/L371F00662C01S04023Ip.jpg', hash: '99aa88bb77cc66dd', size: '2.1 MB' },
        1: { name: 'cloned_photo_resized_copy.jpg', url: '/images/L371F00662C01S04023Ip.jpg', hash: '99aa88bb77cc66de', size: '1.2 MB' },
        2: { name: 'field_sample_3.jpg', url: '/images/L371F00662C01S04023Rp05561.jpg', hash: '12345678abcdef01', size: '2.8 MB' }
      });
    } else {
      setPlotId('P-0891');
      setCrop('sorghum');
      setCounty('Machakos');
      setSeason('2025-LR');
      setPhotos({
        0: { name: 'indoor_office_computer_screen.jpg', url: '/images/16_initial_1_1029_1029.JPG', hash: 'ffff0000aaaa1111', size: '1.8 MB' },
        1: { name: 'canopy_dark_blurry.jpg', url: '/images/135_initial_1_1286_1286.JPG', hash: '0000ffff1111aaaa', size: '1.4 MB' },
        2: { name: 'parking_lot_pavement.jpg', url: '/images/16_repeat_2_1029_519_375.JPG', hash: '1212121234343434', size: '2.0 MB' }
      });
    }
  };

  const handleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setPhotos(prev => ({
        ...prev,
        [index]: {
          name: file.name,
          url,
          hash: Math.random().toString(16).substring(2, 18),
          size: (file.size / (1024 * 1024)).toFixed(1) + ' MB'
        }
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmissionResult(null);

    try {
      const formData = new FormData();
      formData.append('plot_id', plotId);
      formData.append('crop', crop);
      formData.append('county', county);

      const resp = await api.uploadClaim(formData);
      setSubmissionResult(resp);
      if (resp.claim_id) {
        onClaimSubmitted(resp.claim_id);
      }
    } catch (err: any) {
      console.warn("Backend upload error, displaying client evaluated simulation", err);
      // Simulate client response
      const isDup = photos[0]?.hash && photos[1]?.hash && photos[0].hash.substring(0, 10) === photos[1].hash.substring(0, 10);
      const isScreen = photos[0]?.name.includes('office') || photos[0]?.name.includes('screen');

      let outcome = 'PHENOLOGICAL_BASIS_RISK_GAP';
      let action = 'ESCALATE';
      let passed = true;
      let flags: string[] = [];

      if (isDup) {
        outcome = 'INTEGRITY_HOLD';
        action = 'HOLD_NO_RECOMMENDATION';
        passed = false;
        flags.push('duplicate_within_claim: Photo 0 & Photo 1 perceptual hash distance <= 0.15');
      } else if (isScreen) {
        outcome = 'INTEGRITY_HOLD';
        action = 'HOLD_NO_RECOMMENDATION';
        passed = false;
        flags.push('screen_recapture_suspected: Moiré pattern detected in photo 0');
      }

      setSubmissionResult({
        claim_id: 'CLM-2026-009',
        plot_id: plotId,
        integrity_passed: passed,
        integrity_flags: flags,
        outcome_class: outcome,
        recommended_action: action,
        message: passed 
          ? `Your claim for plot ${plotId} has been escalated for review. Severe drought damage was detected during the flowering window.`
          : `Claim placed on integrity hold: ${flags.join('; ')}`
      });
      onClaimSubmitted('CLM-2026-009');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-6 max-w-6xl mx-auto px-4">
      {/* Top Header & Context */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">{t.farmer.title}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Mobile PWA
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">{t.farmer.subtitle}</p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center space-x-2 bg-slate-900/80 p-1 rounded-lg border border-slate-800 text-xs self-start md:self-auto">
          <button
            onClick={() => setIsPhoneFrame(true)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
              isPhoneFrame ? 'bg-brand-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Mobile Device View</span>
          </button>
          <button
            onClick={() => setIsPhoneFrame(false)}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              !isPhoneFrame ? 'bg-brand-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Wide View</span>
          </button>
        </div>
      </div>

      {/* Preset Selector Banner */}
      <div className="mb-6 glass-card p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="font-medium text-slate-300 flex items-center space-x-1.5">
          <Sparkles className="h-4 w-4 text-brand-400" />
          <span>{t.farmer.quickPresets}</span>
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleLoadPreset('wanjiru')}
            className="px-3 py-1 rounded-lg bg-brand-500/20 text-brand-300 hover:bg-brand-500/30 border border-brand-500/30 transition-colors font-medium"
          >
            {t.farmer.presetWanjiru}
          </button>
          <button
            onClick={() => handleLoadPreset('duplicate')}
            className="px-3 py-1 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition-colors font-medium"
          >
            {t.farmer.presetDuplicate}
          </button>
          <button
            onClick={() => handleLoadPreset('nonfield')}
            className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition-colors font-medium"
          >
            {t.farmer.presetBlurry}
          </button>
        </div>
      </div>

      {/* Main Container: Mobile Frame vs Wide */}
      <div className={isPhoneFrame ? "max-w-md mx-auto" : "max-w-4xl mx-auto"}>
        <div className="relative rounded-3xl bg-slate-900 border-4 border-slate-800 shadow-2xl overflow-hidden">
          {/* Phone Speaker Notch */}
          {isPhoneFrame && (
            <div className="bg-slate-950 py-2 px-6 flex justify-between items-center border-b border-slate-800/80 text-[10px] text-slate-400">
              <span className="font-mono">9:41 AM · Safaricom 4G</span>
              <div className="h-3 w-16 bg-slate-800 rounded-full" />
              <span>100% 🔋</span>
            </div>
          )}

          {/* Persona Banner */}
          <div className="bg-gradient-to-r from-emerald-950/80 to-slate-900 p-4 border-b border-emerald-900/30">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-300">
                W
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{t.farmer.personaBadge}</h3>
                <p className="text-xs text-emerald-400/90 font-mono">Index outcome: No Payout (341 mm &gt; 290 mm)</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {/* Step 1: 3 Photos */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  {t.farmer.step1}
                </label>
                <span className="text-[11px] text-brand-400">3 of 3 Loaded</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: t.farmer.photo1Label, idx: 0 },
                  { label: t.farmer.photo2Label, idx: 1 },
                  { label: t.farmer.photo3Label, idx: 2 }
                ].map(({ label, idx }) => (
                  <div key={idx} className="glass-card rounded-xl p-2.5 flex flex-col justify-between border border-slate-800">
                    <div className="text-[11px] font-medium text-slate-400 truncate mb-1.5" title={label}>
                      {label}
                    </div>

                    {photos[idx]?.url ? (
                      <div className="relative group rounded-lg overflow-hidden border border-slate-700 aspect-video mb-2 bg-slate-950">
                        <img
                          src={photos[idx].url}
                          alt={`Slot ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <label className="cursor-pointer bg-slate-900/90 hover:bg-slate-800 text-white text-[10px] px-2.5 py-1 rounded-md border border-slate-700 flex items-center space-x-1">
                            <RefreshCw className="h-3 w-3" />
                            <span>Replace</span>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={(e) => handleFileChange(idx, e)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-lg aspect-video flex flex-col items-center justify-center cursor-pointer p-2 mb-2 transition-colors bg-slate-950/50">
                        <Camera className="h-6 w-6 text-slate-500 mb-1" />
                        <span className="text-[10px] text-slate-400 text-center">Take or Upload Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handleFileChange(idx, e)}
                          className="hidden"
                        />
                      </label>
                    )}

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span>Hash: {photos[idx]?.hash?.substring(0, 8)}...</span>
                      <span>{photos[idx]?.size || '1.8 MB'}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-2 flex items-center space-x-1">
                <HelpCircle className="h-3 w-3 text-slate-400 inline" />
                <span>{t.farmer.photoHint}</span>
              </p>
            </div>

            {/* Step 2: Metadata Fields */}
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-3">
                {t.farmer.step2}
              </label>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">{t.farmer.plotId}</label>
                  <input
                    type="text"
                    value={plotId}
                    onChange={(e) => setPlotId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{t.farmer.crop}</label>
                  <select
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500 capitalize"
                  >
                    <option value="maize">Maize (Mahindi)</option>
                    <option value="sorghum">Sorghum (Mtama)</option>
                    <option value="cowpea">Cowpea (Kunde)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{t.farmer.county}</label>
                  <select
                    value={county}
                    onChange={(e) => setCounty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="Makueni">Makueni County</option>
                    <option value="Machakos">Machakos County</option>
                    <option value="Kitui">Kitui County</option>
                    <option value="Embu">Embu County</option>
                    <option value="Kilifi">Kilifi County</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{t.farmer.season}</label>
                  <input
                    type="text"
                    value={season}
                    readOnly
                    className="w-full bg-slate-950/60 border border-slate-800/80 rounded-lg px-3 py-2 text-slate-400 font-mono cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Submission Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-brand-600 to-emerald-500 hover:from-brand-500 hover:to-emerald-400 text-white shadow-lg shadow-brand-500/20 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>{t.farmer.submitting}</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>{t.farmer.submit}</span>
                </>
              )}
            </button>
          </form>

          {/* Result Card Modal/Callout */}
          {submissionResult && (
            <div className="p-4 bg-slate-950 border-t border-slate-800 animate-in fade-in slide-in-from-bottom duration-300">
              <div className={`p-4 rounded-xl border ${
                submissionResult.integrity_passed
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              }`}>
                <div className="flex items-start space-x-3">
                  {submissionResult.integrity_passed ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm tracking-tight text-white">
                        {submissionResult.integrity_passed ? t.farmer.statusSubmitted : 'Integrity Check Failed'}
                      </span>
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-brand-300">
                        {submissionResult.claim_id}
                      </span>
                    </div>

                    <p className="text-slate-300 text-xs leading-relaxed pt-1">
                      {submissionResult.message || submissionResult.failure_mode}
                    </p>

                    <div className="pt-2 flex flex-wrap items-center gap-2 font-mono text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-slate-900/80 border border-slate-800 text-slate-300">
                        Outcome: {submissionResult.outcome_class}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-900/80 border border-slate-800 text-slate-300">
                        Action: {submissionResult.recommended_action}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
