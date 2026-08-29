"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VibeId } from "@/data/types";
import type { PartyMember, PartyState } from "@/lib/party/types";
import { toast } from "@/lib/toast";

const PARTY_STORAGE_KEY = "vybe.party.session";

export interface PartySession {
  roomId: string;
  memberId: string;
  name: string;
}

/** Remembered identity after the connection gave up (network died, not room closed). */
export interface LostIdentity {
  roomId: string;
  name: string;
}

export type PartyStatus = "idle" | "connecting" | "connected" | "reconnecting" | "closed";

const MAX_RETRIES = 5;
const HEARTBEAT_MS = 30_000;
const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;

function loadSession(): PartySession | null {
  try {
    const raw = sessionStorage.getItem(PARTY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PartySession>;
    if (parsed.roomId && parsed.memberId) {
      return {
        roomId: parsed.roomId,
        memberId: parsed.memberId,
        name: parsed.name ?? "",
      };
    }
  } catch {
    // storage unavailable or corrupt; ignore
  }
  return null;
}

function saveSession(session: PartySession): void {
  try {
    sessionStorage.setItem(PARTY_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // storage unavailable; session stays in-memory only
  }
}

function clearSession(): void {
  try {
    sessionStorage.removeItem(PARTY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function useParty() {
  const [status, setStatus] = useState<PartyStatus>("idle");
  const [state, setState] = useState<PartyState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [lostIdentity, setLostIdentity] = useState<LostIdentity | null>(null);
  /** True once the host removed this member from the room. */
  const [removed, setRemoved] = useState(false);

  const sessionRef = useRef<PartySession | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef(0);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const member: PartyMember | null = state && selfId
    ? (state.members.find((m) => m.id === selfId) ?? null)
    : null;

  const applyState = useCallback((next: PartyState) => {
    setState(next);
    setError(null);
    retryRef.current = 0;
  }, []);

  const stopConnection = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  /**
   * The host removed this member (or locked them out). Tear down the local
   * session so the UI can surface a "you were removed" state.
   */
  const handleRemoved = useCallback(() => {
    stopConnection();
    clearSession();
    sessionRef.current = null;
    setRemoved(true);
    setStatus("closed");
    setState(null);
    setSelfId(null);
    setLostIdentity(null);
    setError(null);
  }, [stopConnection]);

  /**
   * EventSource hides HTTP status codes, so every drop looks identical.
   * Probe the room once: a 404 means it is definitively gone (serverless
   * eviction or host ended it) — clean up immediately instead of retrying
   * into the void. Anything else falls back to backoff reconnects.
   */
  const handleDroppedStream = useCallback(
    async (session: PartySession) => {
      try {
        const res = await fetch(`/api/party/${session.roomId}`);
        if (res.status === 404) {
          clearSession();
          sessionRef.current = null;
          setStatus("closed");
          setState(null);
          setSelfId(null);
          toast("This party has ended", "info");
          return;
        }
      } catch {
        // Network-level failure — fall through to the retry path.
      }

      if (retryRef.current >= MAX_RETRIES) {
        // Network gave up — keep the identity around so the landing
        // page can offer a one-click rejoin. The room itself is fine.
        setLostIdentity({ roomId: session.roomId, name: session.name });
        setStatus("closed");
        setState(null);
        setSelfId(null);
        sessionRef.current = null;
        return;
      }
      setStatus("reconnecting");
      retryRef.current += 1;
      const delay =
        Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * Math.pow(2, retryRef.current - 1)) +
        Math.random() * 1_000;
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        const current = sessionRef.current;
        if (current && current.roomId === session.roomId) {
          openStreamRef.current?.(current);
        }
      }, delay);
    },
    [],
  );

  const openStreamRef = useRef<((session: PartySession) => void) | null>(null);

  const openStream = useCallback(
    (session: PartySession) => {
      stopConnection();
      sessionRef.current = session;
      setSelfId(session.memberId);
      setLostIdentity(null);
      setRemoved(false);
      retryRef.current = 0;

      const es = new EventSource(`/api/party/${session.roomId}/stream?memberId=${encodeURIComponent(session.memberId)}`);
      esRef.current = es;

      es.onopen = () => {
        retryRef.current = 0;
        setStatus("connected");
      };

      es.addEventListener("state", (ev) => {
        try {
          const next = JSON.parse((ev as MessageEvent<string>).data) as PartyState;
          applyState(next);
        } catch {
          // malformed frame; ignore
        }
      });

      es.addEventListener("patch", (ev) => {
        try {
          const patch = JSON.parse((ev as MessageEvent<string>).data) as Partial<PartyState> & { version: number; serverNow: number };
          setState((prev) => {
            if (!prev) return null;
            if (typeof patch.version === "number" && typeof (prev as PartyState & { version?: number }).version === "number" && patch.version < (prev as PartyState & { version: number }).version) {
              return prev;
            }
            return { ...prev, ...patch };
          });
        } catch {
          // malformed frame; ignore
        }
      });

      es.addEventListener("closed", () => {
        stopConnection();
        clearSession();
        sessionRef.current = null;
        setStatus("closed");
        setState(null);
        setSelfId(null);
      });

      es.onerror = () => {
        if (es.readyState !== EventSource.CLOSED) return;
        stopConnection();
        void handleDroppedStream(session);
      };

      heartbeatRef.current = setInterval(() => {
        const current = sessionRef.current;
        if (!current) return;
        fetch(`/api/party/${current.roomId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberId: current.memberId,
            command: "heartbeat",
          }),
        })
          .then((res) => {
            if (
              res.status === 403 &&
              current.roomId === sessionRef.current?.roomId
            ) {
              handleRemoved();
            }
          })
          .catch(() => {});
      }, HEARTBEAT_MS);
    },
    [applyState, handleRemoved, stopConnection, handleDroppedStream],
  );

  openStreamRef.current = openStream;

  // Auto-rejoin a persisted session on mount. Validate the room still
  // exists before opening the SSE stream to avoid the retry-timeout loop.
  useEffect(() => {
    const session = loadSession();
    if (!session) return;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/party/${session.roomId}`);
        if (!res.ok) {
          clearSession();
          return;
        }
      } catch {
        clearSession();
        return;
      }
      setStatus("connecting");
      openStream(session);
    }, 0);
    return () => clearTimeout(t);
  }, [openStream]);

  useEffect(() => () => stopConnection(), [stopConnection]);

  const createParty = useCallback(
    async (hostName: string, vibeId: VibeId) => {
      const res = await fetch("/api/party", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostName, vibeId }),
      });
      const data = (await res.json().catch(() => null)) as
        | { roomId?: string; member?: PartyMember; state?: PartyState; error?: string }
        | null;
      if (!res.ok || !data?.roomId || !data.member || !data.state) {
        throw new Error(data?.error ?? "Failed to create party");
      }
      const session: PartySession = {
        roomId: data.roomId,
        memberId: data.member.id,
        name: data.member.name,
      };
      saveSession(session);
      setStatus("connecting");
      openStream(session);
      return session.roomId;
    },
    [openStream],
  );

  const joinParty = useCallback(
    async (roomId: string, name: string) => {
      const res = await fetch(`/api/party/${roomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "join", name }),
      });
      const data = (await res.json().catch(() => null)) as
        | { member?: PartyMember; state?: PartyState; error?: string }
        | null;
      if (!res.ok || !data?.member || !data.state) {
        throw new Error(data?.error ?? "Failed to join party");
      }
      const session: PartySession = {
        roomId,
        memberId: data.member.id,
        name: data.member.name,
      };
      saveSession(session);
      setStatus("connecting");
      openStream(session);
    },
    [openStream],
  );

  const send = useCallback(
    async (command: string, payload?: Record<string, unknown>): Promise<boolean> => {
      const session = sessionRef.current;
      if (!session || !["connected", "reconnecting", "connecting"].includes(status)) {
        setError("Connection lost. Please rejoin the party.");
        return false;
      }
      try {
        const res = await fetch(`/api/party/${session.roomId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId: session.memberId, command, payload }),
        });
        if (res.ok) {
          const data = (await res.json().catch(() => null)) as { state?: PartyState } | null;
          if (data?.state) applyState(data.state);
          return true;
        } else {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          if (data?.error) {
            if (res.status === 403 && data.error.includes("Not a member")) {
              handleRemoved();
              return false;
            }
            setError(data.error);
          }
          return false;
        }
      } catch {
        setError("Network error. Check your connection.");
        return false;
      }
    },
    [applyState, handleRemoved, status],
  );

  const leaveParty = useCallback(() => {
    const session = sessionRef.current;
    if (session) {
      fetch(`/api/party/${session.roomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: session.memberId, command: "leave" }),
      }).catch(() => {});
    }
    stopConnection();
    clearSession();
    sessionRef.current = null;
    setSelfId(null);
    setState(null);
    setStatus("idle");
    setError(null);
    setRemoved(false);
  }, [stopConnection]);

  const reset = useCallback(() => {
    stopConnection();
    clearSession();
    sessionRef.current = null;
    setSelfId(null);
    setState(null);
    setStatus("idle");
    setError(null);
    setRemoved(false);
  }, [stopConnection]);

  return {
    status,
    state,
    member,
    isHost: member?.isHost ?? false,
    error,
    lostIdentity,
    removed,
    createParty,
    joinParty,
    send,
    leaveParty,
    reset,
  };
}
