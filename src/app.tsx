import React, { useMemo, useState } from "react";
import {
  ConnectButton,
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import {
  CARD_CHECKOUT_URL,
  DEFAULT_SUI_RECEIVER,
  SUI_USDC_COIN_TYPE,
  SUI_USDC_DECIMALS,
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

function getParams() {
  const params = new URLSearchParams(window.location.search);

  const invoice = params.get("invoice") || params.get("invoiceNo") || "INV-0001";
  const amount = Number(params.get("amount") || params.get("total") || "0");
  const email = params.get("email") || "";
  const customer = params.get("customer") || params.get("name") || "Customer";
  const source = params.get("source") || "billing360";
  const receiver = params.get("receiver") || DEFAULT_SUI_RECEIVER;

  return { invoice, amount, email, customer, source, receiver };
}

export default function App() {
  const initial = useMemo(getParams, []);
  const [method, setMethod] = useState<Method>("card");
  const [email, setEmail] = useState(initial.email);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const account = useCurrentAccount();
  const client = useSuiClient();
  const signAndExecute = useSignAndExecuteTransaction();

  const cardCheckout = () => {
    const params = new URLSearchParams({
      invoice: initial.invoice,
      amount: String(initial.amount),
      email,
      customer: initial.customer,
      source: initial.source,
    });

    window.location.href = `${CARD_CHECKOUT_URL}?${params.toString()}`;
  };

  const payWithSuiUsdc = async () => {
    try {
      setBusy(true);
      setNotice("");

      if (!account?.address) {
        throw new Error("Connect a Sui wallet first.");
      }

      if (!initial.receiver) {
        throw new Error("Receiving wallet is not configured.");
      }

      if (!initial.amount || initial.amount <= 0) {
        throw new Error("Invoice amount is missing.");
      }

      const amountRaw = BigInt(
        Math.round(Number(initial.amount || 0) * 10 ** SUI_USDC_DECIMALS)
      );

      const coins = await client.getCoins({
        owner: account.address,
        coinType: SUI_USDC_COIN_TYPE,
      });

      if (!coins.data.length) {
        throw new Error("No Sui USDC balance found in this wallet.");
      }

      const balance = coins.data.reduce(
        (sum, coin) => sum + BigInt(coin.balance),
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
          coins.data.slice(1).map((coin) => tx.object(coin.coinObjectId))
        );
      }

      const [paymentCoin] = tx.splitCoins(primaryCoin, [tx.pure.u64(amountRaw)]);
      tx.transferObjects([paymentCoin], tx.pure.address(initial.receiver));

      const result = await signAndExecute.mutateAsync({
        transaction: tx,
      });

      setNotice(`Sui USDC payment submitted. TX: ${(result as any)?.digest || "pending"}`);
    } catch (error: any) {
      setNotice(error?.message || "Sui USDC payment failed.");
    } finally {
      setBusy(false);
    }
  };

  const payLabel =
    method === "card"
      ? "Pay with Card"
      : method === "usdc"
      ? `Pay ${money(initial.amount)} USDC on Sui`
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

            <label>Email</label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="customer@example.com"
              type="email"
            />

            <div className="section-title">Payment requests</div>

            <button className="request-card selected" type="button">
              <span>
                <b>{initial.invoice}</b>
                <small>{initial.customer}</small>
                <small>{email || "No email captured"} · open</small>
                <small>ID: {initial.invoice}</small>
              </span>
              <strong>{money(initial.amount)}</strong>
            </button>
          </div>

          <footer>Powered by PayMe</footer>
        </article>

        <article className="panel right-panel">
          <h2>Summary</h2>

          <div className="summary-row">
            <span>{initial.customer || "Invoice payment"}</span>
            <strong>{money(initial.amount)}</strong>
          </div>
          <div className="summary-row muted">
            <span>Discount</span>
            <span>- $0.00</span>
          </div>
          <div className="divider" />
          <div className="total-row">
            <span>Total</span>
            <strong>{money(initial.amount)}</strong>
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
                <strong>{account?.address ? shortAddress(account.address) : "Not connected"}</strong>
              </div>
              <div className="sui-row">
                <span>Receiver</span>
                <strong>{shortAddress(initial.receiver)}</strong>
              </div>
              {!account?.address ? <ConnectButton /> : null}
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

          {notice ? <div className="notice">{notice}</div> : null}

          <footer>Powered by PayMe</footer>
        </article>
      </section>
    </main>
  );
}
