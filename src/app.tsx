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

  const coinType =
    "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC";

  const amountRaw = BigInt(Math.round(amount * 1e6));

  const coins = await client.getCoins({
    owner: account.address,
    coinType,
  });

  if (!coins.data.length) {
    alert("No USDC found");
    return;
  }

  const primary = tx.object(coins.data[0].coinObjectId);

  if (coins.data.length > 1) {
    tx.mergeCoins(
      primary,
      coins.data.slice(1).map((c) => tx.object(c.coinObjectId))
    );
  }

  const [payment] = tx.splitCoins(primary, [
    tx.pure.u64(amountRaw),
  ]);

  tx.transferObjects([payment], RECEIVER);

  await sign.mutateAsync({
    transaction: tx,
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
