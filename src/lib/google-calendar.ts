import { google, calendar_v3 } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback`
  );
}

export function getAuthUrl(): string {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent", // Always show consent to get refresh token
  });
}

export async function getTokensFromCode(code: string) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

export async function getCalendarClient(tokens: {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
}): Promise<calendar_v3.Calendar> {
  const client = getOAuthClient();
  client.setCredentials(tokens);

  // Handle token refresh
  client.on("tokens", (newTokens) => {
    // In a real app, you'd save these new tokens
    console.log("New tokens received:", newTokens);
  });

  return google.calendar({ version: "v3", auth: client });
}

export interface CalendarEventInput {
  summary: string;
  description?: string;
  dueDate: string; // YYYY-MM-DD
}

export async function createCalendarEvent(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  input: CalendarEventInput
): Promise<string | null> {
  try {
    const response = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: input.summary,
        description: input.description,
        start: {
          date: input.dueDate,
        },
        end: {
          date: input.dueDate,
        },
      },
    });

    return response.data.id ?? null;
  } catch (error) {
    console.error("Failed to create calendar event:", error);
    return null;
  }
}

export async function updateCalendarEvent(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  eventId: string,
  input: CalendarEventInput
): Promise<boolean> {
  try {
    await calendar.events.update({
      calendarId,
      eventId,
      requestBody: {
        summary: input.summary,
        description: input.description,
        start: {
          date: input.dueDate,
        },
        end: {
          date: input.dueDate,
        },
      },
    });

    return true;
  } catch (error) {
    console.error("Failed to update calendar event:", error);
    return false;
  }
}

export async function deleteCalendarEvent(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  eventId: string
): Promise<boolean> {
  try {
    await calendar.events.delete({
      calendarId,
      eventId,
    });

    return true;
  } catch (error) {
    console.error("Failed to delete calendar event:", error);
    return false;
  }
}

export async function listCalendars(
  calendar: calendar_v3.Calendar
): Promise<{ id: string; summary: string }[]> {
  try {
    const response = await calendar.calendarList.list();
    return (response.data.items ?? [])
      .filter((cal) => cal.id && cal.summary)
      .map((cal) => ({
        id: cal.id!,
        summary: cal.summary!,
      }));
  } catch (error) {
    console.error("Failed to list calendars:", error);
    return [];
  }
}
