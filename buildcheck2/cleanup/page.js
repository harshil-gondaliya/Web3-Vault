"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect } from "react";

export default function CleanupPage() {
  const [status, setStatus] = useState("");
  const [cleaned, setCleaned] = useState(false);

  // Check data only on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const oldAddress = localStorage.getItem("address");
      const oldPrivateKey = localStorage.getItem("encryptedPrivateKey");
      
      if (oldAddress || oldPrivateKey) {
        setStatus("⚠️ Found old wallet data that needs cleanup");
      } else {
        setStatus("✅ No old wallet data found - you're good!");
      }
    }
  }, []);

  const cleanupOldData = () => {
    if (confirm("This will remove old wallet data from localStorage. Make sure you have your wallets backed up!\n\nContinue?")) {
      // Remove old single-wallet data
      localStorage.removeItem("address");
      localStorage.removeItem("encryptedPrivateKey");
      
      setCleaned(true);
      setStatus("✅ Old wallet data cleaned up!");
      
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">🧹 Cleanup Old Data</h1>
        <p className="page-description">Remove old wallet data and fix conflicts</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h3 className="font-semibold mb-2">⚠️ About This Tool</h3>
          <p className="text-sm text-gray-700">
            Your app was updated to support multiple wallets per user. This tool removes old single-wallet data that may conflict with the new system.
          </p>
        </div>

        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <p className="font-semibold text-lg">{status}</p>
        </div>

        {!cleaned && (
          <>
            <button 
              className="btn-primary w-full mb-4"
              onClick={cleanupOldData}
            >
              🧹 Clean Up Old Data
            </button>

            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>What this does:</strong></p>
              <ul className="list-disc list-inside ml-2">
                <li>Removes <code>localStorage.getItem(&quot;address&quot;)</code></li>
                <li>Removes <code>localStorage.getItem(&quot;encryptedPrivateKey&quot;)</code></li>
                <li>Keeps all new multi-wallet data (wallet_uid_address format)</li>
                <li>Keeps your Firestore wallet metadata</li>
              </ul>
              
              <p className="mt-4"><strong>After cleanup:</strong></p>
              <ul className="list-disc list-inside ml-2">
                <li>Dashboard and Wallets page will show the same data</li>
                <li>All pages will use Firestore for wallet metadata</li>
                <li>Private keys remain encrypted in localStorage (per-user)</li>
              </ul>
            </div>
          </>
        )}

        {cleaned && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-xl font-semibold text-green-600">Cleanup Complete!</p>
            <p className="text-sm text-gray-600 mt-2">Redirecting to dashboard...</p>
          </div>
        )}
      </div>

      <div className="mt-6 text-center">
        <button 
          className="btn-text"
          onClick={() => window.location.href = "/"}
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}
