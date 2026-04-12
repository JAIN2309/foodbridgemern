import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_USERS_KEY = 'biometricUsers'; // Stores list of emails with biometric enabled

// Helper to get user-specific key (encode email to make it SecureStore-safe)
const getUserKey = (email: string, suffix: string) => {
  // Replace @ with _at_ and . with _dot_ to make it SecureStore-safe
  const safeEmail = email.replace(/@/g, '_at_').replace(/\./g, '_dot_');
  return `biometric_${safeEmail}_${suffix}`;
};

export const biometricAuth = {
  // Check if device supports biometric authentication
  async isAvailable(): Promise<boolean> {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return compatible && enrolled;
    } catch {
      return false;
    }
  },

  // Get biometric type (fingerprint, face, iris)
  async getBiometricType(): Promise<string> {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return 'Face ID';
      }
      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return 'Fingerprint';
      }
      if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        return 'Iris';
      }
      return 'Biometric';
    } catch {
      return 'Biometric';
    }
  },

  // Check if biometric is enabled for specific user
  async isEnabled(email: string): Promise<boolean> {
    try {
      const usersJson = await SecureStore.getItemAsync(BIOMETRIC_USERS_KEY);
      if (!usersJson) return false;
      const users: string[] = JSON.parse(usersJson);
      return users.includes(email);
    } catch {
      return false;
    }
  },

  // Enable biometric authentication for specific user
  async enable(email: string, password: string): Promise<void> {
    // Save user credentials
    await SecureStore.setItemAsync(getUserKey(email, 'password'), password);
    
    // Add email to biometric users list
    try {
      const usersJson = await SecureStore.getItemAsync(BIOMETRIC_USERS_KEY);
      const users: string[] = usersJson ? JSON.parse(usersJson) : [];
      if (!users.includes(email)) {
        users.push(email);
        await SecureStore.setItemAsync(BIOMETRIC_USERS_KEY, JSON.stringify(users));
      }
    } catch {
      await SecureStore.setItemAsync(BIOMETRIC_USERS_KEY, JSON.stringify([email]));
    }
  },

  // Disable biometric authentication for specific user
  async disable(email: string): Promise<void> {
    // Remove user credentials
    await SecureStore.deleteItemAsync(getUserKey(email, 'password'));
    
    // Remove email from biometric users list
    try {
      const usersJson = await SecureStore.getItemAsync(BIOMETRIC_USERS_KEY);
      if (usersJson) {
        const users: string[] = JSON.parse(usersJson);
        const updatedUsers = users.filter(u => u !== email);
        if (updatedUsers.length > 0) {
          await SecureStore.setItemAsync(BIOMETRIC_USERS_KEY, JSON.stringify(updatedUsers));
        } else {
          await SecureStore.deleteItemAsync(BIOMETRIC_USERS_KEY);
        }
      }
    } catch {}
  },

  // Authenticate with biometric
  async authenticate(promptMessage: string = 'Authenticate to continue'): Promise<boolean> {
    try {
      console.log('🔐 Requesting biometric authentication...');
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        fallbackLabel: 'Use Passcode',
      });
      console.log('🔐 Biometric result:', result);
      return result.success;
    } catch (error) {
      console.error('❌ Biometric authentication error:', error);
      return false;
    }
  },

  // Get saved credentials for specific user
  async getCredentials(email: string): Promise<{ email: string; password: string } | null> {
    try {
      const password = await SecureStore.getItemAsync(getUserKey(email, 'password'));
      if (password) {
        return { email, password };
      }
      return null;
    } catch {
      return null;
    }
  },

  // Get list of all users with biometric enabled
  async getBiometricUsers(): Promise<string[]> {
    try {
      const usersJson = await SecureStore.getItemAsync(BIOMETRIC_USERS_KEY);
      return usersJson ? JSON.parse(usersJson) : [];
    } catch {
      return [];
    }
  },

  // Save credentials for specific user (used when user logs in)
  async saveCredentials(email: string, password: string): Promise<void> {
    const isAvailable = await this.isAvailable();
    if (isAvailable) {
      await SecureStore.setItemAsync(getUserKey(email, 'password'), password);
    }
  },
};
