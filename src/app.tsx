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

  const amount = Number(params.get("amount") || params.get("total") || "0");
  const email = params.get("email") || "";
  const customer = params.get("customer") || params.get("name") || "Customer";
  const source = params.get("source") || "billing360";
  const receiver =
    params.get("receiver") ||
    params.get("wallet") ||
    DEFAULT_SUI_RECEIVER;

  return { invoice, amount, email, customer, source, receiver };
}

export default function App() {
  const initial = useMemo(getParams, []);
  const [method, setMethod] = useState<Method>("card");

  const [invoice, setInvoice] = useState(initial.invoice);
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

  const cardCheckout = () => {
    const params = new URLSearchParams({
      invoice,
      amount: String(amountNumber),
      email,
      customer,
      source: initial.source,
    });

    window.location.href = `${CARD_CHECKOUT_URL}?${params.toString()}`;
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

      const coins = await client.getCoins({
        owner: account.address,
        coinType: SUI_USDC_COIN_TYPE,
      });

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

      const result = await signAndExecute.mutateAsync({
        transaction: tx,
      });

      showNotice(
        `Sui USDC payment submitted. Invoice ${invoice}. TX: ${
          result?.digest || "pending"
        }`,
        "success"
      );
    } catch (error: any) {
      showNotice(error?.message || "Sui USDC payment failed.", "error");
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
