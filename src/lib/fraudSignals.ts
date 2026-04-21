import { supabase } from "@/integrations/supabase/client";

const IP_KEY = "clickpay_ip_sent";
const FP_KEY = "clickpay_fp_sent";

/**
 * Gera um device fingerprint estável baseado em propriedades do navegador.
 * Não é à prova de bala, mas dificulta a criação massiva de contas no mesmo aparelho.
 */
const computeDeviceFingerprint = async (): Promise<string> => {
  const cached = localStorage.getItem("clickpay_device_fp");
  if (cached) return cached;

  const parts = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    (navigator as any).deviceMemory || 0,
    navigator.platform,
  ].join("|");

  const buffer = new TextEncoder().encode(parts);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const fp = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  localStorage.setItem("clickpay_device_fp", fp);
  return fp;
};

const fetchIp = async (): Promise<string | null> => {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    return data.ip || null;
  } catch {
    return null;
  }
};

/**
 * Envia IP e device fingerprint do usuário logado para o backend.
 * Idempotente: o backend só grava se ainda não houver registro.
 */
export const reportFraudSignals = async (userId: string) => {
  // IP
  if (sessionStorage.getItem(`${IP_KEY}_${userId}`) !== "1") {
    const ip = await fetchIp();
    if (ip) {
      await supabase.rpc("register_signup_ip" as any, { ip_input: ip });
      sessionStorage.setItem(`${IP_KEY}_${userId}`, "1");
    }
  }

  // Fingerprint
  if (sessionStorage.getItem(`${FP_KEY}_${userId}`) !== "1") {
    const fp = await computeDeviceFingerprint();
    await supabase.rpc("register_device_fingerprint" as any, { fp_input: fp });
    sessionStorage.setItem(`${FP_KEY}_${userId}`, "1");
  }
};
