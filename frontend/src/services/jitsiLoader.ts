// Official external_api.js script ko sirf ek baar load karta hai.
// Dev/testing ke liye domain meet.jit.si hai (config se change ho sakta hai).
const loadPromises = new Map<string, Promise<void>>();

export function loadJitsiApi(domain: string): Promise<void> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();

  const existing = loadPromises.get(domain);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://${domain}/external_api.js`;
    script.async = true;

    script.onload = () => {
      if (window.JitsiMeetExternalAPI) {
        resolve();
      } else {
        loadPromises.delete(domain);
        reject(new Error("Jitsi API load hui lekin object available nahi hai."));
      }
    };

    script.onerror = () => {
      // Failed script ko hata dein taake retry possible ho
      loadPromises.delete(domain);
      script.remove();
      reject(new Error(`Jitsi script load nahi hui: ${domain}`));
    };

    document.head.appendChild(script);
  });

  loadPromises.set(domain, promise);
  return promise;
}
