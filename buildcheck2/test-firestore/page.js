"use client";

import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { loadUserWallets } from "@/lib/walletStorage";
import { collection, getDocs, getFirestore } from "firebase/firestore";
import app from "@/lib/firebase";

export default function TestFirestore() {
  const { user } = useAuth();
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setResult("Testing Firestore connection...\n\n");

    try {
      const db = getFirestore(app);
      
      // Test 1: Check if Firestore is accessible
      setResult(prev => prev + "✅ Firestore initialized\n");
      
      // Test 2: Check authentication
      if (!user) {
        setResult(prev => prev + "❌ No user authenticated\n");
        setLoading(false);
        return;
      }
      setResult(prev => prev + `✅ User authenticated: ${user.uid}\n\n`);
      
      // Test 3: Try to read all wallets (without filter)
      setResult(prev => prev + "📡 Attempting to read all documents from 'wallets' collection...\n");
      const allWallets = await getDocs(collection(db, "wallets"));
      setResult(prev => prev + `✅ Found ${allWallets.size} total wallet(s) in database\n\n`);
      
      // Test 4: Try to read user's wallets
      setResult(prev => prev + `📡 Loading wallets for user: ${user.uid}...\n`);
      const userWallets = await loadUserWallets(user.uid);
      setResult(prev => prev + `✅ Found ${userWallets.length} wallet(s) for this user\n\n`);
      
      // Test 5: Display wallet details
      if (userWallets.length > 0) {
        setResult(prev => prev + "📋 Wallet Details:\n");
        userWallets.forEach((wallet, idx) => {
          setResult(prev => prev + `\n${idx + 1}. ${wallet.name}\n`);
          setResult(prev => prev + `   Address: ${wallet.address}\n`);
          setResult(prev => prev + `   ID: ${wallet.id}\n`);
          setResult(prev => prev + `   UID: ${wallet.uid}\n`);
        });
      } else {
        setResult(prev => prev + "⚠️ No wallets found for this user.\n");
        setResult(prev => prev + "\nPossible reasons:\n");
        setResult(prev => prev + "1. No wallets have been created yet\n");
        setResult(prev => prev + "2. Firestore rules are blocking read access\n");
        setResult(prev => prev + "3. Wallet was created with a different user ID\n");
      }
      
    } catch (error) {
      setResult(prev => prev + `\n❌ ERROR: ${error.message}\n`);
      setResult(prev => prev + `Code: ${error.code}\n`);
      setResult(prev => prev + `\nFull error: ${JSON.stringify(error, null, 2)}\n`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">🔍 Firestore Debug Tool</h1>
        <p className="page-description">Test your Firestore connection and wallet data</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {!user ? (
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">❌ Please login first to test Firestore</p>
            <button 
              className="btn-primary"
              onClick={() => window.location.href = '/login'}
            >
              Go to Login
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 p-4 bg-blue-50 rounded">
              <p className="text-sm"><strong>Logged in as:</strong> {user.email}</p>
              <p className="text-sm"><strong>User ID:</strong> {user.uid}</p>
            </div>

            <button 
              className="btn-primary mb-4"
              onClick={testConnection}
              disabled={loading}
            >
              {loading ? "Testing..." : "🧪 Run Firestore Test"}
            </button>

            {result && (
              <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm whitespace-pre-wrap max-h-96 overflow-auto">
                {result}
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold mb-2">💡 How to use this tool:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Make sure you&apos;re logged in</li>
          <li>Click &quot;Run Firestore Test&quot;</li>
          <li>Check the output for any errors</li>
          <li>If you see permission errors, deploy Firestore rules</li>
          <li>Take a screenshot of the output and share it if needed</li>
        </ol>
      </div>
    </div>
  );
}
