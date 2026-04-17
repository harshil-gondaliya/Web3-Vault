"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ethers } from "ethers";
import { useAuth } from "../context/AuthContext";
import { saveTransaction } from "@/lib/walletStorage";
import { useRouter } from "next/navigation";

const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/U0Yd59RzhjcGfs5Q6Erzc";
const TOKEN_ADDRESS = "0x1830201b517Aa755FA25e3b3ADDB3974D97caC54";

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

export default function Send() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [selectedAsset, setSelectedAsset] = useState("ETH");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  
  const [address, setAddress] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [balance, setBalance] = useState("0");
  const [tokenBalance, setTokenBalance] = useState("0");
  const [tokenSymbol, setTokenSymbol] = useState("");

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

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    
    const savedAddress = sessionStorage.getItem("activeWalletAddress");
    if (!savedAddress) {
      alert("Please unlock your wallet first");
      router.push("/");
      return;
    }
    setAddress(savedAddress);
    
    // Check if unlocked (private key in sessionStorage for this session)
    const tempPk = sessionStorage.getItem("tempPrivateKey");
    if (!tempPk) {
      alert("Wallet is locked. Please unlock first.");
      router.push("/");
      return;
    }
    
    setPrivateKey(tempPk);
    fetchBalances(savedAddress);
  }, [fetchBalances, user, router]);

  const assets = [
    { symbol: "ETH", name: "Ethereum", balance: balance, icon: "⟠" },
    ...(tokenSymbol ? [{ symbol: tokenSymbol, name: tokenSymbol, balance: tokenBalance, icon: "₮" }] : [])
  ];

  const selectedAssetData = assets.find(a => a.symbol === selectedAsset);

  const handleSend = async () => {
    if (!recipient || !amount) {
      alert("Enter receiver address and amount");
      return;
    }

    if (!privateKey) {
      alert("Wallet is locked 🔒");
      router.push("/");
      return;
    }

    if (!user) {
      alert("Please sign in");
      router.push("/login");
      return;
    }

    try {
      setLoading(true);
      setTxHash("");

      const wallet = new ethers.Wallet(privateKey, provider);

      let tx;
      if (selectedAsset === "ETH") {
        // Send ETH
        tx = await wallet.sendTransaction({
          to: recipient.trim(),
          value: ethers.parseEther(amount),
        });
        setTxHash(tx.hash);
        
        // Wait for confirmation
        await tx.wait();
        
        // Save confirmed transaction to Firestore
        await saveTransaction(user.uid, address, {
          hash: tx.hash,
          type: "send",
          asset: "ETH",
          to: recipient.trim(),
          from: address,
          amount: amount,
          status: "confirmed"
        });
        
        alert("Transaction successful! ✅");
      } else {
        // Send Token
        const contract = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, wallet);
        const decimals = await contract.decimals();
        const amountInWei = ethers.parseUnits(amount, decimals);
        tx = await contract.transfer(recipient.trim(), amountInWei);
        setTxHash(tx.hash);
        
        // Wait for confirmation
        await tx.wait();
        
        // Save confirmed transaction to Firestore
        await saveTransaction(user.uid, address, {
          hash: tx.hash,
          type: "send",
          asset: tokenSymbol,
          to: recipient.trim(),
          from: address,
          amount: amount,
          status: "confirmed"
        });
        
        alert("Token transfer successful! ✅");
      }

      // Refresh balances
      await fetchBalances(address);
      setRecipient("");
      setAmount("");
    } catch (err) {
      console.error("Transaction error:", err);
      alert("Transaction failed ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Send Crypto</h1>
          <p className="page-description">Send crypto to another wallet</p>
        </div>
      </div>

      <div className="send-form-container">
        <div className="send-form-card">
          {/* Asset Selection */}
          <div className="form-group">
            <label className="form-label">Select Asset</label>
            <div className="asset-selector">
              {assets.map((asset) => (
                <button
                  key={asset.symbol}
                  onClick={() => setSelectedAsset(asset.symbol)}
                  className={`asset-option ${selectedAsset === asset.symbol ? 'selected' : ''}`}
                >
                  <span className="asset-option-icon">{asset.icon}</span>
                  <div className="asset-option-info">
                    <div className="asset-option-symbol">{asset.symbol}</div>
                    <div className="asset-option-balance">Balance: {asset.balance}</div>
                  </div>
                  {selectedAsset === asset.symbol && (
                    <svg className="w-5 h-5 check-icon" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Recipient Address */}
          <div className="form-group">
            <label className="form-label">
              Recipient Address
              <span className="required">*</span>
            </label>
            <div className="input-with-icon">
              <input
                type="text"
                className="form-input"
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value.trim())}
              />
              <button className="input-icon-btn" title="Scan QR">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </button>
            </div>
            <div className="form-hint">Enter the recipient&apos;s wallet address</div>
          </div>

          {/* Amount */}
          <div className="form-group">
            <label className="form-label">
              Amount
              <span className="required">*</span>
            </label>
            <div className="amount-input-container">
              <input
                type="text"
                className="form-input amount-input"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="amount-asset">{selectedAsset}</div>
              <button 
                className="max-btn"
                onClick={() => setAmount(selectedAssetData?.balance || "0")}
              >
                MAX
              </button>
            </div>
            <div className="amount-info">
              <span>Available: {selectedAssetData?.balance} {selectedAsset}</span>
              <span className="amount-usd">≈ $0.00</span>
            </div>
          </div>

          {/* Gas Fee Preview */}
          <div className="gas-fee-section">
            <div className="gas-fee-header">
              <span className="gas-label">Network Fee (Gas)</span>
              <button className="gas-edit-btn">Edit</button>
            </div>
            <div className="gas-fee-details">
              <div className="gas-row">
                <span className="gas-key">Gas Price:</span>
                <span className="gas-value">25 Gwei</span>
              </div>
              <div className="gas-row">
                <span className="gas-key">Gas Limit:</span>
                <span className="gas-value">21,000</span>
              </div>
              <div className="gas-row total">
                <span className="gas-key">Total Fee:</span>
                <span className="gas-value">≈ 0.000525 ETH ($1.04)</span>
              </div>
            </div>
          </div>

          {/* Transaction Summary */}
          <div className="tx-summary">
            <div className="summary-row">
              <span className="summary-label">You Send</span>
              <span className="summary-value">{amount || '0.00'} {selectedAsset}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Network Fee</span>
              <span className="summary-value">≈ 0.000525 ETH</span>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-row total">
              <span className="summary-label">Total</span>
              <span className="summary-value">{amount || '0.00'} {selectedAsset}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="form-actions">
            <button className="btn-outline-full" onClick={() => window.location.href = "/"}>Cancel</button>
            <button 
              className="btn-primary-full"
              onClick={handleSend}
              disabled={loading}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              {loading ? "Sending..." : "Confirm & Send"}
            </button>
          </div>

          {/* Transaction Hash */}
          {txHash && (
            <div className="tx-result">
              <div className="tx-result-label">Transaction Hash:</div>
              <a 
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tx-result-hash"
              >
                {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </a>
            </div>
          )}
        </div>

        {/* Info Panel */}
        <div className="info-panel">
          <div className="info-card">
            <div className="info-icon">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="info-title">Important Notes</h3>
            <ul className="info-list">
              <li>Double-check the recipient address before sending</li>
              <li>Transactions cannot be reversed</li>
              <li>Network fees may vary based on congestion</li>
              <li>Ensure sufficient balance for gas fees</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
