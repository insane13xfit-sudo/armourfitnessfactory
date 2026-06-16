# Google Apps Script Setup

Use the production script in `google-apps-script-code.gs`. Do not use the older 11-column sample format, because it writes `fullName` into the first column and shifts every value left.

## Google Sheet Header Row

Put these headers across Row 1 from A1 to O1:

```csv
recordType,fullName,mobile,age,gender,fitnessGoal,currentWeight,targetWeight,experience,startDate,contactMethod,wonOffer,rewardCode,spinId,timestamp
```

## Deploy

1. Open your Google Sheet.
2. Go to `Extensions > Apps Script`.
3. Replace `Code.gs` with the full contents of `google-apps-script-code.gs`.
4. Click `Deploy > Manage deployments`.
5. Edit the current web app deployment, choose `New version`, and deploy.
6. Keep the existing web app URL if Google shows the same `/exec` URL.

## Expected New Rows

Lead rows start like this:

```text
recordType = lead
fullName = customer name
mobile = customer mobile
```

Win rows save these extra fields:

```text
wonOffer = selected wheel prize
rewardCode = generated reward code
spinId = SPIN_<timestamp>_<random>
timestamp = ISO date-time
```
