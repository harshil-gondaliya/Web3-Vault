"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CryptoJS from "crypto-js";
import { ethers } from "ethers";
import { useAuth } from "../context/AuthContext";
import {
  deleteEncryptedKey,
  deleteWalletMetadata,
  deleteWalletTransactions,
  loadEncryptedKey,
  loadUserWallets,
  saveEncryptedKey,
} from "@/lib/walletStorage";
import {
  DEFAULT_APP_SETTINGS,
  getStoredSettings,
  updateStoredSettings,
} from "@/lib/appSettings";
import { clearActiveWalletSession } from "@/lib/walletSession";

const CURRENCY_OPTIONS = ["USD", "INR", "EUR"];
const LANGUAGE_OPTIONS = ["English", "Hindi", "Spanish"];

export default function Settings() {
  const router = useRouter();
  const { user } = useAuth();

  const [autoLock, setAutoLock] = useState(DEFAULT_APP_SETTINGS.autoLockEnabled);
  const [biometric, setBiometric] = useState(DEFAULT_APP_SETTINGS.biometricEnabled);
  const [notifications, setNotifications] = useState(DEFAULT_APP_SETTINGS.notificationsEnabled);
  const [currency, setCurrency] = useState(DEFAULT_APP_SETTINGS.currency);
  const [language, setLanguage] = useState(DEFAULT_APP_SETTINGS.language);
  const [address, setAddress] = useState("");
  const [walletName, setWalletName] = useState("");
  const [walletId, setWalletId] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revealedSecret, setRevealedSecret] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const savedSettings = getStoredSettings();
    setAutoLock(savedSettings.autoLockEnabled);
    setBiometric(savedSettings.biometricEnabled);
    setNotifications(savedSettings.notificationsEnabled);
    setCurrency(savedSettings.currency);
    setLanguage(savedSettings.language);
  }, []);

  useEffect(() => {
    const loadActiveWallet = async () => {
      if (!user) {
        setAddress("");
        setWalletName("");
        setWalletId("");
        return;
      }

      const activeAddress = sessionStorage.getItem("activeWalletAddress");
      setAddress(activeAddress || "");

      if (!activeAddress) {
        setWalletName("");
        setWalletId("");
        return;
      }

      try {
        const wallets = await loadUserWallets(user.uid);
        const activeWallet = wallets.find((wallet) => wallet.address === activeAddress);

        if (activeWallet) {
          setWalletName(activeWallet.name || "");
          setWalletId(activeWallet.id || "");
        }
      } catch (error) {
        console.error("Failed to load active wallet for settings:", error);
      }
    };

    loadActiveWallet();
  }, [user]);

  useEffect(() => {
    if (!statusMessage) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setStatusMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [statusMessage]);

  useEffect(() => {
    if (!errorMessage) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setErrorMessage("");
    }, 4000);

    return () => clearTimeout(timer);
  }, [errorMessage]);

  const persistSetting = (partialSettings) => {
    updateStoredSettings(partialSettings);
    setStatusMessage("Settings saved");
    setErrorMessage("");
  };

  const handleLockWallet = () => {
    clearActiveWalletSession();
    router.push("/");
  };

  const closeModals = () => {
    setShowPasswordModal(false);
    setShowSecretModal(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setRevealedSecret("");
  };

  const handlePasswordChange = async () => {
    if (!user || !address) {
      setErrorMessage("Unlock a wallet before changing its password.");
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage("Fill in all password fields.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("New passwords do not match.");
      return;
    }

    setBusy(true);
    setErrorMessage("");

    try {
      const encryptedKey = loadEncryptedKey(user.uid, address);
      if (!encryptedKey) {
        throw new Error("Encrypted key not found on this device.");
      }

      const decryptedBytes = CryptoJS.AES.decrypt(encryptedKey, currentPassword);
      const privateKey = decryptedBytes.toString(CryptoJS.enc.Utf8);

      if (!privateKey || !privateKey.startsWith("0x")) {
        throw new Error("Current password is incorrect.");
      }

      const wallet = new ethers.Wallet(privateKey);
      if (wallet.address.toLowerCase() !== address.toLowerCase()) {
        throw new Error("Wallet verification failed.");
      }

      const reEncryptedKey = CryptoJS.AES.encrypt(privateKey, newPassword).toString();
      saveEncryptedKey(user.uid, address, reEncryptedKey);

      closeModals();
      setStatusMessage("Wallet password updated successfully.");
    } catch (error) {
      console.error("Failed to change wallet password:", error);
      setErrorMessage(error.message || "Failed to change wallet password.");
    } finally {
      setBusy(false);
    }
  };

  const handleShowSecret = () => {
    const activePrivateKey = sessionStorage.getItem("tempPrivateKey");

    if (!address || !activePrivateKey) {
      setErrorMessage("Unlock a wallet to view its backup secret.");
      return;
    }

    setRevealedSecret(activePrivateKey);
    setShowSecretModal(true);
    setErrorMessage("");
  };

  const handleResetWallet = async () => {
    if (!user || !address) {
      setErrorMessage("No active wallet found to reset.");
      return;
    }

    if (!confirm("Are you sure? This will remove the active wallet from this account.")) {
      return;
    }

    if (!confirm("Final warning: wallet metadata, local key access, and transaction history for this wallet will be deleted.")) {
      return;
    }

    setBusy(true);
    setErrorMessage("");

    try {
      if (walletId) {
        await deleteWalletMetadata(walletId);
      }

      await deleteWalletTransactions(user.uid, address);
      deleteEncryptedKey(user.uid, address);
      clearActiveWalletSession();

      setAddress("");
      setWalletName("");
      setWalletId("");
      setStatusMessage("Active wallet reset successfully.");
      router.push("/");
    } catch (error) {
      console.error("Failed to reset wallet:", error);
      setErrorMessage("Failed to reset the active wallet.");
    } finally {
      setBusy(false);
    }
  };

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "No wallet";
  const walletLabel = walletName || "Active Wallet";

  return (
    <div className="page-container">
      {(statusMessage || errorMessage) && (
        <div className={`settings-banner ${errorMessage ? "error" : "success"}`}>
          {errorMessage || statusMessage}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-description">Manage your wallet settings and preferences</p>
        </div>
      </div>

      <div className="settings-layout">
        <div className="settings-section">
          <div className="settings-section-header">
            <div className="settings-icon">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="settings-section-title">Security</h2>
              <p className="settings-section-desc">Manage your wallet security</p>
            </div>
          </div>

          <div className="settings-items">
            <div className="settings-item">
              <div className="settings-item-info">
                <div className="settings-item-label">Auto-Lock Wallet</div>
                <div className="settings-item-desc">Automatically lock wallet after 5 minutes of inactivity</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={autoLock}
                  onChange={() => {
                    const nextValue = !autoLock;
                    setAutoLock(nextValue);
                    persistSetting({ autoLockEnabled: nextValue });
                  }}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <div className="settings-item-label">Biometric Authentication</div>
                <div className="settings-item-desc">Save preference for fingerprint or face ID unlock when supported</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={biometric}
                  onChange={() => {
                    const nextValue = !biometric;
                    setBiometric(nextValue);
                    persistSetting({ biometricEnabled: nextValue });
                  }}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <button className="settings-action-btn" onClick={() => setShowPasswordModal(true)}>
              <span>Change Password</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button className="settings-action-btn" onClick={handleShowSecret}>
              <span>Show Recovery Phrase</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-header">
            <div className="settings-icon">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="settings-section-title">Account</h2>
              <p className="settings-section-desc">Manage your account information</p>
            </div>
          </div>

          <div className="settings-items">
            <div className="account-info-card">
              <div className="account-info-row">
                <span className="account-info-label">Wallet Name</span>
                <span className="account-info-value">{walletLabel}</span>
              </div>
              <div className="account-info-row">
                <span className="account-info-label">Wallet Address</span>
                <div className="account-info-value-row">
                  <span className="account-info-value">{shortAddress}</span>
                  {address && (
                    <button
                      className="copy-icon-small"
                      onClick={() => {
                        navigator.clipboard.writeText(address);
                        setStatusMessage("Address copied!");
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <div className="account-info-row">
                <span className="account-info-label">Network</span>
                <span className="account-info-value">Ethereum Sepolia Testnet</span>
              </div>
              <div className="account-info-row">
                <span className="account-info-label">Wallet Type</span>
                <span className="account-info-value">Non-Custodial</span>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-header">
            <div className="settings-icon">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="settings-section-title">Preferences</h2>
              <p className="settings-section-desc">Customize your wallet experience</p>
            </div>
          </div>

          <div className="settings-items">
            <div className="settings-item">
              <div className="settings-item-info">
                <div className="settings-item-label">Notifications</div>
                <div className="settings-item-desc">Receive notifications for transactions</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notifications}
                  onChange={() => {
                    const nextValue = !notifications;
                    setNotifications(nextValue);
                    persistSetting({ notificationsEnabled: nextValue });
                  }}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <button
              className="settings-action-btn"
              onClick={() => {
                const currentIndex = CURRENCY_OPTIONS.indexOf(currency);
                const nextValue = CURRENCY_OPTIONS[(currentIndex + 1) % CURRENCY_OPTIONS.length];
                setCurrency(nextValue);
                persistSetting({ currency: nextValue });
              }}
            >
              <span>Currency ({currency})</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              className="settings-action-btn"
              onClick={() => {
                const currentIndex = LANGUAGE_OPTIONS.indexOf(language);
                const nextValue = LANGUAGE_OPTIONS[(currentIndex + 1) % LANGUAGE_OPTIONS.length];
                setLanguage(nextValue);
                persistSetting({ language: nextValue });
              }}
            >
              <span>Language ({language})</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="settings-section danger-section">
          <div className="settings-section-header">
            <div className="settings-icon danger">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="settings-section-title">Danger Zone</h2>
              <p className="settings-section-desc">Irreversible actions</p>
            </div>
          </div>

          <div className="settings-items">
            <button className="settings-danger-btn" onClick={handleLockWallet} disabled={busy}>
              Lock Wallet
            </button>
            <button className="settings-danger-btn" onClick={handleResetWallet} disabled={busy || !address}>
              Reset Wallet
            </button>
          </div>
        </div>
      </div>

      {showPasswordModal && (
        <div className="settings-modal-backdrop" onClick={closeModals}>
          <div className="settings-modal" onClick={(event) => event.stopPropagation()}>
            <div className="settings-modal-header">
              <h3>Change Wallet Password</h3>
              <button className="settings-modal-close" onClick={closeModals}>x</button>
            </div>

            <div className="settings-modal-body">
              <p className="settings-modal-note">
                Update the encryption password for <strong>{walletLabel}</strong>.
              </p>
              <input
                type="password"
                className="form-input"
                placeholder="Current password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
              <input
                type="password"
                className="form-input"
                placeholder="New password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
              <input
                type="password"
                className="form-input"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>

            <div className="settings-modal-actions">
              <button className="btn-text" onClick={closeModals} disabled={busy}>Cancel</button>
              <button className="btn-primary" onClick={handlePasswordChange} disabled={busy}>
                {busy ? "Saving..." : "Save Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSecretModal && (
        <div className="settings-modal-backdrop" onClick={closeModals}>
          <div className="settings-modal" onClick={(event) => event.stopPropagation()}>
            <div className="settings-modal-header">
              <h3>Wallet Backup Secret</h3>
              <button className="settings-modal-close" onClick={closeModals}>x</button>
            </div>

            <div className="settings-modal-body">
              <p className="settings-modal-warning">
                This wallet currently exposes a private key backup, not a 12-word recovery phrase. Keep it offline and never share it.
              </p>
              <div className="secret-box">{revealedSecret}</div>
            </div>

            <div className="settings-modal-actions">
              <button
                className="btn-text"
                onClick={() => {
                  navigator.clipboard.writeText(revealedSecret);
                  setStatusMessage("Backup secret copied to clipboard.");
                }}
              >
                Copy Secret
              </button>
              <button className="btn-primary" onClick={closeModals}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
