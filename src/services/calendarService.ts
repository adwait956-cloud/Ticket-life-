import { BookingRecord } from '../types/travel';

export interface CalendarSyncResult {
  eventId: string;
  htmlLink?: string;
  summary: string;
  startTime: string;
  endTime: string;
}

/**
 * Converts a date ('YYYY-MM-DD') and time (e.g. '06:00 AM', '04:55 PM', '14:30') to a valid ISO datetime string.
 */
function parseToIsoDateTime(dateStr: string, timeStr: string, fallbackOffsetHours = 2): string {
  try {
    const cleanDate = dateStr.trim();
    let hours = 9;
    let minutes = 0;

    const ampmMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (ampmMatch) {
      let h = parseInt(ampmMatch[1], 10);
      const m = parseInt(ampmMatch[2], 10);
      const meridiem = ampmMatch[3]?.toUpperCase();

      if (meridiem === 'PM' && h < 12) h += 12;
      if (meridiem === 'AM' && h === 12) h = 0;

      hours = h;
      minutes = m;
    } else {
      const parts = timeStr.split(':');
      if (parts.length >= 2) {
        hours = parseInt(parts[0], 10) || 9;
        minutes = parseInt(parts[1], 10) || 0;
      }
    }

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${cleanDate}T${pad(hours)}:${pad(minutes)}:00+05:30`;
  } catch (e) {
    const d = new Date(dateStr);
    d.setHours(d.getHours() + fallbackOffsetHours);
    return d.toISOString();
  }
}

/**
 * Creates an official Google Calendar event for a confirmed booking.
 * Note: Workspace Integration requires user confirmation before mutating data.
 */
export async function createBookingCalendarEvent(
  booking: BookingRecord,
  accessToken: string
): Promise<CalendarSyncResult> {
  if (!accessToken) {
    throw new Error('Google authorization token is required to sync to Google Calendar.');
  }

  const categoryIcons: Record<string, string> = {
    cars: '🚗',
    autos: '🛺',
    bikes: '🛵',
  };
  const icon = categoryIcons[booking.category] || '🎫';

  const startIso = parseToIsoDateTime(booking.departureDate, booking.departureTime, 0);
  const endIso = parseToIsoDateTime(
    booking.arrivalDate || booking.departureDate,
    booking.arrivalTime || '11:00 PM',
    3
  );

  const summary = `${icon} ${booking.serviceTitle} (${booking.originCode} → ${booking.destCode}) - Ticket Life`;
  const location = booking.originAddress || `${booking.terminalOrPlatform || 'Main Station/Bay'}, ${booking.origin}`;

  const passengerNames = booking.passengers.map((p) => p.fullName).join(', ');
  const seatInfo = booking.seatNumbers.length > 0 ? booking.seatNumbers.join(', ') : 'Assigned at Gate/Boarding';

  const description = [
    `🎫 TICKET LIFE CONFIRMED JOURNEY`,
    `Ref / PNR: ${booking.pnrNumber || booking.bookingRef}`,
    `Booking ID: ${booking.id}`,
    `Service: ${booking.serviceTitle} (${booking.vehicleType})`,
    `Category: ${booking.category.toUpperCase()}`,
    `Passengers (${booking.passengers.length}): ${passengerNames}`,
    `Seats/Berths: ${seatInfo}`,
    `Departure: ${booking.departureDate} at ${booking.departureTime}`,
    `Boarding Point: ${location}`,
    `Drop Location: ${booking.destAddress || booking.destination}`,
    `Total Fare Paid: ₹${booking.fareBreakdown.totalAmount.toLocaleString('en-IN')}`,
    `Status: CONFIRMED · Verified Partner Gateway`,
  ].join('\n');

  const eventPayload = {
    summary,
    description,
    location,
    start: {
      dateTime: startIso,
      timeZone: 'Asia/Kolkata',
    },
    end: {
      dateTime: endIso,
      timeZone: 'Asia/Kolkata',
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 120 }, // 2 hours before
        { method: 'popup', minutes: 30 },  // 30 mins before
      ],
    },
    colorId: booking.category === 'cars' ? '9' : booking.category === 'autos' ? '5' : '6',
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let parsedMessage = 'Failed to create calendar event';
    try {
      const errJson = JSON.parse(errorText);
      parsedMessage = errJson?.error?.message || parsedMessage;
    } catch {}
    throw new Error(`Google Calendar API error (${response.status}): ${parsedMessage}`);
  }

  const data = await response.json();
  return {
    eventId: data.id,
    htmlLink: data.htmlLink,
    summary,
    startTime: startIso,
    endTime: endIso,
  };
}

/**
 * Fetches upcoming events from the user's primary Google Calendar.
 */
export async function listUpcomingCalendarEvents(
  accessToken: string,
  maxResults = 10
): Promise<any[]> {
  if (!accessToken) return [];

  const nowIso = new Date().toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    nowIso
  )}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    console.warn('Could not list calendar events:', response.status);
    return [];
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Removes a synced event from the user's Google Calendar.
 */
export async function deleteCalendarEvent(
  eventId: string,
  accessToken: string
): Promise<boolean> {
  if (!accessToken || !eventId) return false;

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return response.ok || response.status === 404;
}
