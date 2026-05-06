# Motivation Metrics Ideas

This document tracks dashboard metric ideas intended to encourage reduced alcohol consumption through positive reinforcement, trend awareness, and actionable planning.

## Prioritized Next Metrics

1. **Streak: days under personal limit**
   - Why: Reinforces consistency and momentum.
   - Suggested display: `Current streak`, `Best streak`.

2. **Weekly trend delta**
   - Why: Frames progress as improvement over time.
   - Suggested display: `% change vs last 7 days`.

3. **Goal pace meter**
   - Why: Turns weekly target into a clear daily action plan.
   - Suggested display: `Allowed avg/day for remainder of week`.

## Additional Candidate Metrics

4. **Best week in last 8 weeks + distance to best**
   - Why: Sets realistic, personal benchmarks.
   - Suggested display: `Best 7-day total` and `Current delta from best`.

5. **High-risk day predictor**
   - Why: Helps users pre-plan for likely high-intake times.
   - Suggested display: `Most likely high-intake weekday/time window`.

6. **Money saved**
   - Why: Converts behavior into concrete financial impact.
   - Suggested display: `Estimated $ saved this week/month`.

7. **Sleep impact proxy**
   - Why: Connects drinking levels to daily wellbeing.
   - Suggested display: `Nights likely impacted this week` (simple estimate).

8. **Calories avoided / extra vs 15-drink baseline**
   - Why: Immediate physical-health framing.
   - Suggested display: `Calories saved` when under target, `Calories extra` when over.

## Design Principles for Motivation

- Prefer progress framing over shame framing.
- Highlight what users can do next, not just what already happened.
- Keep copy specific, short, and behavior-oriented.
- Use personal historical comparisons before generic thresholds.

## Implementation Notes

- Current app already supports rolling 3-day and 7-day calculations plus calorie and gram estimation.
- Most new metrics can be derived from existing `drinkLog` entries and weekly aggregations.
- Add one or two motivational metrics at a time to avoid dashboard overload.
