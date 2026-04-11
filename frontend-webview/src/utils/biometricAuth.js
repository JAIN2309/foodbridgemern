// Web Authentication API for biometric authentication
export const BiometricAuth = {
  // Check if biometric authentication is available
  isAvailable: async () => {
    return window.PublicKeyCredential !== undefined && 
           navigator.credentials !== undefined;
  },

  // Check if platform authenticator (biometric) is available
  isPlatformAuthenticatorAvailable: async () => {
    if (!window.PublicKeyCredential) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  },

  // Register biometric credential
  register: async (userId, userName) => {
    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const publicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: "FoodBridge",
          id: window.location.hostname,
        },
        user: {
          id: new TextEncoder().encode(userId),
          name: userName,
          displayName: userName,
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
        attestation: "none",
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      });

      return {
        success: true,
        credentialId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Authenticate using biometric
  authenticate: async (credentialId) => {
    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const publicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials: credentialId ? [{
          id: Uint8Array.from(atob(credentialId), c => c.charCodeAt(0)),
          type: "public-key",
        }] : [],
        userVerification: "required",
        timeout: 60000,
      };

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      });

      return { success: true, assertion };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};
