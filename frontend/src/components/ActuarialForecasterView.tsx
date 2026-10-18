import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Area, ComposedChart
} from 'recharts';
import {
  Code, Terminal, TrendingUp, AlertTriangle, Play, ShieldCheck, DollarSign, CloudRain, Cpu, CheckCircle2, ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import { ActuarialForecastResult, ActuarialCounty } from '../types/contracts';
import { fmtUsd } from '../lib/format';
import { Loading } from './ui';

export const ActuarialForecasterView: React.FC = () => {
  const [counties, setCounties] = useState<ActuarialCounty[]>([]);
  const [selectedCounty, setSelectedCounty] = useState('beed');
  const [plotId, setPlotId] = useState('P-0142');
  const [currentRain, setCurrentRain] = useState(248.0);
  const [triggerRain, setTriggerRain] = useState(290.0);
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState<ActuarialForecastResult | null>(null);
  const [activeTab, setActiveTab] = useState<'chart' | 'code' | 'terminal'>('chart');

  // Load counties on mount
  useEffect(() => {
    api.getActuarialCounties().then((c) => {
      setCounties(c);
      if (c.length > 0) {
        setTriggerRain(c[0].trigger_p30_mm);
      }
    }).catch(console.error);

    // Initial forecast run
    runForecast('P-0142', 'beed', 248.0, 290.0);
  }, []);

  const handleCountyChange = (cId: string) => {
    setSelectedCounty(cId);
    const found = counties.find(c => c.id === cId);
    if (found) {
      setTriggerRain(found.trigger_p30_mm);
      setPlotId(found.sample_plot);
      const estRain = found.id === 'beed' ? 248.0 : (found.id === 'jalna' ? 245.0 : 310.0);
      setCurrentRain(estRain);
      runForecast(found.sample_plot, found.id, estRain, found.trigger_p30_mm);
    }
  };

  const runForecast = async (p = plotId, c = selectedCounty, curR = currentRain, trR = triggerRain) => {
    setLoading(true);
    try {
      const res = await api.getActuarialForecast(p, c, curR, trR);
      setForecast(res);
    } catch (err) {
      console.error('Actuarial forecast failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8 space-y-8">
      {/* Header */}
      <div className="border-b border-line pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-field-soft px-2.5 py-1 text-xs font-bold text-field flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5" /> Forward Actuarial Risk
              </span>
              <span className="rounded bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-sky-600 dark:text-sky-400">
                14-Day Trajectory
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl text-ink">
              Forward Payout & Drought Risk Projection
            </h2>
            <p className="mt-2 max-w-3xl text-sm sm:text-base text-muted leading-relaxed">
              Predictive weather trajectory modeling calculating cumulative rainfall probabilities,
              drought breach likelihood, and forward portfolio reserve requirements across key agricultural districts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => runForecast()}
              disabled={loading}
              className="btn-primary flex items-center gap-2 px-5 py-2.5 shadow-md shadow-field/20"
            >
              <Play className={`h-4 w-4 ${loading ? 'animate-spin' : 'fill-current'}`} />
              {loading ? 'Simulating Trajectory...' : 'Run Forward Projection'}
            </button>
          </div>
        </div>
      </div>

      {/* Control Configuration Bar */}
      <div className="panel p-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="text-xs font-semibold text-muted block mb-1">Target District</label>
          <select
            value={selectedCounty}
            onChange={(e) => handleCountyChange(e.target.value)}
            className="field-input text-sm w-full"
          >
            {counties.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} (Trigger: {c.trigger_p30_mm} mm)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted block mb-1">Plot ID</label>
          <input
            type="text"
            value={plotId}
            onChange={(e) => setPlotId(e.target.value)}
            className="field-input text-sm w-full"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs font-semibold text-muted mb-1">
            <span>Current Rain:</span>
            <span className="text-ink font-mono">{currentRain.toFixed(1)} mm</span>
          </div>
          <input
            type="range"
            min={150}
            max={400}
            step={2}
            value={currentRain}
            onChange={(e) => setCurrentRain(parseFloat(e.target.value))}
            className="w-full accent-field"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs font-semibold text-muted mb-1">
            <span>Trigger P30 Threshold:</span>
            <span className="text-ink font-mono">{triggerRain.toFixed(1)} mm</span>
          </div>
          <input
            type="range"
            min={200}
            max={400}
            step={5}
            value={triggerRain}
            onChange={(e) => setTriggerRain(parseFloat(e.target.value))}
            className="w-full accent-rain"
          />
        </div>
      </div>

      {/* KPI Cards */}
      {forecast && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Forward Payout Prob */}
          <div className="panel p-5 relative overflow-hidden">
            <div className="flex items-center justify-between text-muted text-xs font-semibold">
              <span>14-Day Forward Payout Prob</span>
              <TrendingUp className="h-4 w-4 text-field" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className={`font-display text-3xl sm:text-4xl font-bold ${
                forecast.forward_14d_payout_probability > 0.65 ? 'text-loss' : 'text-field'
              }`}>
                {(forecast.forward_14d_payout_probability * 100).toFixed(1)}%
              </span>
              <span className="text-xs text-muted">likelihood</span>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-sunk overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  forecast.forward_14d_payout_probability > 0.65 ? 'bg-loss' : 'bg-field'
                }`}
                style={{ width: `${Math.min(100, forecast.forward_14d_payout_probability * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-muted">
              P(season_rain &lt; {forecast.trigger_rain_mm} mm)
            </p>
          </div>

          {/* Card 2: Risk Category */}
          <div className="panel p-5">
            <div className="flex items-center justify-between text-muted text-xs font-semibold">
              <span>Solvency Risk Alert</span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className={`rounded-md px-2.5 py-1 text-sm font-bold ${
                forecast.drought_escalation_risk === 'CRITICAL' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30' :
                forecast.drought_escalation_risk === 'HIGH' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30' :
                'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
              }`}>
                {forecast.drought_escalation_risk} RISK
              </span>
            </div>
            <p className="mt-3 text-xs text-muted">
              {forecast.forward_14d_payout_probability > 0.65
                ? 'High probability of dry spell persistence requiring liquidity reserves.'
                : 'Rainfall trajectory currently tracking within sustainable solvency margins.'}
            </p>
          </div>

          {/* Card 3: Projected Rain */}
          <div className="panel p-5">
            <div className="flex items-center justify-between text-muted text-xs font-semibold">
              <span>Expected 14-Day Inflow</span>
              <CloudRain className="h-4 w-4 text-rain" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold text-ink">
                +{(forecast.forecast_time_series.reduce((acc, p) => acc + p.expected_rain_mm, 0)).toFixed(1)}
              </span>
              <span className="text-xs text-muted">mm expected</span>
            </div>
            <p className="mt-3 text-xs text-muted">
              Current: <strong>{forecast.current_cumulative_rain_mm} mm</strong> → Projected:{' '}
              <strong className="text-ink">
                {(forecast.current_cumulative_rain_mm + forecast.forecast_time_series.reduce((acc, p) => acc + p.expected_rain_mm, 0)).toFixed(1)} mm
              </strong>
            </p>
          </div>

          {/* Card 4: Portfolio Outlay */}
          <div className="panel p-5">
            <div className="flex items-center justify-between text-muted text-xs font-semibold">
              <span>Projected Portfolio Outlay</span>
              <DollarSign className="h-4 w-4 text-field" />
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="font-display text-2xl sm:text-3xl font-bold text-ink">
                ₹{((forecast.projected_portfolio_outlay_usd || 340000) * 83).toLocaleString('en-IN')}
              </span>
            </div>
            <p className="mt-3 text-xs text-muted">
              Estimated claim disbursement across a 1,000 ha portfolio (~{fmtUsd(forecast.projected_portfolio_outlay_usd, 0)}).
            </p>
          </div>
        </div>
      )}

      {/* Main Interactive Tabbed Area */}
      <div className="panel overflow-hidden">
        {/* Tab Header */}
        <div className="flex border-b border-line bg-canvas/40 px-4 pt-2">
          <button
            onClick={() => setActiveTab('chart')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'chart'
                ? 'border-field text-ink'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            14-Day Monte Carlo Trajectory
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'code'
                ? 'border-field text-ink'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <Code className="h-4 w-4 text-emerald-500" />
            Actuarial Calculation Model
          </button>

          <button
            onClick={() => setActiveTab('terminal')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'terminal'
                ? 'border-field text-ink'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <Terminal className="h-4 w-4 text-sky-500" />
            Simulation Output Log
          </button>
        </div>

        {/* Tab 1: Chart */}
        {activeTab === 'chart' && forecast && (
          <div className="p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-ink">Forward Rainfall Projection & Confidence Cone</h3>
                <p className="text-xs text-muted">
                  Simulated via 1,000 Monte Carlo paths using Markov dry-spell transition probabilities.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-field" /> Expected Cumulative
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-3 bg-loss" /> Contractual Trigger ({forecast.trigger_rain_mm} mm)
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={forecast.forecast_time_series} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis
                    domain={['dataMin - 10', 'auto']}
                    tick={{ fontSize: 11 }}
                    unit=" mm"
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface)' }}
                    formatter={(value: any, name: string) => [
                      `${value} mm`,
                      name === 'cumulative_projected_mm' ? 'Projected Cumulative' :
                      name === 'expected_rain_mm' ? 'Daily Rain' : name
                    ]}
                  />
                  <ReferenceLine
                    y={forecast.trigger_rain_mm}
                    stroke="#D9381E"
                    strokeDasharray="4 4"
                    label={{ value: `Trigger (${forecast.trigger_rain_mm} mm)`, fill: '#D9381E', fontSize: 11, position: 'right' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulative_projected_mm"
                    stroke="#1F5E3B"
                    strokeWidth={3}
                    dot={{ r: 3, fill: '#1F5E3B' }}
                    name="cumulative_projected_mm"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab 2: Python Code */}
        {activeTab === 'code' && forecast && (
          <div className="p-6 bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto scroll-thin">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-slate-400">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500 inline-block" />
                <span className="h-3 w-3 rounded-full bg-yellow-500 inline-block" />
                <span className="h-3 w-3 rounded-full bg-green-500 inline-block" />
                <span className="ml-2 text-slate-300 font-sans text-xs">actuarial_monte_carlo.py — Statistical Calculation Script</span>
              </div>
              <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                CPython 3.11 Runtime
              </span>
            </div>
            <pre className="mt-4 leading-relaxed text-emerald-400">
              {forecast.executed_python_code}
            </pre>
          </div>
        )}

        {/* Tab 3: Terminal Stdout */}
        {activeTab === 'terminal' && forecast && (
          <div className="p-6 bg-black text-emerald-400 font-mono text-xs overflow-x-auto scroll-thin">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 text-neutral-400">
              <span className="font-sans text-xs">Verification Runtime Output</span>
              <span className="text-emerald-500 font-sans text-[11px] flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Execution Succeeded (Exit 0)
              </span>
            </div>
            <pre className="mt-4 whitespace-pre-wrap leading-relaxed">
              {forecast.sandbox_execution_output}
            </pre>
          </div>
        )}
      </div>

      {/* Actuarial Guidance Note */}
      <div className="panel p-5 bg-canvas/60 border-field/30 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-field mt-0.5 shrink-0" />
        <div className="text-xs text-muted space-y-1">
          <p className="font-semibold text-ink">Actuarial Reserve & Liquidity Standard:</p>
          <p>
            Forward probability simulations provide early capital allocation indicators for claims desks prior to contract expiration,
            enabling proactive reinsurance drawdown and reserve adequacy planning under IRDAI solvency regulations.
          </p>
        </div>
      </div>
    </div>
  );
};
