# Google Sheet Header Template

Use this exact header row in the first row of your Google Sheet.

## Column order for lead and win tracking

1. recordType
2. fullName
3. mobile
4. age
5. gender
6. fitnessGoal
7. currentWeight
8. targetWeight
9. experience
10. startDate
11. contactMethod
12. wonOffer
13. rewardCode
14. spinId
15. timestamp

## Notes
- `recordType` will be either `lead` or `win`.
- `mobile` should be stored as text to avoid formula parsing issues.
- `wonOffer`, `rewardCode`, and `spinId` will be empty for lead entries.
- `timestamp` stores when the row was written.
