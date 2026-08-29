export function getPartyShareUrl(roomId: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/party/${roomId}`;
}

export function sharePartyLink(roomId: string): Promise<boolean> {
  const url = getPartyShareUrl(roomId);
  if (navigator.share) {
    return navigator
      .share({ title: "Join my VYBE Party", url })
      .then(() => true)
      .catch(() => false);
  }
  return navigator.clipboard.writeText(url).then(() => true).catch(() => false);
}

const PARTY_NAME_KEY = "vybe.party.name.v1";

export function savePartyName(name: string): void {
  try {
    window.localStorage.setItem(PARTY_NAME_KEY, name);
  } catch {
    // best effort
  }
}

export function loadPartyName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(PARTY_NAME_KEY)?.trim() || null;
  } catch {
    return null;
  }
}
