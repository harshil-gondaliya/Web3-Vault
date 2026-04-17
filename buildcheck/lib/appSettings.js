const SETTINGS_KEY = "web3vault_settings";

export const DEFAULT_APP_SETTINGS = {
  autoLockEnabled: true,
  biometricEnabled: false,
  notificationsEnabled: true,
  currency: "USD",
  language: "English",
};

export function getStoredSettings() {
  if (typeof window === "undefined") {
    return DEFAULT_APP_SETTINGS;
  }

  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return DEFAULT_APP_SETTINGS;
    }

    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_APP_SETTINGS,
      ...parsed,
    };
  } catch (error) {
    console.error("Failed to load app settings:", error);
    return DEFAULT_APP_SETTINGS;
  }
}

export function saveStoredSettings(nextSettings) {
  if (typeof window === "undefined") {
    return DEFAULT_APP_SETTINGS;
  }

  const merged = {
    ...DEFAULT_APP_SETTINGS,
    ...nextSettings,
  };

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  } catch (error) {
    console.error("Failed to save app settings:", error);
  }

  return merged;
}

export function updateStoredSettings(partialSettings) {
  const current = getStoredSettings();
  return saveStoredSettings({
    ...current,
    ...partialSettings,
  });
}
