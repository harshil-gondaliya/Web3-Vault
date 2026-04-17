"use client";

import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ethers } from "ethers";
import { useAuth } from "../context/AuthContext";
import { saveTransaction } from "@/lib/walletStorage";

const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/U0Yd59RzhjcGfs5Q6Erzc";

export default function Receive() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  // Initialize wallet address from sessionStorage (active wallet)
  const [walletAddress] = useState(() => {
    if (typeof window !== 'undefined') {
      const address = sessionStorage.getItem("activeWalletAddress");
      if (!address) {
        setTimeout(() => {
          alert("Please unlock your wallet first");
          window.location.href = "/";
        }, 0);
        return "";
      }
      return address;
    }
    return "";
  });

  const copyAddress = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Function to check for incoming transactions
  const checkIncomingTransactions = useCallback(async () => {
    if (!walletAddress || !user) return;

    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      
      // Get current block number
      const currentBlock = await provider.getBlockNumber();
      const lastChecked = parseInt(localStorage.getItem(`lastCheckedBlock_${walletAddress}`)) || currentBlock - 1;
      
      // Check recent blocks for transactions to this address
      for (let i = lastChecked + 1; i <= currentBlock; i++) {
        try {
          const block = await provider.getBlock(i, true);
          if (!block || !block.transactions) continue;
          
          // Check each transaction in the block
          for (const txHash of block.transactions) {
            try {
              const tx = await provider.getTransaction(txHash);
              if (!tx || !tx.to) continue;
              
              // Check if this transaction is to our wallet
              if (tx.to.toLowerCase() === walletAddress.toLowerCase()) {
                const receipt = await provider.getTransactionReceipt(txHash);
                if (receipt && receipt.status === 1) {
                  // Transaction successful
                  const amountInEth = ethers.formatEther(tx.value);
                  
                  // Check if we already saved this transaction
                  const savedKey = `saved_tx_${txHash}`;
                  if (!localStorage.getItem(savedKey)) {
                    // Save to Firestore
                    await saveTransaction(user.uid, walletAddress, {
                      hash: txHash,
                      type: "receive",
                      asset: "ETH",
                      to: walletAddress,
                      from: tx.from,
                      amount: amountInEth,
                      status: "confirmed"
                    });
                    
                    // Mark as saved to avoid duplicates
                    localStorage.setItem(savedKey, "true");
                    
                    // Show notification
                    if (parseFloat(amountInEth) > 0) {
                      alert(`✅ Received ${amountInEth} ETH from ${tx.from.slice(0, 6)}...${tx.from.slice(-4)}!`);
                    }
                  }
                }
              }
            } catch (txError) {
              // Skip transactions that fail to fetch
              console.log("Error fetching transaction:", txError.message);
            }
          }
        } catch (blockError) {
          console.log("Error fetching block:", blockError.message);
        }
      }
      
      // Update last checked block
      localStorage.setItem(`lastCheckedBlock_${walletAddress}`, currentBlock.toString());
    } catch (error) {
      console.error("Error checking incoming transactions:", error);
    }
  }, [walletAddress, user]);

  // Start monitoring for incoming transactions
  useEffect(() => {
    if (!walletAddress || !user) return;

    // Initialize last checked block on first load
    const initializeMonitoring = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const currentBlock = await provider.getBlockNumber();
        
        // Only set if not already set
        const storageKey = `lastCheckedBlock_${walletAddress}`;
        if (!localStorage.getItem(storageKey)) {
          localStorage.setItem(storageKey, currentBlock.toString());
        }
      } catch (error) {
        console.error("Error initializing monitoring:", error);
      }
    };

    initializeMonitoring();
    const startTimer = setTimeout(() => {
      setIsMonitoring(true);
    }, 0);
    
    // Check immediately on mount
    checkIncomingTransactions();

    // Check every 15 seconds
    const interval = setInterval(() => {
      checkIncomingTransactions();
    }, 15000);

    return () => {
      clearTimeout(startTimer);
      clearInterval(interval);
      setIsMonitoring(false);
    };
  }, [walletAddress, user, checkIncomingTransactions]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Receive Crypto</h1>
          <p className="page-description">Share your wallet address to receive crypto</p>
        </div>
      </div>

      <div className="receive-container">
        <div className="receive-card">
          <div className="qr-section">
            {walletAddress ? (
              <div className="qr-code-container">
                <QRCodeSVG 
                  value={walletAddress}
                  size={256}
                  level="H"
                  includeMargin={true}
                  className="qr-code"
                />
              </div>
            ) : (
              <div className="qr-placeholder">
                <svg className="w-48 h-48" viewBox="0 0 200 200" fill="none">
                  <rect x="10" y="10" width="50" height="50" fill="currentColor" />
                  <rect x="70" y="10" width="10" height="10" fill="currentColor" />
                  <rect x="90" y="10" width="10" height="10" fill="currentColor" />
                  <rect x="110" y="10" width="10" height="10" fill="currentColor" />
                  <rect x="140" y="10" width="50" height="50" fill="currentColor" />
                  <rect x="10" y="70" width="10" height="10" fill="currentColor" />
                  <rect x="50" y="70" width="10" height="10" fill="currentColor" />
                  <rect x="70" y="70" width="10" height="10" fill="currentColor" />
                  <rect x="140" y="70" width="10" height="10" fill="currentColor" />
                  <rect x="180" y="70" width="10" height="10" fill="currentColor" />
                  <rect x="10" y="90" width="10" height="10" fill="currentColor" />
                  <rect x="30" y="90" width="10" height="10" fill="currentColor" />
                  <rect x="50" y="90" width="10" height="10" fill="currentColor" />
                  <rect x="90" y="90" width="30" height="30" fill="currentColor" />
                  <rect x="140" y="90" width="10" height="10" fill="currentColor" />
                  <rect x="160" y="90" width="10" height="10" fill="currentColor" />
                  <rect x="180" y="90" width="10" height="10" fill="currentColor" />
                  <rect x="10" y="110" width="10" height="10" fill="currentColor" />
                  <rect x="50" y="110" width="10" height="10" fill="currentColor" />
                  <rect x="70" y="110" width="10" height="10" fill="currentColor" />
                  <rect x="140" y="110" width="10" height="10" fill="currentColor" />
                  <rect x="180" y="110" width="10" height="10" fill="currentColor" />
                  <rect x="10" y="140" width="50" height="50" fill="currentColor" />
                  <rect x="70" y="140" width="10" height="10" fill="currentColor" />
                  <rect x="90" y="140" width="10" height="10" fill="currentColor" />
                  <rect x="110" y="140" width="10" height="10" fill="currentColor" />
                  <rect x="140" y="140" width="50" height="50" fill="currentColor" />
                </svg>
              </div>
            )}
            <p className="qr-hint">Scan QR code to get address</p>
            {isMonitoring && (
              <div className="monitoring-badge">
                <span className="monitoring-dot"></span>
                Monitoring for incoming transactions...
              </div>
            )}
          </div>

          <div className="address-section">
            <label className="address-label">Your Wallet Address</label>
            {walletAddress ? (
              <div className="address-display">
                <div className="address-text-full">{walletAddress}</div>
                <button 
                  className={`copy-address-btn ${copied ? 'copied' : ''}`}
                  onClick={copyAddress}
                >
                  {copied ? (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Address
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="empty-state">
                <p>No wallet address available</p>
              </div>
            )}
          </div>

          <div className="network-info">
            <div className="network-badge">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              Ethereum Network
            </div>
          </div>
        </div>

        <div className="info-panel">
          <div className="info-card">
            <div className="info-icon warning">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="info-title">Important Information</h3>
            <ul className="info-list">
              <li>Only send Ethereum (ETH) and ERC-20 tokens to this address</li>
              <li>Sending other cryptocurrencies may result in permanent loss</li>
              <li>Always verify the network before receiving funds</li>
              <li>Small test transactions are recommended for new addresses</li>
            </ul>
          </div>

          <div className="info-card">
            <div className="info-icon">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="info-title">Supported Assets</h3>
            <div className="supported-assets">
              <div className="supported-asset">
                <span className="asset-icon-small">⟠</span>
                <span>ETH</span>
              </div>
              <div className="supported-asset">
                <span className="asset-icon-small">₮</span>
                <span>USDT</span>
              </div>
              <div className="supported-asset">
                <span className="asset-icon-small">⓪</span>
                <span>USDC</span>
              </div>
              <div className="supported-asset">
                <span className="asset-icon-small">+</span>
                <span>All ERC-20</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
