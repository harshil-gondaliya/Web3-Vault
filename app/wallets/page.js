"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import CryptoJS from "crypto-js";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import {
  loadUserWallets,
  checkPrivateKeyExists,
  saveEncryptedKey,
  saveWalletMetadata
} from "@/lib/walletStorage";

export default function Wallets() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [importPrivateKey, setImportPrivateKey] = useState("");
  const [importPassword, setImportPassword] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Load wallets when user is authenticated
  useEffect(() => {
    if (user) {
      loadWallets();
    }
  }, [user]);

  const loadWallets = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const userWallets = await loadUserWallets(user.uid);
      
      // Check which wallets have keys available locally
      const walletsWithKeyStatus = userWallets.map(wallet => ({
        ...wallet,
        hasLocalKey: checkPrivateKeyExists(user.uid, wallet.address),
        isActive: sessionStorage.getItem("activeWalletAddress") === wallet.address
      }));
      
      setWallets(walletsWithKeyStatus);
    } catch (error) {
      console.error("❌ Error loading wallets:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const shortenAddress = (addr) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const resetImportForm = () => {
    setImportPrivateKey("");
    setImportPassword("");
    setImportError("");
  };

  const handleImportWallet = async () => {
    setImportError("");
    setImportSuccess("");

    const normalizedPrivateKey = importPrivateKey.trim();
    const normalizedPassword = importPassword.trim();

    if (!normalizedPrivateKey || !normalizedPassword) {
      setImportError("Please enter private key and wallet password");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser?.uid) {
      setImportError("User not authenticated");
      return;
    }

    setImportLoading(true);
    try {
      // Validate private key by constructing an ethers wallet.
      const importedWallet = new ethers.Wallet(normalizedPrivateKey);
      const address = importedWallet.address;

      // Prevent duplicate wallet records for the same user.
      const existingWallets = await loadUserWallets(currentUser.uid);
      const alreadyExists = existingWallets.some(
        (wallet) => wallet.address?.toLowerCase() === address.toLowerCase()
      );

      if (alreadyExists) {
        setImportError("Wallet already added");
        return;
      }

      // Encrypt locally and never persist plaintext private key remotely.
      const encryptedKey = CryptoJS.AES.encrypt(normalizedPrivateKey, normalizedPassword).toString();
      saveEncryptedKey(currentUser.uid, address, encryptedKey);

      await saveWalletMetadata(currentUser.uid, {
        address,
        name: "Imported Wallet"
      });

      await loadWallets();
      resetImportForm();
      setShowImportForm(false);
      setImportSuccess("Wallet imported successfully");
    } catch (error) {
      if (error?.message?.toLowerCase().includes("invalid")) {
        setImportError("Invalid private key");
      } else {
        console.error("❌ Error importing wallet:", error);
        setImportError("Failed to import wallet");
      }
    } finally {
      setImportLoading(false);
    }
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

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Wallets</h1>
          <p className="page-description">Manage your crypto wallets ({wallets.length})</p>
        </div>
        <div className="flex gap-3">
          <button
            className="btn-outline"
            onClick={() => {
              setImportSuccess("");
              setImportError("");
              setShowImportForm((prev) => !prev);
            }}
          >
            Import Wallet
          </button>
          <button className="btn-primary" onClick={() => router.push("/")}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Wallet
          </button>
        </div>
      </div>

      {importSuccess && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {importSuccess}
        </div>
      )}

      {showImportForm && (
        <div className="mb-6 wallet-card">
          <h3 className="wallet-name mb-3">Import Wallet</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Private Key</label>
              <input
                type="text"
                value={importPrivateKey}
                onChange={(e) => setImportPrivateKey(e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Wallet Password</label>
              <input
                type="password"
                value={importPassword}
                onChange={(e) => setImportPassword(e.target.value)}
                placeholder="Enter password for encryption"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                autoComplete="new-password"
              />
            </div>

            {importError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {importError}
              </div>
            )}

            <div className="flex gap-2">
              <button className="btn-primary" onClick={handleImportWallet} disabled={importLoading}>
                {importLoading ? "Importing..." : "Import"}
              </button>
              <button
                className="btn-outline"
                onClick={() => {
                  resetImportForm();
                  setShowImportForm(false);
                }}
                disabled={importLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="wallets-grid">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
          </div>
        ) : wallets.length > 0 ? (
          wallets.map((wallet) => (
            <div key={wallet.id} className={`wallet-card ${wallet.isActive ? 'active' : ''}`}>
              {wallet.isActive && (
                <div className="active-badge">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Active
                </div>
              )}
              
              <div className="wallet-icon-large">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>

              <div className="wallet-info">
                <h3 className="wallet-name">{wallet.name}</h3>
                <div className="wallet-address-display">
                  <span className="address-text">{shortenAddress(wallet.address)}</span>
                  <button
                    className="copy-icon-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(wallet.address);
                      alert("Address copied!");
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                {!wallet.hasLocalKey && (
                  <div className="text-xs text-red-500 mt-2">
                    ⚠️ Private key not available on this device
                  </div>
                )}
              </div>

              {wallet.balance && <div className="wallet-balance-large">{wallet.balance}</div>}

              <div className="wallet-actions">
                <button 
                  className="btn-outline" 
                  onClick={() => router.push("/")}
                  disabled={!wallet.hasLocalKey}
                >
                  {wallet.hasLocalKey ? "Unlock Wallet" : "Key Missing"}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <svg className="w-16 h-16 empty-icon mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <p className="mb-4">No wallets found. Create your first wallet to get started!</p>
            <button className="btn-primary" onClick={() => router.push("/")}>
              Create Wallet
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
