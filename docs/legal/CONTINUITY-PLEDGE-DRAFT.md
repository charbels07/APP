> **DRAFT prepared from the app's code — to be reviewed and completed by a lawyer / DPO before
> use. Not legal advice.**
>
> A promise to families about what happens to the child's voice if something happens to us.
> Assessment item: 15.13. Each promise says whether the app already keeps it today or what must
> be built first. Publish only the promises marked "kept today", or build the rest first.

# Our continuity pledge

A child who communicates with Daleth AAC depends on it the way another child depends on their
voice. These are our promises for the day something goes wrong: our server, our money, our
company.

## Our promises

| # | Promise | Kept today? |
|---|---|---|
| 1 | **The board on the child's device keeps working without us.** It is stored on the device and speaks with the device's own voice, without internet. | Yes: the board is kept on the device and works offline. **But** see the warning below |
| 2 | **We never switch off the board remotely**, whatever happens to a subscription. | No remote switch exists. Billing is not built: write this rule into it |
| 3 | **The words stay in their places.** No update moves the child's core words. | Yes: rule of the project, tested at every release |
| 4 | **You can take everything with you, at any time**: the whole board in an open format (Open Board Format, `.obz`) that other AAC apps can read, all your data in one file ("Download all my data"), and printed boards ("Print / PDF"). | Yes |
| 5 | **We give you at least `[6 months]` of notice** before closing the service, in the app and by e-mail, in French, English and Arabic. | A commitment of the company |
| 6 | **During that time everything keeps working**, and we remind you how to export. | A commitment of the company |
| 7 | **After closing, we delete your data** on our servers, and our backups expire (`[60]` days at most 90). We never sell it with the company's assets. | Deletion tools exist; the closing procedure is to write |
| 8 | **If another company takes over the app**, it must keep these promises, or you are told before anything changes and can leave with your data. | To write in any sale contract |
| 9 | **A prepaid amount is not lost**: `[refund rule for yearly subscriptions and professionals' one-time payment — to write with billing and the stores' rules]`. | To write |
| 10 | **The code is kept safe for families**: `[source code escrow, or publication under an open licence if the company closes — to decide]`. | To decide |

## Warning to fix before publishing promise 1

Today, when the app starts and the server **refuses** the account's session (not "no internet",
but an answer that the session is not valid), the app erases the copy of the board kept on that
device, except changes that were never sent (`forgetEverything({ keepUnsent: true })` in
`src/state/Session.tsx`). That is right for privacy on a shared device. It is wrong for a closing
service, or for a server that answers errors during an outage.

Before this promise is published:

- a mode that **keeps a board on a device without an account** ("keep this board on this
  tablet"), offered in the closing notice and available in the app;
- a test of what the app does when the server answers with errors (not network errors);
- a closing procedure that never ends sessions or deletes accounts before families had the time
  to switch.

## What happens in each case

| What happens | The child's board | Sync, team, follow-up | Your data |
|---|---|---|---|
| No internet | Works | Waits, then catches up | Safe |
| Our server is down | Works | Waits | Safe; restored from backups if lost |
| Your subscription ends *(billing to come)* | Works (promise 2) | `[to write with billing]` | Kept until you delete it |
| We close the service | Works (promise 1, once the warning is fixed) | Stops at the end of the notice | Exported by you, then deleted by us |
| Another company takes over | Works | Continues | Promise 8 |

## Contact

DALETH, Beirut, Lebanon — `daleth.contact@gmail.com`.
