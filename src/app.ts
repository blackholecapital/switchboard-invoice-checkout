import React, { useState } from "react";
import ReactDOM from "react-dom/client";

const WALLET =
  "0x1c72d3d74d9b06683935d9ae7077cb489833550cfbb75c4e0a1c16f35d86e440";

function App() {
  const params = new URLSearchParams(window.location.search);

  const invoice = params.get("invoice") || "INV-0001";
  const amount = Number(params.get("amount") || 3).toFixed(2);

  const [method, setMethod] = useState<"card" | "usdc">("card");

  const payCard = () => {
    window.location.href =
      "/checkout/create?invoice=" +
      encodeURIComponent(invoice) +
      "&amount=" +
      encodeURIComponent(amount);
  };

  const payUSDC = () => {
    window.location.href =
      "/checkout/usdc?invoice=" +
      encodeURIComponent(invoice) +
      "&amount=" +
      encodeURIComponent(amount);
  };

  return (
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: "#0b1220",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            background: "white",
            padding: 24,
            borderRadius: 16,
            width: 420,
          },
        },
        React.createElement("h1", null, "Invoice " + invoice),
        React.createElement("h2", null, "$" + amount),

        React.createElement(
          "button",
          { onClick: () => setMethod("card") },
          "Card"
        ),

        React.createElement(
          "button",
          { onClick: () => setMethod("usdc") },
          "USDC"
        ),

        method === "card"
          ? React.createElement(
              "button",
              { onClick: payCard },
              "Pay with Card"
            )
          : React.createElement(
              "button",
              { onClick: payUSDC },
              "Pay with USDC"
            )
      )
    )
  );
}

export function renderApp(el: HTMLElement) {
  ReactDOM.createRoot(el).render(React.createElement(App));
}
