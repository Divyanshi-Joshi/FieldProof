-- ============================================================================
-- FieldProof: Google Cloud BigQuery ML (ARIMA_PLUS) Time-Series Model DDL
-- Track: BFSI / Index Insurance Basis-Risk Reconciliation
-- ============================================================================
-- Creates planetary-scale automated time-series forecasting model using BigQuery ML.
-- Uses ARIMA_PLUS with automatic hyperparameter tuning, anomaly filtering,
-- trend/seasonal decomposition, and 90% prediction intervals.
-- ============================================================================

CREATE OR REPLACE MODEL `fieldproof.rainfall_forecast_model`
OPTIONS (
  model_type = 'ARIMA_PLUS',
  time_series_timestamp_col = 'record_date',
  time_series_data_col = 'daily_rainfall_mm',
  time_series_id_col = 'county',
  horizon = 14,
  auto_arima = TRUE,
  data_frequency = 'DAILY',
  clean_spikes_and_dips = TRUE,
  adjust_step_changes = TRUE,
  holiday_region = 'IN',
  decompose_time_series = TRUE
) AS
SELECT
  record_date,
  county,
  daily_rainfall_mm
FROM
  `fieldproof.historical_weather_daily`
WHERE
  record_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 5 YEAR);

-- ============================================================================
-- Model Evaluation Syntax:
-- SELECT * FROM ML.ARIMA_EVALUATE(MODEL `fieldproof.rainfall_forecast_model`);
--
-- 14-Day Forward Predictive Basis-Risk Inference Syntax:
-- See protocol/forecast_payout_risk.sql
-- ============================================================================
