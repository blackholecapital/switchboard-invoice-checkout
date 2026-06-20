# Billing360 Invoice PDF Pay Now Link

Use a real URL in downloaded/static invoices. A PDF/print window cannot call a React `onClick` handler.

```ts
const invoiceCheckoutBase =
  import.meta.env.VITE_INVOICE_CHECKOUT_URL ||
  "https://switchboard-invoice-checkout.pages.dev";

const invoiceCheckoutUrl =
  `${invoiceCheckoutBase}/${encodeURIComponent(invoiceNo)}` +
  `?invoice=${encodeURIComponent(invoiceNo)}` +
  `&amount=${encodeURIComponent(String(total))}` +
  `&email=${encodeURIComponent(selectedCustomer?.email || "")}` +
  `&customer=${encodeURIComponent(entityName(selectedCustomer) || "")}` +
  `&source=billing360`;
```

Render the PDF/static Pay Now as:

```tsx
<a
  href={invoiceCheckoutUrl}
  target="_blank"
  rel="noreferrer"
  className="mt-4 inline-flex rounded-lg bg-blue-600 px-5 py-3 text-sm font-black text-white"
>
  Pay Now
</a>
```

Expected checkout URL:

```text
https://switchboard-invoice-checkout.pages.dev/INV-4510?invoice=INV-4510&amount=5&email=Albert.Einstein%40example.com&customer=Albert%20Einstein&source=billing360
```
