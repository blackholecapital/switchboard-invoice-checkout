# Switchboard Invoice Checkout - Fixed Drop-in

This patch keeps the PayMe two-card checkout screen and fixes:

1. Path invoice parsing, e.g. `/INV-4510`
2. Query parameter ingestion:
   - `invoice`
   - `invoiceNo`
   - `amount`
   - `total`
   - `email`
   - `customer`
   - `name`
   - `source`
   - `receiver` or `wallet`
3. Editable invoice/email/amount/customer fields when Billing360 does not pass params.
4. Explicit Sui wallet buttons using `useWallets()` and `useConnectWallet()`.
5. Existing `ConnectButton` remains in place.
6. Sui USDC transfer via:
   - `useCurrentAccount`
   - `useSuiClient`
   - `useSignAndExecuteTransaction`
   - `Transaction`
7. Card checkout redirect remains unchanged.

## Drop-in files

Copy these into the repo root:

```text
package.json
src/main.tsx
src/app.tsx
src/config.ts
src/style.css
BILLING360_LINK_SNIPPET.md
```

Then run:

```bash
npm install
npm run build
```

## Cloudflare Pages env vars

```text
VITE_SUI_USDC_RECEIVER=0xYourSuiReceivingWallet
VITE_CARD_CHECKOUT_URL=https://api.xyz-labs.xyz/checkout/create
```
