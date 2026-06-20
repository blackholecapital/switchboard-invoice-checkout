
export function parseInvoiceFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return {
    invoiceNo: window.location.pathname.replace("/", "") || "INV-0001",
    amount: Number(params.get("amount") || 0),
    email: params.get("email") || "",
    receiver: params.get("wallet") || "0x1c72...e440",
  };
}
