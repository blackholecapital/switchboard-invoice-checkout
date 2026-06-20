import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";

const networks = {
  mainnet: { url: getFullnodeUrl("mainnet") }
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <SuiClientProvider networks={networks} defaultNetwork="mainnet">
    <WalletProvider autoConnect>
      <App />
    </WalletProvider>
  </SuiClientProvider>
);
