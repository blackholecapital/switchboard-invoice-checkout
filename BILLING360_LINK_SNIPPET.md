# Billing360 Invoice PDF Pay Now Link

Use a real URL in downloaded/static invoices. A PDF/print window cannot call a React `onClick` handler.

Generate the link like this:

```ts
const invoiceCheckoutBase =
  import.meta.env.VITE_INVOICE_CHECKOUT_URL ||
  "https://switchboard-invoice-checkout.pages.dev";

const invoiceCheckoutUrl =
  `${invoiceCheckoutBase}/?invoice=${encodeURIComponent(invoiceNo)}` +
  `&amount=${encodeURIComponent(String(total))}` +
  `&email=${encodeURIComponent(selectedCustomer?.email || "")}` +
  `&customer=${encodeURIComponent(entityName(selectedCustomer) || "")}` +
  `&source=billing360`;
```

Then render the PDF Pay Now as:

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
