import React, { useEffect, useState } from "react";

const CONSENT_KEY = "kayi_cookie_consent";

export type ConsentType = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
};

const defaultConsent: ConsentType = {
  necessary: true,
  analytics: false,
  marketing: false,
};

const getConsent = (): ConsentType | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(CONSENT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const setConsent = (consent: ConsentType) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
};

const revokeConsent = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CONSENT_KEY);
};

export const CookieConsentBanner: React.FC = () => {
  const [show, setShow] = useState(false);
  const [personalize, setPersonalize] = useState(false);
  const [consent, setConsentState] = useState<ConsentType>(defaultConsent);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const existing = getConsent();
    if (!existing) setShow(true);
  }, []);

  const handleAccept = () => {
    setConsent({ ...defaultConsent, analytics: true, marketing: true });
    setConsentState({ ...defaultConsent, analytics: true, marketing: true });
    setShow(false);
  };

  const handleReject = () => {
    setConsent(defaultConsent);
    setConsentState(defaultConsent);
    setShow(false);
  };

  const handleSave = () => {
    setConsent(consent);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      width: "100%",
      background: "#fff",
      borderTop: "1px solid #e5e7eb",
      zIndex: 1000,
      boxShadow: "0 -2px 8px rgba(0,0,0,0.04)",
      padding: "1.5rem 1rem",
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    }}>
      <div style={{ maxWidth: 700, textAlign: "center", marginBottom: 12 }}>
        Kayı.com, deneyiminizi iyileştirmek ve hizmetlerimizi sunmak için zorunlu çerezler kullanır. Analitik ve pazarlama çerezleri için onayınıza ihtiyacımız var. Detaylı bilgi için <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", textDecoration: "underline" }}>Gizlilik ve GDPR Politikası</a>'nı inceleyebilirsiniz.
      </div>
      {personalize ? (
        <div style={{ display: "flex", gap: 24, marginBottom: 16 }}>
          <label>
            <input type="checkbox" checked disabled /> Zorunlu
          </label>
          <label>
            <input
              type="checkbox"
              checked={consent.analytics}
              onChange={e => setConsentState(c => ({ ...c, analytics: e.target.checked }))}
            /> Analitik
          </label>
          <label>
            <input
              type="checkbox"
              checked={consent.marketing}
              onChange={e => setConsentState(c => ({ ...c, marketing: e.target.checked }))}
            /> Pazarlama
          </label>
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 12 }}>
        <button
          style={{ background: "#2563eb", color: "#fff", border: 0, borderRadius: 4, padding: "0.5rem 1.5rem", fontWeight: 600, cursor: "pointer" }}
          onClick={handleAccept}
        >
          Onayla
        </button>
        <button
          style={{ background: "#e5e7eb", color: "#111", border: 0, borderRadius: 4, padding: "0.5rem 1.5rem", fontWeight: 600, cursor: "pointer" }}
          onClick={handleReject}
        >
          Reddet
        </button>
        <button
          style={{ background: "#fff", color: "#2563eb", border: "1px solid #2563eb", borderRadius: 4, padding: "0.5rem 1.5rem", fontWeight: 600, cursor: "pointer" }}
          onClick={() => setPersonalize(p => !p)}
        >
          Ayarla
        </button>
        {personalize && (
          <button
            style={{ background: "#2563eb", color: "#fff", border: 0, borderRadius: 4, padding: "0.5rem 1.5rem", fontWeight: 600, cursor: "pointer" }}
            onClick={handleSave}
          >
            Kaydet
          </button>
        )}
      </div>
    </div>
  );
};

export { getConsent, setConsent, revokeConsent, CONSENT_KEY, ConsentType };