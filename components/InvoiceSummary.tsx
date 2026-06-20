
export default function InvoiceSummary({invoiceNo,amount,email}:any){
  return <div><h3>{invoiceNo}</h3><div>{email}</div><div>${amount}</div></div>;
}
