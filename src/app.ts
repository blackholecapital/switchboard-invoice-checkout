import React, { useState } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";

const RECEIVER =
  "0x1c72d3d74d9b06683935d9ae7077cb489833550cfbb75c4e0a1c16f35d86e440";

export default function App() {
  const params = new URLSearchParams(window.location.search);

  const invoice = params.get("invoice") || "INV-0001";
  const amount = Number(params.get("amount") || 3);

  const [method, setMethod] = useState<"card" | "usdc">("card");

  const account = useCurrentAccount();
  const sign = useSignAndExecuteTransaction();

  const payCard = () => {
    window.location.href =
      "https://pay.xyz-labs.xyz/checkout/create?invoice=" +
      invoice +
      "&amount=" +
      amount;
  };

  const payUSDC = async () => {
    if (!account?.address) {
      alert("Connect wallet first");
      return;
    }

    const tx = new Transaction();

    // simplified transfer (production version uses coin split)
    tx.transferObjects([], RECEIVER);

    await sign.mutateAsync({
      transaction: tx
    });
  };

  return (
    <div className="wrap">
      <div className="card">
        <h1>Invoice {invoice}</h1>
        <h2>${amount.toFixed(2)}</h2>

        <div className="row">
          <button onClick={() => setMethod("card")}>Card</button>
          <button onClick={() => setMethod("usdc")}>USDC</button>
        </div>

        {method === "card" && (
          <button className="pay" onClick={payCard}>
            Pay with Card
          </button>
        )}

        {method === "usdc" && (
          <button className="pay" onClick={payUSDC}>
            Pay with SUI Wallet (USDC)
          </button>
        )}
      </div>
    </div>
  );
}
