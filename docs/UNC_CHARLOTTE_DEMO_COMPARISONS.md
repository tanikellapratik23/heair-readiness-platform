# UNC Charlotte comparison-demo data

The application protects peer comparisons with a minimum of five **other**
completed accounts in the same stakeholder group and institution. A person's
own assessment is never counted as one of their peers.

For a live demonstration, the optional seed creates six clearly labelled
synthetic accounts for each of the six active stakeholder groups at
**University of North Carolina at Charlotte** (36 accounts total). Every
synthetic account is in the department `HEARMES Demo Data — Do Not Interpret`,
uses the `demo-comparison.*@hearmes.test` address pattern, and has a complete,
current 17-item assessment. The data will appear in comparison aggregates, so
it is strictly demo data and must not be used in research analysis or exports.

## Render deployment setup

1. In the Render web service, open **Environment** and add
   `UNC_CHARLOTTE_DEMO_COMPARISONS` with the value `true`.
2. Save the variable and trigger a deploy. On startup, the service creates the
   data once. Future starts only check that the complete demo set exists.
3. Open any real UNC Charlotte account that has a completed assessment. Its
   stakeholder-group comparison will have at least six other completed peers.
   The university-wide readiness view will also have at least 36 completed
   synthetic respondents.
4. After the demo setup deployment succeeds, delete the environment variable.
   The created demo records stay in the database until deliberately removed.

## Repair or remove the demo set

- To recreate the accounts, temporarily set
  `UNC_CHARLOTTE_DEMO_COMPARISONS_RESET=true` together with
  `UNC_CHARLOTTE_DEMO_COMPARISONS=true`, deploy, then remove the reset flag.
  This deletes and recreates only the exact synthetic demo accounts.
- Before real data collection, research export, or reporting, set
  `UNC_CHARLOTTE_DEMO_COMPARISONS=remove`, deploy once, confirm the log says
  the accounts were removed, then delete the variable. This does not delete
  normal UNC Charlotte accounts or results.

For a local database, run:

```bash
npm run db:seed:unc-charlotte-demo-comparisons
```
