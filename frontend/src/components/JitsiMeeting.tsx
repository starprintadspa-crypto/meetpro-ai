import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  Mic,
  MicOff,
  MonitorOff,
  MonitorUp,
  PhoneOff,
  RotateCw,
  Users,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { loadJitsiApi } from "../services/jitsiLoader";
import { config } from "../utils/config";
import { toJitsiRoomName } from "../utils/room";
import type { JitsiApi, JitsiParticipant } from "../types/jitsi";

const CONNECT_TIMEOUT_MS = 30_000;

type ConnectionStatus = "loading" | "connected" | "error";

export interface JitsiMeetingProps {
  roomId: string;
  displayName: string;
  onLeave?: () => void;
  className?: string;
}

export default function JitsiMeeting({
  roomId,
  displayName,
  onLeave,
  className = "",
}: JitsiMeetingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiApi | null>(null);
  const leftRef = useRef(false);
  const onLeaveRef = useRef(onLeave);
  const displayNameRef = useRef(displayName);

  const [status, setStatus] = useState<ConnectionStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [participants, setParticipants] = useState<JitsiParticipant[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    onLeaveRef.current = onLeave;
  }, [onLeave]);

  useEffect(() => {
    displayNameRef.current = displayName;
  }, [displayName]);

  // onLeave sirf ek baar call ho, chahe readyToClose aur hangup dono fire hon
  const leave = useCallback(() => {
    if (leftRef.current) return;
    leftRef.current = true;
    onLeaveRef.current?.();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let connected = false;
    let api: JitsiApi | null = null;
    let timeoutId: number | undefined;
    leftRef.current = false;

    const fail = (message: string) => {
      if (cancelled || connected) return;
      setErrorMessage(message);
      setStatus("error");
    };

    const start = async () => {
      setStatus("loading");
      setErrorMessage("");

      try {
        await loadJitsiApi(config.jitsiDomain);
      } catch {
        fail("Jitsi server se connect nahi ho paya. Internet connection aur VITE_JITSI_DOMAIN check karein.");
        return;
      }

      const container = containerRef.current;
      if (cancelled) return;
      if (!container || !window.JitsiMeetExternalAPI) {
        fail("Meeting start nahi ho saki. Page reload karke dobara koshish karein.");
        return;
      }

      let instance: JitsiApi;
      try {
        instance = new window.JitsiMeetExternalAPI(config.jitsiDomain, {
          roomName: toJitsiRoomName(roomId),
          parentNode: container,
          width: "100%",
          height: "100%",
          userInfo: { displayName: displayNameRef.current },
          configOverwrite: {
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            // Mic, camera, screen share aur participants ke buttons hamare custom control bar mein hain
            toolbarButtons: ["chat", "raisehand", "tileview", "fullscreen", "settings", "hangup"],
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: ["chat", "raisehand", "tileview", "fullscreen", "settings", "hangup"],
          },
        });
      } catch {
        fail("Meeting start nahi ho saki. Dobara koshish karein.");
        return;
      }

      api = instance;
      apiRef.current = instance;

      instance.addListener("videoConferenceJoined", () => {
        connected = true;
        if (cancelled) return;
        window.clearTimeout(timeoutId);
        setStatus("connected");
        setParticipants(instance.getParticipantsInfo());
      });

      instance.addListener("videoConferenceLeft", () => {
        if (!cancelled) leave();
      });

      instance.addListener("readyToClose", () => {
        if (!cancelled) leave();
      });

      instance.addListener("audioMuteStatusChanged", (payload) => {
        if (!cancelled) setAudioMuted(Boolean(payload?.muted));
      });

      instance.addListener("videoMuteStatusChanged", (payload) => {
        if (!cancelled) setVideoMuted(Boolean(payload?.muted));
      });

      instance.addListener("screenSharingStatusChanged", (payload) => {
        if (!cancelled) setScreenSharing(Boolean(payload?.on));
      });

      const refreshParticipants = () => {
        if (!cancelled) setParticipants(instance.getParticipantsInfo());
      };
      instance.addListener("participantJoined", refreshParticipants);
      instance.addListener("participantLeft", refreshParticipants);

      instance.addListener("errorOccurred", () => {
        if (!connected) {
          fail("Meeting mein error aaya. Retry karein.");
        } else {
          console.warn("Jitsi reported a non-fatal error.");
        }
      });

      // Agar 30 second mein join na ho to user ko error dikhayen
      timeoutId = window.setTimeout(() => {
        fail("Meeting join karne mein zyada waqt lag raha hai. Network check karke Retry karein.");
      }, CONNECT_TIMEOUT_MS);
    };

    void start();

    // Cleanup: iframe aur Jitsi instance ko poori tarah band karein
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      apiRef.current = null;
      if (api) {
        api.dispose();
        api = null;
      }
    };
  }, [roomId, attempt, leave]);

  const runCommand = (command: string) => {
    apiRef.current?.executeCommand(command);
  };

  const handleHangup = () => {
    runCommand("hangup");
    leave();
  };

  const controlsDisabled = status !== "connected";
  const buttonBase =
    "flex h-11 w-11 items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-40";
  const neutralButton = `${buttonBase} bg-white/10 text-white hover:bg-white/20`;
  const activeButton = `${buttonBase} bg-red-600 text-white hover:bg-red-500`;

  return (
    <div
      className={`relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-navy-900 text-white ${className}`}
    >
      <div className="relative min-h-0 flex-1">
        {/* Jitsi iframe yahan mount hota hai */}
        <div ref={containerRef} className="absolute inset-0" />

        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-navy-900">
            <Loader2 className="h-8 w-8 animate-spin text-brand-500" aria-hidden="true" />
            <p className="text-sm text-white/80">Meeting load ho rahi hai...</p>
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-navy-900 px-6 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-400" aria-hidden="true" />
            <p className="max-w-md text-sm text-white/90">{errorMessage}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAttempt((n) => n + 1)}
                className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium hover:bg-brand-600"
              >
                <RotateCw className="h-4 w-4" aria-hidden="true" />
                Retry
              </button>
              <button
                type="button"
                onClick={leave}
                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20"
              >
                Leave
              </button>
            </div>
          </div>
        )}

        {panelOpen && (
          <aside className="absolute inset-y-0 right-0 z-10 flex w-full max-w-xs flex-col bg-white text-navy-900 shadow-xl">
            <div className="flex items-center justify-between border-b border-navy-800/10 px-4 py-3">
              <h2 className="font-semibold">Participants ({participants.length})</h2>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                aria-label="Close participants panel"
                className="rounded p-1 hover:bg-navy-800/10"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <ul className="flex-1 overflow-y-auto px-4 py-2">
              {participants.length === 0 && (
                <li className="py-2 text-sm text-navy-700">Abhi koi participant nahi.</li>
              )}
              {participants.map((p) => (
                <li
                  key={p.participantId}
                  className="border-b border-navy-800/5 py-2 text-sm text-navy-900"
                >
                  {p.displayName || p.formattedDisplayName || "Guest"}
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 border-t border-white/10 bg-navy-800 px-3 py-3">
        <button
          type="button"
          title={audioMuted ? "Unmute microphone" : "Mute microphone"}
          aria-label={audioMuted ? "Unmute microphone" : "Mute microphone"}
          disabled={controlsDisabled}
          onClick={() => runCommand("toggleAudio")}
          className={audioMuted ? activeButton : neutralButton}
        >
          {audioMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>

        <button
          type="button"
          title={videoMuted ? "Turn camera on" : "Turn camera off"}
          aria-label={videoMuted ? "Turn camera on" : "Turn camera off"}
          disabled={controlsDisabled}
          onClick={() => runCommand("toggleVideo")}
          className={videoMuted ? activeButton : neutralButton}
        >
          {videoMuted ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </button>

        <button
          type="button"
          title={screenSharing ? "Stop screen sharing" : "Share screen"}
          aria-label={screenSharing ? "Stop screen sharing" : "Share screen"}
          disabled={controlsDisabled}
          onClick={() => runCommand("toggleShareScreen")}
          className={screenSharing ? activeButton : neutralButton}
        >
          {screenSharing ? <MonitorOff className="h-5 w-5" /> : <MonitorUp className="h-5 w-5" />}
        </button>

        <button
          type="button"
          title="Participants"
          aria-label="Toggle participants panel"
          disabled={controlsDisabled}
          onClick={() => {
            setParticipants(apiRef.current?.getParticipantsInfo() ?? []);
            setPanelOpen((open) => !open);
          }}
          className={`${neutralButton} relative`}
        >
          <Users className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-xs font-semibold">
            {participants.length}
          </span>
        </button>

        <button
          type="button"
          title="Leave meeting"
          aria-label="Leave meeting"
          disabled={controlsDisabled}
          onClick={handleHangup}
          className={`${buttonBase} bg-red-600 text-white hover:bg-red-500`}
        >
          <PhoneOff className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
