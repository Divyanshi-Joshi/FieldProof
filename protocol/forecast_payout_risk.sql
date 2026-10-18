-- FieldProof Allowlisted Query: 14-Day Forward Predictive Basis-Risk Actuarial Forecasting
-- BigQuery ML ARIMA_PLUS Inference with dynamic logistic basis-risk payout probability
SELECT
  county,
  CAST(forecast_timestamp AS STRING) AS forecast_date,
  forecast_value AS expected_rain_mm,
  prediction_interval_lower_bound AS lower_rain_mm,
  prediction_interval_upper_bound AS upper_rain_mm,
  -- Basis risk payout probability: chance cumulative forecast dips below percentile trigger
  ROUND(1.0 / (1.0 + EXP(0.15 * (forecast_value - @trigger_threshold_mm))), 3) AS payout_probability
FROM
  ML.FORECAST(MODEL `fieldproof.rainfall_forecast_model`,
              STRUCT(14 AS horizon, 0.9 AS confidence_level))
WHERE county = @county
ORDER BY forecast_timestamp ASC;
