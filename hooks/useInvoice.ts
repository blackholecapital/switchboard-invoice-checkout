
import { parseInvoiceFromUrl } from "../invoice";
export function useInvoice() {
  return parseInvoiceFromUrl();
}
