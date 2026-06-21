// @ts-nocheck
import React, { useMemo, useState } from "react";
import {
  ConnectButton,
  useConnectWallet,
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
  useWallets,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import {
  CARD_CHECKOUT_URL,
  DEFAULT_SUI_RECEIVER,
  SUI_USDC_COIN_TYPE,
  SUI_USDC_DECIMALS,
  SWITCHBOARD_CRM_API,
} from "./config";

type Method = "card" | "usdc" | "applepay" | "paypal" | "venmo" | "googlepay";

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(value) ? value : 0);
}

function shortAddress(address?: string) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
}

function cleanPathInvoice() {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
  if (!path || path === "index.html") return "";
  return decodeURIComponent(path.split("/")[0] || "");
}

function getParams() {
  const params = new URLSearchParams(window.location.search);

  const pathInvoice = cleanPathInvoice();

  const invoice =
    params.get("invoice") ||
    params.get("invoiceNo") ||
    pathInvoice ||
    "INV-0001";

  const invoiceId =
    params.get("id") ||
    params.get("invoiceId") ||
    invoice;

  const amount = Number(params.get("amount") || params.get("total") || "0");
  const email = params.get("email") || "";
  const customer = params.get("customer") || params.get("name") || "Customer";
  const source = params.get("source") || "billing360";
  const receiver =
    params.get("receiver") ||
    params.get("wallet") ||
    DEFAULT_SUI_RECEIVER;

  return { invoice, invoiceId, amount, email, customer, source, receiver };
}

export default function App() {
  const initial = useMemo(getParams, []);
  const [method, setMethod] = useState<Method>("card");

  const [invoice, setInvoice] = useState(initial.invoice);
  const [invoiceId, setInvoiceId] = useState(initial.invoiceId || initial.invoice);
  const [amount, setAmount] = useState(
    initial.amount > 0 ? String(initial.amount) : ""
  );
  const [email, setEmail] = useState(initial.email);
  const [customer, setCustomer] = useState(initial.customer);
  const [receiver, setReceiver] = useState(initial.receiver);

  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"info" | "error" | "success">("info");
  const [busy, setBusy] = useState(false);

  const account = useCurrentAccount();
  const wallets = useWallets();
  const connectWallet = useConnectWallet();
  const client = useSuiClient();
  const signAndExecute = useSignAndExecuteTransaction();

  const amountNumber = Number(amount || 0);

  const showNotice = (
    message: string,
    type: "info" | "error" | "success" = "info"
  ) => {
    setNotice(message);
    setNoticeType(type);
  };
const cardCheckout = async () => {
  try {
    setBusy(true);

    const response = await fetch(CARD_CHECKOUT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        checkout_id: invoiceId || invoice,
        mode: "payment",

        success_url:
          "https://showroom.xyz-labs.xyz/checkout/success",

        cancel_url:
          "https://showroom.xyz-labs.xyz/cart",

        callback_url:
          `${SWITCHBOARD_CRM_API.replace(/\/$/, "")}/invoices/${encodeURIComponent(invoiceId || invoice)}/mark-paid`,

        metadata: {
          invoice_no: invoice,
          source: initial.source || "billing360",
        },

        email,

        line_items: [
          {
            product_id: invoice,
            name: `Invoice ${invoice}`,
            quantity: 1,
            unit_amount: Math.round(amountNumber * 100),
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "Checkout creation failed");
    }

    window.location.href = data.redirect_url;
  } catch (err: any) {
    showNotice(err.message || "Card checkout failed", "error");
  } finally {
    setBusy(false);
  }
};

  const connectSpecificWallet = async (wallet: any) => {
    try {
      setBusy(true);
      showNotice(`Opening ${wallet.name}...`);
      await connectWallet.mutateAsync({ wallet });
      showNotice(`${wallet.name} connected.`, "success");
    } catch (error: any) {
      showNotice(error?.message || `Could not connect ${wallet.name}.`, "error");
    } finally {
      setBusy(false);
    }
  };

  const payWithSuiUsdc = async () => {
    try {
      setBusy(true);
      showNotice("");

      if (!account?.address) {
        throw new Error("Connect a Sui wallet first.");
      }

      if (!receiver) {
        throw new Error("Receiving wallet is not configured.");
      }

      if (!amountNumber || amountNumber <= 0) {
        throw new Error("Invoice amount is missing.");
      }

      const amountRaw = BigInt(
        Math.round(Number(amountNumber || 0) * 10 ** SUI_USDC_DECIMALS)
      );
console.log("GET_COINS_START");
console.log("owner", account.address);
console.log("coinType", SUI_USDC_COIN_TYPE);
      const coins = await client.getCoins({
        owner: account.address,
        coinType: SUI_USDC_COIN_TYPE,
      });
console.log("COINS", coins);
      if (!coins.data.length) {
        throw new Error("No Sui USDC balance found in this wallet.");
      }

      const balance = coins.data.reduce(
        (sum: bigint, coin: any) => sum + BigInt(coin.balance),
        0n
      );

      if (balance < amountRaw) {
        throw new Error("Insufficient Sui USDC balance.");
      }

      const tx = new Transaction();
      const primaryCoin = tx.object(coins.data[0].coinObjectId);

      if (coins.data.length > 1) {
        tx.mergeCoins(
          primaryCoin,
          coins.data.slice(1).map((coin: any) => tx.object(coin.coinObjectId))
        );
      }

      const [paymentCoin] = tx.splitCoins(primaryCoin, [tx.pure.u64(amountRaw)]);
      tx.transferObjects([paymentCoin], tx.pure.address(receiver));
console.log("SIGNING_TRANSACTION");
console.log("amountRaw", amountRaw.toString());
      const result = await signAndExecute.mutateAsync({
        transaction: tx,
      });

      const txDigest = result?.digest || "";
      const callbackBase = SWITCHBOARD_CRM_API.replace(/\/$/, "");
      const callbackInvoiceId = invoiceId || invoice;

      if (!txDigest) {
        throw new Error("Payment was signed, but no transaction digest was returned.");
      }

      const confirmedTx = await client.waitForTransaction({
        digest: txDigest,
        options: {
          showEffects: true,
          showBalanceChanges: true,
        },
      });

      const receiptPayload = {
        invoiceId: callbackInvoiceId,
        invoiceNo: invoice,
        invoice,
        id: callbackInvoiceId,
        status: "paid",
        paid: true,
        txDigest,
        transactionDigest: txDigest,
        digest: txDigest,
        payment_provider: "sui_usdc",
        provider: "sui_usdc",
        method: "sui_usdc",
        amount: amountNumber,
        currency: "USDC",
        customer,
        email,
        payerWallet: account.address,
        receiverWallet: receiver,
        network: "sui-mainnet",
        source: initial.source || "payme-checkout",
        paidAt: new Date().toISOString(),
        transaction: confirmedTx,
      };

     const receiptEndpoints = [
  `${callbackBase}/invoices/${encodeURIComponent(callbackInvoiceId)}/mark-paid`,
];

      let receiptSent = false;
      let lastReceiptError = "";

      for (const endpoint of receiptEndpoints) {
        try {
          console.log("SENDING_PAYMENT_RECEIPT", endpoint, receiptPayload);

          // IMPORTANT:
          // This endpoint only needs the invoice UUID in the URL.
          // Do not send JSON headers here. application/json triggers a browser
          // CORS preflight from pay.xyz-labs.xyz to switchboard.xyz-labs.xyz.
          // Curl works because it does not enforce browser CORS.
          const confirmResponse = await fetch(endpoint, {
            method: "POST",
            mode: "cors",
            credentials: "omit",
            keepalive: true,
          });

          const responseText = await confirmResponse.clone().text().catch(() => "");

          console.log(
            "PAYMENT_RECEIPT_RESPONSE",
            endpoint,
            confirmResponse.status,
            responseText
          );

          if (confirmResponse.ok) {
            receiptSent = true;
            break;
          }

          lastReceiptError = `${confirmResponse.status} ${responseText}`;
          console.warn("PAYMENT_RECEIPT_REJECTED", endpoint, lastReceiptError);
        } catch (receiptError: any) {
          lastReceiptError = receiptError?.message || String(receiptError);
          console.warn("PAYMENT_RECEIPT_FAILED", endpoint, receiptError);
          console.error("RECEIPT_NAME", receiptError?.name);
          console.error("RECEIPT_MESSAGE", receiptError?.message);

          try {
            // Last-resort production fallback:
            // no-cors still sends the POST, but the browser hides the response.
            // The backend route was proven to work with a bodyless POST.
            await fetch(endpoint, {
              method: "POST",
              mode: "no-cors",
              credentials: "omit",
              keepalive: true,
            });

            console.log("PAYMENT_RECEIPT_NO_CORS_SENT", endpoint);
            receiptSent = true;
            lastReceiptError = "";
            break;
          } catch (fallbackError: any) {
            lastReceiptError =
              fallbackError?.message ||
              receiptError?.message ||
              String(fallbackError || receiptError);
            console.warn("PAYMENT_RECEIPT_NO_CORS_FAILED", endpoint, fallbackError);
          }
        }
      }

      if (!receiptSent) {
        throw new Error(
          `Payment succeeded on-chain, but receipt callback failed: ${lastReceiptError}`
        );
      }

      showNotice(
        `Sui USDC payment confirmed and receipt sent. Invoice ${invoice}. TX: ${txDigest}`,
        "success"
      );
   } catch (error: any) {
  console.error("PAYMENT_ERROR", error);

  console.log("account", account?.address);
  console.log("receiver", receiver);
  console.log("amount", amount);
  console.log("amountNumber", amountNumber);

  showNotice(
    error?.message || "Sui USDC payment failed.",
    "error"
  );
} finally {
      setBusy(false);
    }
  };

  const payLabel =
    method === "card"
      ? "Pay with Card"
      : method === "usdc"
      ? `Pay ${money(amountNumber)} USDC on Sui`
      : method === "applepay"
      ? "Pay with Apple Pay"
      : method === "googlepay"
      ? "Pay with Google Pay"
      : method === "paypal"
      ? "Pay with PayPal"
      : "Pay with Venmo";

  return (
    <main className="page">
      <section className="checkout">
        <article className="panel left-panel">
          <div className="grow">
            <h1>Payment request</h1>
            <p className="subcopy">Fast card or Sui USDC checkout.</p>

            <label>Invoice</label>
            <input
              value={invoice}
              onChange={(event) => setInvoice(event.target.value)}
              placeholder="INV-0001"
            />

            <label>Email</label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="customer@example.com"
              type="email"
            />

            <label>Amount</label>
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="5.00"
              type="number"
              step="0.01"
              min="0"
            />

            <label>Customer</label>
            <input
              value={customer}
              onChange={(event) => setCustomer(event.target.value)}
              placeholder="Customer"
            />

            <div className="section-title">Payment requests</div>

            <button className="request-card selected" type="button">
              <span>
                <b>{invoice}</b>
                <small>{customer}</small>
                <small>{email || "No email captured"} · open</small>
                <small>ID: {invoice}</small>
              </span>
              <strong>{money(amountNumber)}</strong>
            </button>
          </div>

          <footer>Powered by PayMe</footer>
        </article>

        <article className="panel right-panel">
          <h2>Summary</h2>

          <div className="summary-row">
            <span>{customer || "Invoice payment"}</span>
            <strong>{money(amountNumber)}</strong>
          </div>
          <div className="summary-row muted">
            <span>Discount</span>
            <span>- $0.00</span>
          </div>
          <div className="divider" />
          <div className="total-row">
            <span>Total</span>
            <strong>{money(amountNumber)}</strong>
          </div>

          <label>Coupon</label>
          <div className="coupon-row">
            <input placeholder="Enter code" />
            <button type="button">Apply</button>
          </div>

          <div className="section-title">Pay with</div>

          <div className="wallet-grid top-methods">
            <button
              type="button"
              className={method === "applepay" ? "active" : ""}
              onClick={() => setMethod("applepay")}
            >
              Apple Pay
            </button>
            <button
              type="button"
              className={method === "paypal" ? "active" : ""}
              onClick={() => setMethod("paypal")}
            >
              PayPal
            </button>
            <button
              type="button"
              className={method === "venmo" ? "active" : ""}
              onClick={() => setMethod("venmo")}
            >
              Venmo
            </button>
            <button
              type="button"
              className={method === "googlepay" ? "active" : ""}
              onClick={() => setMethod("googlepay")}
            >
              Google Pay
            </button>
            <button type="button" disabled>
              More
            </button>
          </div>

          <div className="wallet-grid main-methods">
            <button
              type="button"
              className={method === "card" ? "active" : ""}
              onClick={() => setMethod("card")}
            >
              💳 Card
            </button>
            <button
              type="button"
              className={method === "usdc" ? "active" : ""}
              onClick={() => setMethod("usdc")}
            >
              <span className="coin-icon">$</span> USDC
            </button>
          </div>

          {method === "usdc" ? (
            <div className="sui-box">
              <div className="sui-row">
                <span>Network</span>
                <strong>Sui Mainnet</strong>
              </div>
              <div className="sui-row">
                <span>Wallet</span>
                <strong>
                  {account?.address ? shortAddress(account.address) : "Not connected"}
                </strong>
              </div>
              <div className="sui-row">
                <span>Receiver</span>
                <strong>{shortAddress(receiver)}</strong>
              </div>

              {!account?.address ? (
                <div className="connect-area">
                  <ConnectButton />
                  <div className="wallet-list">
                    {wallets.length ? (
                      wallets.map((wallet: any) => (
                        <button
                          key={wallet.name}
                          type="button"
                          disabled={busy || connectWallet.isPending}
                          onClick={() => connectSpecificWallet(wallet)}
                        >
                          Connect {wallet.name}
                        </button>
                      ))
                    ) : (
                      <div className="wallet-empty">
                        No Sui wallets discovered. Open Slush, Phantom, Backpack, or another Sui wallet extension and refresh.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              <label>Receiving Sui USDC Wallet</label>
              <input
                value={receiver}
                onChange={(event) => setReceiver(event.target.value)}
                placeholder="0x..."
              />
            </div>
          ) : null}

          <button
            className="pay-button"
            type="button"
            disabled={busy || signAndExecute.isPending}
            onClick={method === "usdc" ? payWithSuiUsdc : cardCheckout}
          >
            {busy || signAndExecute.isPending ? "Processing..." : payLabel}
          </button>

          {notice ? (
            <div className={`notice ${noticeType}`}>{notice}</div>
          ) : null}

          <footer>Powered by PayMe</footer>
        </article>
      </section>
    </main>
  );
}
