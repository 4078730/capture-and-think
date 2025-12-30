import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCalendarClient, listCalendars } from "@/lib/google-calendar";
import { z } from "zod";

const updateSettingsSchema = z.object({
  google_calendar_enabled: z.boolean().optional(),
  google_calendar_id: z.string().optional(),
});

// GET - Get calendar settings
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: settings } = await supabase
      .from("user_settings")
      .select("google_calendar_enabled, google_calendar_id, google_calendar_token")
      .eq("user_id", user.id)
      .single();

    const isConnected = !!settings?.google_calendar_token;
    let calendars: { id: string; summary: string }[] = [];

    // If connected, fetch available calendars
    if (isConnected && settings.google_calendar_token) {
      try {
        const calendar = await getCalendarClient(settings.google_calendar_token);
        calendars = await listCalendars(calendar);
      } catch (error) {
        console.error("Failed to fetch calendars:", error);
      }
    }

    return NextResponse.json({
      connected: isConnected,
      enabled: settings?.google_calendar_enabled ?? false,
      selectedCalendarId: settings?.google_calendar_id ?? null,
      calendars,
    });
  } catch (error) {
    console.error("GET /api/calendar/settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Update calendar settings
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const parsed = updateSettingsSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    const { error } = await supabase
      .from("user_settings")
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/calendar/settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Disconnect calendar
export async function DELETE() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("user_settings")
      .update({
        google_calendar_token: null,
        google_calendar_enabled: false,
        google_calendar_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/calendar/settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
