// Jitsi External API ke liye minimal TypeScript types.
// Official docs: https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe

export interface JitsiParticipant {
  participantId: string;
  displayName?: string;
  formattedDisplayName?: string;
}

// Event payload har event ke liye alag hota hai, isliye any use kiya gaya hai
export type JitsiEventListener = (payload?: any) => void;

export interface JitsiOptions {
  roomName: string;
  parentNode: HTMLElement;
  width?: string | number;
  height?: string | number;
  userInfo?: { displayName?: string; email?: string };
  configOverwrite?: Record<string, unknown>;
  interfaceConfigOverwrite?: Record<string, unknown>;
}

export interface JitsiApi {
  addListener(event: string, listener: JitsiEventListener): void;
  executeCommand(command: string, ...args: unknown[]): void;
  getParticipantsInfo(): JitsiParticipant[];
  dispose(): void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: JitsiOptions) => JitsiApi;
  }
}
