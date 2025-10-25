# Usage Budget Forecasting

## Summary
Enhance the Usage Manager with predictive budgeting that accounts for historical burn rates and upcoming scheduled tasks.

## Rationale
- Current daily/hourly budgets are static and reactive; they do not anticipate large jobs or under-utilization trends.
- Forecasting allows the system to allocate more tokens to critical windows proactively.

## Suggested Steps
1. Persist daily token consumption history under `workspace/usage-history.json`.
2. Implement exponential smoothing or simple moving average forecasting for the next 48 hours.
3. Expose `getForecast()` alongside `hasTokens()` so matchers can adjust scheduling.
4. Add documentation and integration tests covering boundary cases (no history, sudden spikes).

## Expected Impact
Reduces risk of exhausting token budgets mid-run and boosts overall task throughput by aligning budgets with demand.***
