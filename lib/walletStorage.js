import { getFirestore, collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp, orderBy, limit } from "firebase/firestore";
import app from "./firebase";

const db = getFirestore(app);

// ============================================
// FIRESTORE OPERATIONS (Wallet Metadata Only)
// ============================================

/**
 * Save wallet metadata to Firestore
 * @param {string} uid - Firebase user ID
 * @param {object} wallet - Wallet object with address and name
 * @returns {Promise<string>} Document ID
 */
export async function saveWalletMetadata(uid, wallet) {
  try {
    const docRef = await addDoc(collection(db, "wallets"), {
      uid: uid,
      address: wallet.address,
      name: wallet.name || "My Wallet",
      createdAt: serverTimestamp()
    });
    console.log("✅ Wallet saved with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("❌ Error saving wallet:", error.message);
    throw error;
  }
}

/**
 * Load all wallets for a user from Firestore
 * @param {string} uid - Firebase user ID
 * @returns {Promise<Array>} Array of wallet objects
 */
export async function loadUserWallets(uid) {
  try {
    const q = query(collection(db, "wallets"), where("uid", "==", uid));
    const querySnapshot = await getDocs(q);
    
    const wallets = [];
    querySnapshot.forEach((doc) => {
      wallets.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return wallets;
  } catch (error) {
    console.error("❌ Error loading wallets:", error.message);
    throw error;
  }
}

/**
 * Delete wallet metadata from Firestore
 * @param {string} walletId - Firestore document ID
 */
export async function deleteWalletMetadata(walletId) {
  try {
    await deleteDoc(doc(db, "wallets", walletId));
  } catch (error) {
    console.error("Error deleting wallet metadata:", error);
    throw error;
  }
}

// ============================================
// TRANSACTION HISTORY (Per Wallet)
// ============================================

/**
 * Save transaction to Firestore
 * @param {string} uid - Firebase user ID
 * @param {string} walletAddress - Wallet address
 * @param {object} transaction - Transaction object
 * @returns {Promise<string>} Document ID
 */
export async function saveTransaction(uid, walletAddress, transaction) {
  try {
    const docRef = await addDoc(collection(db, "transactions"), {
      uid: uid,
      walletAddress: walletAddress,
      type: transaction.type, // 'send' or 'receive'
      amount: transaction.amount,
      asset: transaction.asset, // 'ETH', 'TOKEN', etc.
      to: transaction.to || "",
      from: transaction.from || "",
      hash: transaction.hash || "",
      status: transaction.status || "pending", // 'pending', 'confirmed', 'failed'
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp()
    });
    console.log("✅ Transaction saved with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("❌ Error saving transaction:", error.message);
    throw error;
  }
}

/**
 * Load transactions for a specific wallet
 * @param {string} uid - Firebase user ID
 * @param {string} walletAddress - Wallet address
 * @param {number} maxResults - Maximum number of transactions to load
 * @returns {Promise<Array>} Array of transaction objects
 */
export async function loadWalletTransactions(uid, walletAddress, maxResults = 50) {
  try {
    const q = query(
      collection(db, "transactions"),
      where("uid", "==", uid),
      where("walletAddress", "==", walletAddress),
      orderBy("timestamp", "desc"),
      limit(maxResults)
    );
    const querySnapshot = await getDocs(q);
    
    const transactions = [];
    querySnapshot.forEach((doc) => {
      transactions.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return transactions;
  } catch (error) {
    console.error("❌ Error loading transactions:", error.message);
    throw error;
  }
}

/**
 * Delete all transactions for a wallet
 * @param {string} uid - Firebase user ID
 * @param {string} walletAddress - Wallet address
 */
export async function deleteWalletTransactions(uid, walletAddress) {
  try {
    const q = query(
      collection(db, "transactions"),
      where("uid", "==", uid),
      where("walletAddress", "==", walletAddress)
    );
    const querySnapshot = await getDocs(q);
    
    const deletePromises = [];
    querySnapshot.forEach((document) => {
      deletePromises.push(deleteDoc(doc(db, "transactions", document.id)));
    });
    
    await Promise.all(deletePromises);
    console.log("✅ Deleted transactions for wallet:", walletAddress);
  } catch (error) {
    console.error("❌ Error deleting transactions:", error.message);
    throw error;
  }
}

// ============================================
// LOCALSTORAGE OPERATIONS (Encrypted Keys)
// ============================================

/**
 * Generate scoped localStorage key
 * @param {string} uid - Firebase user ID
 * @param {string} address - Wallet address
 * @returns {string} Scoped key
 */
function getScopedKey(uid, address) {
  return `wallet_${uid}_${address}`;
}

/**
 * Save encrypted private key to localStorage
 * @param {string} uid - Firebase user ID
 * @param {string} address - Wallet address
 * @param {string} encryptedKey - AES encrypted private key
 */
export function saveEncryptedKey(uid, address, encryptedKey) {
  try {
    const key = getScopedKey(uid, address);
    localStorage.setItem(key, encryptedKey);
  } catch (error) {
    console.error("Error saving encrypted key:", error);
    throw error;
  }
}

/**
 * Load encrypted private key from localStorage
 * @param {string} uid - Firebase user ID
 * @param {string} address - Wallet address
 * @returns {string|null} Encrypted private key or null
 */
export function loadEncryptedKey(uid, address) {
  try {
    const key = getScopedKey(uid, address);
    return localStorage.getItem(key);
  } catch (error) {
    console.error("Error loading encrypted key:", error);
    return null;
  }
}

/**
 * Delete encrypted private key from localStorage
 * @param {string} uid - Firebase user ID
 * @param {string} address - Wallet address
 */
export function deleteEncryptedKey(uid, address) {
  try {
    const key = getScopedKey(uid, address);
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Error deleting encrypted key:", error);
    throw error;
  }
}

/**
 * Check if private key exists in localStorage
 * @param {string} uid - Firebase user ID
 * @param {string} address - Wallet address
 * @returns {boolean} True if key exists
 */
export function checkPrivateKeyExists(uid, address) {
  const key = getScopedKey(uid, address);
  return localStorage.getItem(key) !== null;
}

/**
 * Get all wallet keys for a specific user from localStorage
 * @param {string} uid - Firebase user ID
 * @returns {Array<string>} Array of wallet addresses that have keys
 */
export function getUserWalletKeys(uid) {
  const prefix = `wallet_${uid}_`;
  const keys = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      // Extract address from key: wallet_<uid>_<address>
      const address = key.substring(prefix.length);
      keys.push(address);
    }
  }
  
  return keys;
}

/**
 * Clean up old wallet data (migration helper)
 * Removes old non-scoped keys
 */
export function cleanupLegacyWalletData() {
  try {
    localStorage.removeItem("address");
    localStorage.removeItem("encryptedPrivateKey");
    console.log("Legacy wallet data cleaned up");
  } catch (error) {
    console.error("Error cleaning up legacy data:", error);
  }
}
