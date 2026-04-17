              "use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { loadWalletTransactions } from "@/lib/walletStorage";

export default function Transactions() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeWalletAddress, setActiveWalletAddress] = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Get active wallet address
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const address = sessionStorage.getItem("activeWalletAddress");
      setActiveWalletAddress(address || "");
    }
  }, []);

  // Load transactions from Firestore
  useEffect(() => {
    const loadTransactions = async () => {
      if (!user || !activeWalletAddress) return;
      
      setLoading(true);
      try {
        const txs = await loadWalletTransactions(user.uid, activeWalletAddress);
        setTransactions(txs);
      } catch (error) {
        console.error("Error loading transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, [user, activeWalletAddress]);

  const filteredTransactions = transactions.filter(tx => {
    if (filter === "all") return true;
    if (filter === "sent") return tx.type === "send";
    if (filter === "received") return tx.type === "receive";
    return true;
  });

  // Helper function to format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  // Helper function to shorten address
  const shortenAddress = (address) => {
    if (!address) return "N/A";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Helper function to shorten hash
  const shortenHash = (hash) => {
    if (!hash) return "N/A";
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
        </div>
      </div>
    );
  }

  // Must be signed in
  if (!user) {
    return null;
  }

  // Check if wallet is unlocked
  if (!activeWalletAddress) {
    return (
      <div className="page-container">
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">Please unlock your wallet first to view transactions</p>
          <button className="btn-primary" onClick={() => router.push("/")}>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-description">
            Wallet: {shortenAddress(activeWalletAddress)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`filter-tab ${filter === 'sent' ? 'active' : ''}`}
            onClick={() => setFilter('sent')}
          >
            Sent
          </button>
          <button 
            className={`filter-tab ${filter === 'received' ? 'active' : ''}`}
            onClick={() => setFilter('received')}
          >
            Received
          </button>
        </div>
        <button className="export-btn">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export
        </button>
      </div>

      {/* Transactions List */}
      <div className="transactions-table-container">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
          </div>
        ) : filteredTransactions.length > 0 ? (
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Transaction Hash</th>
                <th>Type</th>
                <th>To Address</th>
                <th>Amount</th>
                <th>Symbol</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx, index) => (
                <tr key={tx.id || tx.hash + index}>
                  <td>
                    <div className="hash-cell">
                      <span className="hash-text" title={tx.hash}>
                        {shortenHash(tx.hash)}
                      </span>
                      <button 
                        className="copy-hash-btn"
                        onClick={() => {
                          navigator.clipboard.writeText(tx.hash);
                          alert("Hash copied!");
                        }}
                        title="Copy hash"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                  <td>
                    <span className={`type-badge ${tx.type.toLowerCase()}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="asset-cell">
                    <span title={tx.to}>{shortenAddress(tx.to)}</span>
                  </td>
                  <td className="amount-cell">
                    {tx.amount}
                  </td>
                  <td className="value-cell">{tx.asset}</td>
                  <td className="timestamp-cell">{formatTimestamp(tx.timestamp)}</td>
                  <td>
                    <span className={`status-badge ${(tx.status || 'confirmed').toLowerCase()}`}>
                      {tx.status || 'Confirmed'}
                    </span>
                  </td>
                  <td>
                    <a 
                      href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="view-details-btn"
                    >
                      View Details
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <svg className="w-16 h-16 empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>No transactions yet. Your transaction history will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
