import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { walletConfig } from "./wallet";

const WALLET =
  "0x1c72d3d74d9b06683935d9ae7077cb489833550cfbb75c4e0a1c16f35d86e440";

function App() {
  const params = new URLSearchParams(window.location.search);

  const invoice = params.get("invoice") || "INV-0001";
  const amount = Number(params.get("amount") || 3);

  const [method, setMethod] = useState<"card" | "usdc">("card");

  const payCard = () => {
    window.location.href =
      "https://pay.xyz-labs.xyz/checkout/create?invoice=" +
      invoice +
      "&amount=" +
      amount;
  };

  const payUSDC = async () => {
    const { signAndExecuteTransaction } = await import(
      "@mysten/dapp-kit"
    );

    alert(
      "USDC payment will trigger wallet in full dapp-kit mode. Connect wallet first."
    );

    window.location.href =
      "https://pay.xyz-labs.xyz/checkout/usdc?invoice=" +
      invoice +
      "&amount=" +
      amount;
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <h1>Invoice {invoice}</h1>
        <h2>${amount.toFixed(2)}</h2>

        <button onClick={() => setMethod("card")}>Card</button>
        <button onClick={() => setMethod("usdc")}>USDC</button>

        {method === "card" && (
          <button style={styles.pay} onClick={payCard}>
            Pay with Card
          </button>
        )}

        {method === "usdc" && (
          <button style={styles.pay} onClick={payUSDC}>
            Pay with USDC (SUI Wallet)
          </button>
        )}
      </div>
    </div>
  );
}

export function renderApp(el: HTMLElement) {
  ReactDOM.createRoot(el).render(
    <SuiClientProvider>
      <WalletProvider autoConnect>
        <App />
      </WalletProvider>
    </SuiClientProvider>
  );
}

const styles: any = {
  wrap: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    background: "#0b1220"
  },
  card: {
    background: "white",
    padding: 24,
    borderRadius: 20,
    width: 420
  },
  pay: {
    width: "100%",
    marginTop: 20,
    padding: 14,
    background: "#2563eb",
    color: "white",
    border: 0,
    borderRadius: 12,
    cursor: "pointer"
  }
};
