# BYOK (Bring Your Own Key) & Security Model

VintStack is architected with a strict **Bring Your Own Key (BYOK)** privacy model.

---

## 1. Why BYOK?

Most commercial listing tools operate with centralized servers that:
1. Charge monthly subscriptions for AI tokens.
2. Intercept and log user photos, item descriptions, and user behavior.
3. Introduce vendor lock-in and potential data breaches.

In contrast, **VintStack gives full ownership to the user**:
- You obtain a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
- You incur zero markups or subscription fees.
- You can process thousands of listings within Google's free tier.

---

## 2. Browser Key Isolation

In the Angular web application:
- **Key Storage**: Your Gemini API key is stored locally in your browser's `window.localStorage`.
- **Direct Communication**: HTTP requests are made directly from your browser (`fetch`) to `https://generativelanguage.googleapis.com/v1beta/...`.
- **Zero Intermediary**: There is NO backend server, NO telemetry proxy, and NO analytics middleware that receives your API key.
- **Masking & Clearing**: The web UI masks the key by default and provides a one-click **"Delete Key"** button that permanently purges the key from browser storage.

---

## 3. Terminal CLI Key Handling

In the CLI tool:
- You pass the key either as a flag (`--key <KEY>`) or as an environment variable (`GEMINI_API_KEY`).
- The key is held strictly in-memory during script execution and terminates when the process exits.
- No config files with plaintext keys are written to disk unless you explicitly configure an `.env` file.

---

## 4. Future Option: Optional Firebase Backend

If a team or organization wishes to deploy VintStack with Google OAuth login and centralized rate limiting:
- An optional Firebase Cloud Functions proxy layer can be enabled.
- The Cloud Function receives requests authenticated with Firebase Auth (Google Sign-In).
- It injects the user's BYOK key strictly in-memory per request and forwards to Gemini.
- App Check with reCAPTCHA Enterprise can protect the Cloud Function endpoints against abuse.
