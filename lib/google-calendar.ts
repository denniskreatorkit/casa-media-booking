/**
 * Google Calendar integration via OAuth2 (client_id + client_secret + refresh_token).
 * Replaces the previous service-account approach.
 *
 * Required env vars:
 *   GOOGLE_CALENDAR_CLIENT_ID
 *   GOOGLE_CALENDAR_CLIENT_SECRET
 *   GOOGLE_CALENDAR_REFRESH_TOKEN
 *   GOOGLE_CALENDAR_ID  (defaults to "primary")
 */

export interface CalendarEventInput {
  summary: string;
  description?: string;
  location?: string;
  startAt: Date;
  endAt: Date;
  attendeeEmails?: string[];
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) return null;

  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    console.error("[google-calendar] Token refresh failed:", await res.text());
    return null;
  }

  const data = (await res.json()) as GoogleTokenResponse;
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.value;
}

export function getCalendarId(): string {
  return process.env.GOOGLE_CALENDAR_ID || "primary";
}

/**
 * List calendar events within a time window.
 * Returns an empty array if credentials are not configured or the call fails.
 */
export async function listCalendarEvents(
  calendarId: string,
  timeMin: Date,
  timeMax: Date
): Promise<GoogleCalendarEvent[]> {
  const token = await getAccessToken();
  if (!token) return [];

  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    console.error("[google-calendar] listEvents failed:", await res.text());
    return [];
  }

  const data = await res.json();
  return (data.items ?? []) as GoogleCalendarEvent[];
}

/**
 * Create a calendar event. Returns the new event ID or null on failure.
 */
export async function createCalendarEvent(
  calendarId: string,
  input: CalendarEventInput
): Promise<string | null> {
  const token = await getAccessToken();
  if (!token) {
    console.warn("[google-calendar] Skipping event creation — credentials not configured");
    return null;
  }

  const body = {
    summary: input.summary,
    description: input.description,
    location: input.location,
    start: { dateTime: input.startAt.toISOString(), timeZone: "Europe/Amsterdam" },
    end: { dateTime: input.endAt.toISOString(), timeZone: "Europe/Amsterdam" },
    attendees: input.attendeeEmails?.map((email) => ({ email })),
  };

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    console.error("[google-calendar] createEvent failed:", await res.text());
    return null;
  }

  const data = await res.json();
  return data.id as string;
}
