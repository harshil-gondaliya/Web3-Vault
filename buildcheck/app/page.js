"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";
import CryptoJS from "crypto-js";
import { useAuth } from "./context/AuthContext";
import {
  loadUserWallets,
  saveWalletMetadata,
  saveEncryptedKey,
  loadEncryptedKey,
  checkPrivateKeyExists
} from "@/lib/walletStorage";
import { getStoredSettings } from "@/lib/appSettings";
import { clearActiveWalletSession } from "@/lib/walletSession";

const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/U0Yd59RzhjcGfs5Q6Erzc";
const TOKEN_ADDRESS = "0x1830201b517Aa755FA25e3b3ADDB3974D97caC54";
const AUTO_LOCK_TIME = 5 * 60 * 1000; // 5 minutes

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Wallet state
  const [userWallets, setUserWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [walletName, setWalletName] = useState("");
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  
  // Balance state
  const [balance, setBalance] = useState("");
  const [tokenBalance, setTokenBalance] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  
  // UI state
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [walletStep, setWalletStep] = useState("select"); // select, create, unlock
  const [showMissingKeyWarning, setShowMissingKeyWarning] = useState(false);
  const autoLockTimerRef = useRef(null);

  // Memoize provider creation
  const getProvider = useCallback(() => new ethers.JsonRpcProvider(RPC_URL), []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Load user's wallets from Firestore when authenticated
  useEffect(() => {
    if (user) {
      console.log("🔑 User authenticated, loading wallets...");
      loadWallets();
    } else {
      console.log("⏳ No user yet, waiting for authentication...");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]); // Only reload when user ID changes

  // Load wallets from Firestore
  const loadWallets = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError("");
    try {
      const wallets = await loadUserWallets(user.uid);
      
      // Check which wallets have keys available locally
      const walletsWithKeyStatus = wallets.map(wallet => ({
        ...wallet,
        hasLocalKey: checkPrivateKeyExists(user.uid, wallet.address)
      }));
      
      console.log("✅ Loaded", walletsWithKeyStatus.length, "wallet(s)");
      setUserWallets(walletsWithKeyStatus);
    } catch (error) {
      console.error("❌ Error loading wallets:", error);
      
      // Check if it's a permission error
      if (error.code === 'permission-denied') {
        setError("⚠️ Firestore permission denied. Please deploy firestore.rules");
      } else {
        setError(`Failed to load wallets: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch balance
  const fetchBalance = useCallback(async (pk) => {
    try {
      const privateKey = pk || sessionStorage.getItem("tempPrivateKey");
      if (!privateKey) return;
      
      const provider = getProvider();
      const wallet = new ethers.Wallet(privateKey, provider);
      const bal = await provider.getBalance(wallet.address);
      setBalance(ethers.formatEther(bal));
    } catch (err) {
      console.error("Error fetching balance:", err.message);
    }
  }, [getProvider]);

  // Fetch token balance
  const fetchTokenBalance = useCallback(async (address) => {
    try {
      const provider = getProvider();
      const contract = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, provider);
      const [rawBalance, decimals, symbol] = await Promise.all([
        contract.balanceOf(address),
        contract.decimals(),
        contract.symbol()
      ]);
      setTokenBalance(ethers.formatUnits(rawBalance, decimals));
      setTokenSymbol(symbol);
    } catch (err) {
      console.error("Error fetching token balance:", err.message);
    }
  }, [getProvider]);

  // Create wallet
  const createWallet = async () => {
    if (!password) {
      setError("Please enter a password");
      return;
    }
    
    if (!walletName.trim()) {
      setError("Please enter a wallet name");
      return;
    }

    if (!user) {
      setError("User not authenticated");
      return;
    }
    
    setError("");
    setLoading(true);

    try {
      // Use setTimeout to allow UI to update before heavy computation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Generate new wallet (CPU-intensive)
      const wallet = ethers.Wallet.createRandom();
      
      // Allow UI to breathe before encryption
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Encrypt private key with user-defined password (CPU-intensive)
      const encryptedKey = CryptoJS.AES.encrypt(wallet.privateKey, password).toString();

      // Save encrypted key to localStorage (fast, synchronous)
      saveEncryptedKey(user.uid, wallet.address, encryptedKey);

      // Save wallet metadata to Firestore FIRST
      await saveWalletMetadata(user.uid, {
        address: wallet.address,
        name: walletName.trim()
      });

      console.log("✅ Wallet created and saved successfully!");

      // Now reload wallets and fetch balances in parallel
      await Promise.all([
        loadWallets(),
        fetchBalance(wallet.privateKey),
        fetchTokenBalance(wallet.address)
      ]);

      // Auto-select and unlock the new wallet
      const newWallet = {
        address: wallet.address,
        name: walletName.trim(),
        hasLocalKey: true
      };
      setSelectedWallet(newWallet);
      setUnlocked(true);

      // Store in sessionStorage for Send page
      sessionStorage.setItem("tempPrivateKey", wallet.privateKey);
      sessionStorage.setItem("activeWalletAddress", wallet.address);

      // Reset form
      setPassword("");
      setWalletName("");
    } catch (error) {
      console.error("Error creating wallet:", error);
      setError("Failed to create wallet");
    } finally {
      setLoading(false);
    }
  };

  // Select wallet for unlocking
  const selectWallet = (wallet) => {
    setSelectedWallet(wallet);
    
    if (!wallet.hasLocalKey) {
      setShowMissingKeyWarning(true);
      return;
    }
    
    setShowMissingKeyWarning(false);
    setWalletStep("unlock");
  };

  // Unlock wallet
  const unlockWallet = async () => {
    if (!selectedWallet) {
      setError("No wallet selected");
      return;
    }

    if (!password) {
      setError("Please enter password");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Load encrypted key from localStorage
      const encryptedKey = loadEncryptedKey(user.uid, selectedWallet.address);
      
      if (!encryptedKey) {
        setError("Private key not found on this device");
        setLoading(false);
        return;
      }

      // Decrypt private key
      const bytes = CryptoJS.AES.decrypt(encryptedKey, password);
      
      if (!bytes || bytes.sigBytes <= 0) {
        throw new Error("Invalid password");
      }
      
      const pk = bytes.toString(CryptoJS.enc.Utf8);

      if (!pk || !pk.startsWith("0x")) {
        throw new Error("Invalid password");
      }

      // Verify the decrypted key matches the wallet address
      const wallet = new ethers.Wallet(pk);
      if (wallet.address.toLowerCase() !== selectedWallet.address.toLowerCase()) {
        throw new Error("Key mismatch");
      }

      setUnlocked(true);
      
      // Store in sessionStorage
      sessionStorage.setItem("tempPrivateKey", pk);
      sessionStorage.setItem("activeWalletAddress", selectedWallet.address);
      
      await fetchBalance(pk);
      await fetchTokenBalance(selectedWallet.address);
      
      setPassword("");
    } catch (err) {
      console.error("Unlock error:", err);
      setError("Wrong password ❌");
    } finally {
      setLoading(false);
    }
  };

  // Lock wallet
  const lockWallet = useCallback(() => {
    setUnlocked(false);
    setSelectedWallet(null);
    setPassword("");
    setBalance("");
    setTokenBalance("");
    setWalletStep("select");
    
    clearActiveWalletSession();
  }, []);

  useEffect(() => {
    if (!unlocked) {
      if (autoLockTimerRef.current) {
        clearTimeout(autoLockTimerRef.current);
        autoLockTimerRef.current = null;
      }
      return;
    }

    const { autoLockEnabled } = getStoredSettings();
    if (!autoLockEnabled) {
      return;
    }

    const resetAutoLockTimer = () => {
      if (autoLockTimerRef.current) {
        clearTimeout(autoLockTimerRef.current);
      }

      autoLockTimerRef.current = setTimeout(() => {
        lockWallet();
      }, AUTO_LOCK_TIME);
    };

    const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];

    resetAutoLockTimer();
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetAutoLockTimer);
    });

    return () => {
      if (autoLockTimerRef.current) {
        clearTimeout(autoLockTimerRef.current);
        autoLockTimerRef.current = null;
      }

      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetAutoLockTimer);
      });
    };
  }, [unlocked, lockWallet]);
  
  const ETH_PRICE = 1985.43;
  const assets = useMemo(() => {
    if (!balance && !tokenBalance) return [];
    
    return [
      { 
        symbol: "ETH", 
        name: "Ethereum", 
        balance: balance || "0.00", 
        value: balance ? `$${(parseFloat(balance) * ETH_PRICE).toFixed(2)}` : "$0.00", 
        icon: "⟠" 
      },
      ...(tokenBalance && tokenSymbol ? [{
        symbol: tokenSymbol,
        name: tokenSymbol,
        balance: tokenBalance,
        icon: "₮"
      }] : [])
    ];
  }, [balance, tokenBalance, tokenSymbol]);

  // Show loading while checking auth
  if (authLoading && !user) {
    return (
      <div className="unlock-container">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
        </div>
      </div>
    );
  }

  // Must be signed in to continue
  if (!user) {
    return null;
  }

  // Show unlock screen if wallet not unlocked
  if (!unlocked) {
    return (
      <div className="unlock-container">
        <div className="unlock-card">
          {/* User Info Header */}
          <div className="auth-user-info">
            <div className="flex items-center gap-3">
              {user.photoURL && (
                <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full" />
              )}
              <div>
                <p className="font-semibold text-sm">{user.displayName}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Wallet Selection */}
          {walletStep === "select" && (
            <>
              {/* Firestore Error Banner */}
              {error && error.includes('permission') && (
                <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">🚨</div>
                    <div className="flex-1">
                      <h3 className="font-bold text-red-700 mb-1">Firestore Not Configured</h3>
                      <p className="text-sm text-gray-700 mb-3">
                        Your wallets won&apos;t persist until you deploy Firestore rules.
                      </p>
                      <button 
                        className="bg-red-500 text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-600"
                        onClick={() => window.location.href = '/setup'}
                      >
                        Fix Now (2 minutes) →
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="unlock-header">
                <div className="unlock-icon">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h1 className="unlock-title">Your Wallets</h1>
                <p className="unlock-description">
                  {userWallets.length > 0 
                    ? "Select a wallet to unlock or create a new one" 
                    : "Create your first wallet to get started"}
                </p>
              </div>

              <div className="unlock-form">
                {error && (
                  <div className="error-message mb-4">
                    {error}
                    {error.includes('permission') && (
                      <div className="text-xs mt-2">
                        Run in terminal: <code className="bg-gray-800 text-white px-2 py-1 rounded">firebase deploy --only firestore:rules</code>
                      </div>
                    )}
                  </div>
                )}
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div>
                  </div>
                ) : userWallets.length > 0 ? (
                  <>
                    <div className="wallet-selector">
                      {userWallets.map((wallet) => (
                        <div 
                          key={wallet.id} 
                          className={`wallet-item ${selectedWallet?.address === wallet.address ? 'selected' : ''}`}
                          onClick={() => selectWallet(wallet)}
                        >
                          <div className="wallet-icon">💼</div>
                          <div className="wallet-details">
                            <div className="wallet-name">{wallet.name}</div>
                            <div className="wallet-address">{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}</div>
                            {!wallet.hasLocalKey && (
                              <div className="text-xs text-red-500 mt-1">⚠️ Key not found on this device</div>
                            )}
                          </div>
                          {wallet.hasLocalKey && (
                            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {showMissingKeyWarning && (
                      <div className="error-message">
                        ⚠️ Private key not found on this device. This wallet was created on another device or the key was deleted.
                      </div>
                    )}
                    
                    <button 
                      className="btn-primary w-full"
                      onClick={() => setWalletStep("create")}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create New Wallet
                    </button>
                  </>
                ) : (
                  <button 
                    className="btn-primary w-full"
                    onClick={() => setWalletStep("create")}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Your First Wallet
                  </button>
                )}
              </div>
            </>
          )}

          {/* Create Wallet */}
          {walletStep === "create" && (
            <>
              <div className="unlock-header">
                <div className="unlock-icon">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h1 className="unlock-title">Create New Wallet</h1>
                <p className="unlock-description">
                  Set a name and password for your wallet
                </p>
              </div>

              <div className="unlock-form">
                <div className="form-group">
                  <label className="form-label">Wallet Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., My Main Wallet"
                    value={walletName}
                    onChange={(e) => {
                      setWalletName(e.target.value);
                      setError("");
                    }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Wallet Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Enter a strong password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && password && walletName && createWallet()}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    ⚠️ This is NOT your Google password. Create a unique password for this wallet.
                  </p>
                </div>

                {error && <div className="error-message">{error}</div>}

                <button 
                  className="btn-primary w-full"
                  onClick={createWallet}
                  disabled={!password || !walletName.trim() || loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Wallet...
                    </span>
                  ) : "Create Wallet"}
                </button>
                <button 
                  className="btn-text w-full"
                  onClick={() => {
                    setWalletStep("select");
                    setPassword("");
                    setWalletName("");
                    setError("");
                  }}
                  disabled={loading}
                >
                  ← Back
                </button>
              </div>
            </>
          )}

          {/* Unlock Wallet */}
          {walletStep === "unlock" && selectedWallet && (
            <>
              <div className="unlock-header">
                <div className="unlock-icon">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                </div>
                <h1 className="unlock-title">Unlock Wallet</h1>
                <p className="unlock-description">
                  Enter your password to access this wallet
                </p>
              </div>

              <div className="unlock-form">
                <div className="wallet-to-unlock">
                  <div className="wallet-icon">💼</div>
                  <div>
                    <div className="text-sm font-semibold">{selectedWallet.name}</div>
                    <div className="text-xs text-gray-500">{selectedWallet.address.slice(0, 10)}...{selectedWallet.address.slice(-8)}</div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Wallet Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Enter your wallet password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && password && unlockWallet()}
                    autoFocus
                  />
                </div>

                {error && <div className="error-message">{error}</div>}

                <button 
                  className="btn-primary w-full"
                  onClick={unlockWallet}
                  disabled={!password || loading}
                >
                  {loading ? "Unlocking..." : "Unlock Wallet"}
                </button>
                <button 
                  className="btn-text w-full"
                  onClick={() => {
                    setWalletStep("select");
                    setSelectedWallet(null);
                    setPassword("");
                    setError("");
                  }}
                  disabled={loading}
                >
                  ← Back to Wallet Selection
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Main dashboard
  return (
    <div className="page-container">
      {/* Wallet Info Bar */}
      {selectedWallet && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">💼</div>
              <div>
                <div className="font-semibold text-sm">{selectedWallet.name}</div>
                <div className="text-xs text-gray-600">{selectedWallet.address.slice(0, 10)}...{selectedWallet.address.slice(-8)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">🔓 Unlocked</span>
            </div>
          </div>
        </div>
      )}

      {/* Balance Cards */}
      <div className="balance-cards">
        <div className="balance-card primary">
          <div className="balance-header">
            <span className="balance-label">Total Balance</span>
            <button className="balance-refresh" onClick={fetchBalance}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          <div className="balance-amount">{balance || "0.00"} ETH</div>
          <div className="balance-value">
            ${balance ? (parseFloat(balance) * ETH_PRICE).toFixed(2) : "0.00"}
          </div>
        </div>

        <div className="balance-card">
          <div className="balance-header">
            <span className="balance-label">{tokenSymbol || "Token"} Balance</span>
          </div>
          <div className="balance-amount">{tokenBalance || "0.00"}</div>
          <div className="balance-value">{tokenSymbol || "TOKEN"}</div>
        </div>

        <div className="balance-card">
          <div className="balance-header">
            <span className="balance-label">Network</span>
          </div>
          <div className="balance-amount">Sepolia</div>
          <div className="balance-value">Ethereum Testnet</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button className="action-btn" onClick={() => window.location.href = '/send'}>
          <div className="action-icon">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
          <span>Send</span>
        </button>

        <button className="action-btn" onClick={() => window.location.href = '/receive'}>
          <div className="action-icon">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </div>
          <span>Receive</span>
        </button>

        <button className="action-btn" onClick={() => window.location.href = '/transactions'}>
          <div className="action-icon">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span>History</span>
        </button>
      </div>

      {/* Assets Section */}
      <div className="section-container">
        <div className="section-header">
          <h2 className="section-title">Assets</h2>
          <button className="btn-text" onClick={() => window.location.href = '/assets'}>View All →</button>
        </div>
        {assets.length > 0 ? (
          <div className="assets-grid">
            {assets.map((asset) => (
              <div key={asset.symbol} className="asset-card">
                <div className="asset-info">
                  <div className="asset-icon">{asset.icon}</div>
                  <div>
                    <div className="asset-symbol">{asset.symbol}</div>
                    <div className="asset-name">{asset.name}</div>
                  </div>
                </div>
                <div className="asset-details">
                  <div className="asset-balance">{asset.balance}</div>
                  {asset.value && <div className="asset-value">{asset.value}</div>}

                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No assets available</p>
          </div>
        )}
      </div>


    </div>
  );
}
