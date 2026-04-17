"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { clearActiveWalletSession } from "@/lib/walletSession";

export default function Topbar() {
  const [showDropdown, setShowDropdown] = useState(false);
  const [walletAddress, setWalletAddress] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return sessionStorage.getItem("activeWalletAddress") || "";
  });
  const { user } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    // Only load wallet address if user is logged in
    if (user) {
      // Poll for wallet address changes every second
      const interval = setInterval(() => {
        const currentAddress = sessionStorage.getItem("activeWalletAddress");
        setWalletAddress(currentAddress || "");
      }, 1000);
      
      return () => clearInterval(interval);
    } else if (walletAddress) {
      const timer = setTimeout(() => {
        setWalletAddress("");
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [user, walletAddress]);

  const shortenAddress = (addr) => {
    if (!addr) return "No Wallet";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleLockWallet = () => {
    clearActiveWalletSession();
    window.location.reload();
  };

  const handleLogout = async () => {
    if (confirm("Are you sure you want to logout?")) {
      try {
        await signOut(auth);
        router.push("/login");
      } catch (error) {
        console.error("Logout error:", error);
      }
    }
  };

  const handleProfileClick = () => {
    router.push("/profile");
    setShowDropdown(false);
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="topbar-title">Dashboard</h1>
      </div>

      <div className="topbar-right">
        {user && walletAddress && (
          <div className="wallet-address-box">
            <div className="wallet-icon">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <span className="wallet-address">{shortenAddress(walletAddress)}</span>
            <button 
              className="copy-btn"
              onClick={() => {
                navigator.clipboard.writeText(walletAddress);
                alert("Address copied!");
              }}
              title="Copy address"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        )}

        <div className="profile-dropdown">
          <button
            className="profile-btn"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <div className="profile-avatar">
              {user && user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full" />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
            {user && <span className="profile-name">{user.displayName}</span>}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDropdown && (
            <div className="dropdown-menu">
              {user && (
                <button className="dropdown-item" onClick={handleProfileClick}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </button>
              )}
              <button className="dropdown-item" onClick={handleLockWallet}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Lock Wallet
              </button>
              {user ? (
                <button className="dropdown-item danger" onClick={handleLogout}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              ) : (
                <button className="dropdown-item" onClick={() => router.push("/login")}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Sign In
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
