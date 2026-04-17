export function clearActiveWalletSession() {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem("tempPrivateKey");
  sessionStorage.removeItem("activeWalletAddress");
}
