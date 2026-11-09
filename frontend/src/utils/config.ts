// Environment variables ko ek jagah se access karein
const jitsiDomain =
  String(import.meta.env.VITE_JITSI_DOMAIN ?? "meet.jit.si")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "") || "meet.jit.si";

export const config = {
  apiUrl: import.meta.env.VITE_API_URL ?? "",
  jitsiDomain,
  // meet.jit.si sirf development/testing ke liye hai
  isPublicJitsi: jitsiDomain === "meet.jit.si",
};

if (import.meta.env.PROD && config.isPublicJitsi) {
  console.warn(
    "MEETPRO AI: meet.jit.si sirf development/testing ke liye hai. Production se pehle apna Jitsi server set karein (VITE_JITSI_DOMAIN)."
  );
}
