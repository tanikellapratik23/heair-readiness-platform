# AI Coach evaluation accounts

This command creates twelve clearly labeled, synthetic accounts for the Coach-output analysis. It does not use participant information. The accounts belong to **Project HEARMES Coach Evaluation (Synthetic)**, a separate institution, so their results cannot affect UNC Charlotte or another real institution's comparison data.

## Create accounts through a Render deployment

This works on Render's free compute plan; it does not require the paid Render Shell.

1. In the Render web service, open **Environment** and add
   `COACH_EVALUATION_PASSWORD` with a unique shared password of at least 12 characters.
2. Save the variable, then deploy the current code. The service creates the
   accounts while starting. Check the deploy logs for `Coach-evaluation accounts checked`.
3. Once the deploy is live, remove `COACH_EVALUATION_PASSWORD` from Render and
   save. Removing the variable does **not** remove the accounts; it simply
   prevents a future accidental replacement run.

### Reset the shared password if needed

If the accounts already exist and the shared password is unknown or was typed
incorrectly, temporarily set both of these Render environment variables before
deploying:

```text
COACH_EVALUATION_PASSWORD=<new unique password of at least 12 characters>
COACH_EVALUATION_RESET=true
```

This recreates only the twelve synthetic evaluation accounts and changes them
to the new password. It also clears **only their** prior evaluation chats,
uploaded private context, action-plan items, assessments, and reports. Remove
both variables after the deployment succeeds.

If the accounts already exist with a completed assessment, an ordinary restart
makes no changes. The manual command below is only for an intentional clean
replacement of the synthetic evaluation set:

```bash
COACH_EVALUATION_PASSWORD='choose-a-unique-password' npm run db:seed:coach-eval
```

Either path affects only the twelve synthetic accounts' sessions, reports,
conversations, private context, and action-plan items. It does not alter any
other user account.

## Accounts

Sign in with the shared password and one account at a time:

- `coach-eval.student.low@hearmes.test`
- `coach-eval.student.high@hearmes.test`
- `coach-eval.faculty.low@hearmes.test`
- `coach-eval.faculty.high@hearmes.test`
- `coach-eval.executive_leadership.low@hearmes.test`
- `coach-eval.executive_leadership.high@hearmes.test`
- `coach-eval.administrative_staff.low@hearmes.test`
- `coach-eval.administrative_staff.high@hearmes.test`
- `coach-eval.programming_staff.low@hearmes.test`
- `coach-eval.programming_staff.high@hearmes.test`
- `coach-eval.finance_staff.low@hearmes.test`
- `coach-eval.finance_staff.high@hearmes.test`

Each account has one completed 17-subdimension assessment and a deterministic saved report. The low and high profiles deliberately emphasize different areas by role so the Coach can be evaluated for score- and role-aware guidance.

## Evaluation prompts

Open the saved report, start a new Coach conversation, and ask these exact prompts:

1. `What does my score mean?`
2. `What should I prioritize?`
3. `Give me a 30-day plan.`

Save the Coach response, sources displayed by the Coach, date/time, configured model, profile ID, and prompt. Do not upload real policies or participant data to these test accounts.
