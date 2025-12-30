import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getCalendarClient,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/google-calendar";
import type { Item } from "@/types";

// POST - Sync items with calendar
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user settings
    const { data: settings } = await supabase
      .from("user_settings")
      .select("google_calendar_enabled, google_calendar_id, google_calendar_token")
      .eq("user_id", user.id)
      .single();

    if (!settings?.google_calendar_enabled || !settings.google_calendar_token || !settings.google_calendar_id) {
      return NextResponse.json({ error: "Calendar not configured" }, { status: 400 });
    }

    const calendar = await getCalendarClient(settings.google_calendar_token);
    const calendarId = settings.google_calendar_id;

    // Get items with due dates
    const { data: items, error: fetchError } = await supabase
      .from("items")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .not("due_date", "is", null);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    let created = 0;
    let updated = 0;
    let deleted = 0;
    let errors = 0;

    for (const item of items as Item[]) {
      if (!item.due_date) continue;

      const eventInput = {
        summary: item.summary || item.body.slice(0, 100),
        description: item.body,
        dueDate: item.due_date,
      };

      try {
        if (item.google_calendar_event_id) {
          // Update existing event
          const success = await updateCalendarEvent(
            calendar,
            calendarId,
            item.google_calendar_event_id,
            eventInput
          );
          if (success) {
            updated++;
          } else {
            errors++;
          }
        } else {
          // Create new event
          const eventId = await createCalendarEvent(calendar, calendarId, eventInput);
          if (eventId) {
            // Save event ID to item
            await supabase
              .from("items")
              .update({ google_calendar_event_id: eventId })
              .eq("id", item.id);
            created++;
          } else {
            errors++;
          }
        }
      } catch (error) {
        console.error("Sync error for item:", item.id, error);
        errors++;
      }
    }

    // Handle archived items with calendar events (delete events)
    const { data: archivedItems } = await supabase
      .from("items")
      .select("id, google_calendar_event_id")
      .eq("user_id", user.id)
      .eq("status", "archived")
      .not("google_calendar_event_id", "is", null);

    for (const item of archivedItems ?? []) {
      if (item.google_calendar_event_id) {
        try {
          const success = await deleteCalendarEvent(
            calendar,
            calendarId,
            item.google_calendar_event_id
          );
          if (success) {
            await supabase
              .from("items")
              .update({ google_calendar_event_id: null })
              .eq("id", item.id);
            deleted++;
          }
        } catch (error) {
          console.error("Delete error for item:", item.id, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      deleted,
      errors,
    });
  } catch (error) {
    console.error("POST /api/calendar/sync error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
