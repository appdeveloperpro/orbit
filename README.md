# Orbit — Referral & Unilevel MLM Demo

An in-memory NestJS backend for exploring referral trees and unilevel commission calculations. It uses seeded mock members and a demo-only login; data and sessions reset whenever the server restarts. No real payments or payouts are processed.

## Run locally

```powershell
npm install
npm run dev
```

The admin app is served by Vite at `http://localhost:5173`, with `/api` requests proxied to the NestJS API at `http://localhost:3000/api`. Set `PORT` to use a different API port.

For a production-style local run:

```powershell
npm run build
npm start
```

The production build serves the dashboard and API together at `http://localhost:3000`.

## Demo login

`POST /api/auth/login`

```json
{
  "email": "demo@unilevel.test",
  "password": "Demo123!"
}
```

Use the returned `accessToken` in the `Authorization: Bearer <accessToken>` header for all other endpoints. This is a mock in-memory session, not production authentication.

## Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Create a demo session |
| `GET` | `/api/members` | List seeded and added members |
| `GET` | `/api/members/tree` | Get the full referral tree |
| `GET` | `/api/members/:id` | Get one member |
| `GET` | `/api/members/:id/tree` | Get one member and descendants |
| `POST` | `/api/members` | Add a mock member and record a $100 demo joining order |
| `PATCH` | `/api/members/:id/status` | Activate or deactivate a member |
| `GET` | `/api/commissions/rates` | Get the ten unilevel rates by upline level |
| `PUT` | `/api/commissions/rates` | Update exactly ten rates in basis points; together they may not exceed 80% |
| `POST` | `/api/commissions/simulate` | Simulate qualifying turnover and calculate unilevel and pool allocations |
| `GET` | `/api/commissions/ledger` | Read simulated ledger entries |
| `GET` | `/api/orders` | List qualifying orders created by the simulator |
| `GET` | `/api/payouts` | List pending, held, and completed demo payout allocations |
| `PATCH` | `/api/payouts/:id/status` | Change a demo payout status; this never transfers funds |
| `GET` | `/api/ranks/rules` | Read rank qualification and reward rules |
| `PUT` | `/api/ranks/rules` | Update the ten rank reward labels and amounts; referral thresholds and tier order stay fixed |
| `GET` | `/api/ranks/progress` | View each member's current rank and next-tier progress |
| `GET` | `/api/ranks/rewards` | List earned milestone rewards and their fulfillment status |
| `PATCH` | `/api/ranks/rewards/:id/status` | Approve or fulfill a demo rank reward |
| `GET` | `/api/settings` | Read demo workspace settings |
| `PUT` | `/api/settings` | Update the workspace and admin display names |

## Demo compensation rules transcribed from the supplied PDF

- **Joining amount:** each new demo member automatically creates a $100 joining order. No payment is collected. The seeded referral members also have mock $100 joining orders; the root member has no sponsor and no seeded joining order.
- **First income — team turnover pool:** 20% of each qualifying order is split equally among active uplines within the first ten sponsor positions. If there are fewer eligible uplines, the full pool is split among those available. Inactive uplines do not receive a share. Any cent remainder goes to the nearest eligible upline. If there are no eligible uplines, the pool is undistributed.
- **Second income — unilevel:** the default level rates are **15%, 10%, 5%, 3%, 2%, 1%, 1%, 1%, 1%, 1%**. Each rate is applied to the full qualifying order amount at its corresponding sponsor level. Inactive uplines receive nothing, but their positions are not skipped when applying rates. Rates remain editable, but exactly ten levels are kept and their combined percentage is capped at 80%, so the fixed 20% pool plus unilevel rates cannot exceed turnover.
- **Third income — rank rewards:** Star requires three active direct referrals and pays $10. Each next tier requires three direct members who have achieved the preceding tier: Double Star $30, Triple Star $90, Fourth Star $270, and Five Star $810. The PDF says to continue the same pattern for levels 6–10; Six through Ten Star values ($2,430 to $196,830) are inferred by continuing the visible ×3 sequence. Reward descriptions and amounts can be edited; tier qualification and order stay fixed. Each qualified milestone appears in the demo reward approval/fulfillment queue.
- **Withdrawals and charges:** the minimum simulated withdrawal is $10 per member. A withdrawal action marks that member's entire available pending income balance (commission, pool share, and rank rewards) paid once it reaches $10. Each rank reward is a cash-income ledger/payout entry; fulfilling its award marks that reward paid. There are no modeled deposit, withdrawal, or service charges. No real money is transferred.

The above is a literal demo interpretation of the handwritten notes: the 20% pool is split among the joining member's active upline (the example shows ten uplines), while the separate level income follows the listed ten rates. The three income streams are visible in the income ledger and simulated payout queue.

Commission rates use basis points: `1500` is 15%, `1000` is 10%, and `100` is 1%. A `referenceId` can only be simulated once during the current server run. Amounts are limited to two decimal places.

Example simulation body:

```json
{
  "sourceMemberId": "mem-007",
  "amount": 100.00,
  "referenceId": "order-demo-001"
}
```

## Important

The admin dashboard includes overview charts, member management and CSV export, an interactive referral tree, automatic $100 joining orders, simulated turnover, the 20% turnover pool, configurable ten-level unilevel commissions, payout review with the $10 minimum, a combined ledger for all three income streams, the PDF rank and reward ladder, reports, and workspace settings. Historical-looking overview trend data is illustrative.

Payout and reward actions only change in-memory demo statuses; they do not transfer funds or fulfill real rewards. This project is for local demonstration only. It does not include persistent storage, production-grade authentication, compliance controls, real payout processing, or financial/accounting guarantees. Do not use it to manage real members or funds.
