import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn, LogOut, Plus, Video } from "lucide-react";
import { authApi, type AuthUser } from "../services/api";
import { generateRoomId, parseRoomInput } from "../utils/room";

export default function HomePage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [joinValue, setJoinValue] = useState("");
  const [joinError, setJoinError] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Session check: logged-in ho to naam pre-fill karein
  useEffect(() => {
    authApi
      .me()
      .then((res) => {
        setUser(res.user);
        setDisplayName((current) => current || res.user.name);
      })
      .catch(() => setUser(null))
      .finally(() => setAuthChecked(true));
  }, []);

  const openMeeting = (roomId: string) => {
    navigate(`/meeting/${roomId}`, {
      state: { displayName: displayName.trim() || "Guest" },
    });
  };

  const handleCreate = () => {
    openMeeting(generateRoomId());
  };

  const handleJoin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const roomId = parseRoomInput(joinValue);
    if (!roomId) {
      setJoinError("Invalid meeting ID ya link. Example: abc-defg-hij");
      return;
    }
    setJoinError("");
    openMeeting(roomId);
  };

  const handleLogout = async () => {
    await authApi.logout().catch(() => undefined);
    setUser(null);
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <nav className="flex items-center justify-between px-4 py-3 sm:px-8">
        <div className="flex items-center gap-2 text-brand-600">
          <Video className="h-6 w-6" aria-hidden="true" />
          <span className="font-bold">MEETPRO AI</span>
        </div>
        {authChecked &&
          (user ? (
            <div className="flex items-center gap-3 text-sm">
              <span className="hidden text-navy-700 sm:inline">Hi, {user.name}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-navy-800 hover:bg-navy-800/5"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <Link to="/login" className="rounded-lg px-3 py-1.5 font-medium text-navy-800 hover:bg-navy-800/5">
                Sign in
              </Link>
              <Link to="/register" className="rounded-lg bg-brand-500 px-3 py-1.5 font-medium text-white hover:bg-brand-600">
                Get started
              </Link>
            </div>
          ))}
      </nav>

      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-4xl font-bold text-brand-600">MEETPRO AI</h1>
          <p className="mt-2 text-navy-700">Connect. Communicate. Collaborate.</p>

          <div className="mt-8 space-y-4 text-left">
            <div>
              <label htmlFor="display-name" className="mb-1 block text-sm font-medium text-navy-800">
                Your name
              </label>
              <input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value.slice(0, 40))}
                placeholder="Guest"
                className="w-full rounded-lg border border-navy-800/20 px-3 py-2 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleCreate}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 font-medium text-white hover:bg-brand-600"
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
              New Meeting
            </button>

            <form onSubmit={handleJoin} className="space-y-2">
              <label htmlFor="join-input" className="block text-sm font-medium text-navy-800">
                Join with meeting ID or link
              </label>
              <div className="flex gap-2">
                <input
                  id="join-input"
                  type="text"
                  value={joinValue}
                  onChange={(e) => setJoinValue(e.target.value)}
                  placeholder="abc-defg-hij"
                  className="min-w-0 flex-1 rounded-lg border border-navy-800/20 px-3 py-2 focus:border-brand-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-navy-800 px-4 py-2 font-medium text-white hover:bg-navy-900"
                >
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  Join
                </button>
              </div>
              {joinError && <p className="text-sm text-red-600">{joinError}</p>}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
