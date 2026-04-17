"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ethers } from "ethers";

const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/U0Yd59RzhjcGfs5Q6Erzc";
const TOKEN_ADDRESS = "0x1830201b517Aa755FA25e3b3ADDB3974D97caC54";

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

export default function Assets() {
  const [balance, setBalance] = useState("");
  const [tokenBalance, setTokenBalance] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [walletAddress] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return sessionStorage.getItem("activeWalletAddress") || localStorage.getItem("address") || "";
  });

  const provider = useMemo(() => new ethers.JsonRpcProvider(RPC_URL), []);

  const fetchBalances = useCallback(async (addr) => {
    try {
      const bal = await provider.getBalance(addr);
      setBalance(ethers.formatEther(bal));

      const contract = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, provider);
      const rawBalance = await contract.balanceOf(addr);
      const decimals = await contract.decimals();
      const symbol = await contract.symbol();
      const formatted = ethers.formatUnits(rawBalance, decimals);
      setTokenBalance(formatted);
      setTokenSymbol(symbol);
    } catch (err) {
      console.error("Error fetching balances:", err);
    }
  }, [provider]);

  useEffect(() => {
    if (walletAddress) {
      const timer = setTimeout(() => {
        fetchBalances(walletAddress);
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [fetchBalances, walletAddress]);

  const assets = [
    { 
      symbol: "ETH", 
      name: "Ethereum", 
      balance: balance || "0.00", 
      price: "$1,985.43",
      value: balance ? `$${(parseFloat(balance) * 1985.43).toFixed(2)}` : "$0.00", 
      change24h: "", 
      positive: true, 
      icon: "⟠" 
    },
    ...(tokenBalance && tokenSymbol ? [{
      symbol: tokenSymbol,
      name: tokenSymbol,
      balance: tokenBalance,
      price: "",
      value: "",
      change24h: "",
      positive: true,
      icon: "₮"
    }] : [])
  ];

  const totalValue = assets.reduce((sum, asset) => {
    if (!asset.value) return sum;
    const val = parseFloat(asset.value.replace(/[$,]/g, ''));
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Assets</h1>
          <p className="page-description">View and manage your crypto assets</p>
        </div>
        <div className="total-portfolio">
          <div className="portfolio-label">Total Portfolio Value</div>
          <div className="portfolio-value">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
      </div>

      <div className="assets-table-container">
        <table className="assets-table">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Price</th>
              <th>Balance</th>
              <th>Value</th>
              <th>24h Change</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.symbol}>
                <td>
                  <div className="asset-cell">
                    <div className="asset-icon-table">{asset.icon}</div>
                    <div>
                      <div className="asset-symbol-table">{asset.symbol}</div>
                      <div className="asset-name-table">{asset.name}</div>
                    </div>
                  </div>
                </td>
                <td className="price-cell">{asset.price || "-"}</td>
                <td className="balance-cell">{asset.balance}</td>
                <td className="value-cell">{asset.value || "-"}</td>
                <td>
                  {asset.change24h ? (
                    <span className={`change-badge ${asset.positive ? 'positive' : 'negative'}`}>
                      {asset.change24h}
                    </span>
                  ) : (
                    <span>-</span>
                  )}
                </td>
                <td>
                  <div className="table-actions">
                    <button className="table-btn" onClick={() => window.location.href = '/send'}>Send</button>
                    <button className="table-btn" onClick={() => window.location.href = '/receive'}>Receive</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
