# Switchboard Invoice Checkout - PayMe Sui USDC Build

This is a complete Cloudflare Pages/Vite checkout app for invoice payment links.

## What this package fixes

- Renders the PayMe-style two-card checkout screen.
- Reads invoice fields from the URL:
  - `invoice`
  - `amount`
  - `email`
  - `customer`
  - `source`
  - optional `receiver`
- Keeps Card checkout as a redirect to the checkout worker.
- Uses Mysten `SuiClientProvider` + `WalletProvider`.
- Uses the connected Sui wallet to send USDC on Sui mainnet.
- Uses Sui USDC coin type:

```txt
0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC
```

## Environment variables

Set these in Cloudflare Pages:

```bash
VITE_SUI_USDC_RECEIVER=0xYourSuiReceivingWallet
VITE_CARD_CHECKOUT_URL=https://api.xyz-labs.xyz/checkout/create
```

Optional:

```bash
VITE_SUI_USDC_COIN_TYPE=0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC
```

## Build

```bash
npm install
npm run build
```

## Local dev

```bash
npm run dev
```

## Invoice link format

From Billing360 or any invoice PDF, link to:

```txt
https://switchboard-invoice-checkout.pages.dev/?invoice=INV-0001&amount=3&email=customer@example.com&customer=ABC%20Manufacturing&source=billing360
```

Optional receiver override:

```txt
&receiver=0xYourSuiReceivingWallet
```

## Payment behavior

- Card button redirects to `VITE_CARD_CHECKOUT_URL`.
- USDC button:
  1. Displays Sui wallet connection.
  2. Loads Sui USDC coin objects for the connected wallet.
  3. Merges coins if required.
  4. Splits the exact invoice amount.
  5. Transfers USDC to `VITE_SUI_USDC_RECEIVER`.
  6. Displays the submitted transaction digest.
