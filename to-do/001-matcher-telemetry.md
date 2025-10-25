# Matcher Telemetry Enhancements

## Summary
Add structured telemetry for task selection decisions, capturing priority ordering, review-lock skips, and final picks to support observability and debugging.

## Rationale
- Current logging is human friendly but not machine parsable, making it hard to analyze matcher behavior over time.
- Telemetry enables dashboards that surface starvation or priority inversions.

## Suggested Steps
1. Introduce a `TelemetryPort` in `src/core/ports` with methods for recording matcher events.
2. Implement a Winston transport adapter that emits JSON to stdout and optional file sink.
3. Emit events inside `pickNextTask` for each filtered candidate, including reason and remaining queue length.
4. Expand tests to assert telemetry invocations via spies.

## Expected Impact
Improves operational visibility and speeds up diagnosing why tasks are skipped or delayed.***
