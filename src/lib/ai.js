/**
 * DEMO-MODE trip planner. Everything here is generated locally from the curated
 * destination catalogue. No API keys live in the browser. If VITE_AI_ENDPOINT is
 * configured we POST to it, but responses are still labelled DEMO / NEW PLAN and
 * any failure falls back to the deterministic local generator.
 */
import { destinations, getDestination } from '../data/destinations.js';

export const AI_MODE = 'demo';

const MAX_DAYS = 14;
const FALLBACK_START = '1970-01-01';

const runtimeEnv = (() => {
  try {
    return typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
  } catch {
    return {};
  }
})();

const AI_ENDPOINT = String(runtimeEnv.VITE_AI_ENDPOINT ?? '').trim();

const BUDGET_KEYS = ['transportation', 'accommodation', 'food', 'activities', 'shopping', 'other'];
const BASE_WEIGHTS = {
  transportation: 0.28,
  accommodation: 0.30,
  food: 0.20,
  activities: 0.14,
  shopping: 0.05,
  other: 0.03,
};

export function toPreferenceList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

/** Preference-adjusted weights, normalised to exactly 1. */
export function budgetWeights(preferences = []) {
  const weights = { ...BASE_WEIGHTS };
  const combined = toPreferenceList(preferences).join(' ').toLowerCase();

  if (/food|cuisine|culinary|foodie/.test(combined)) {
    weights.food += 0.06;
    weights.accommodation -= 0.03;
    weights.other -= 0.03;
  }
  if (/shop/.test(combined)) {
    weights.shopping += 0.06;
    weights.activities -= 0.03;
    weights.other -= 0.03;
  }
  if (/adventure|trek|hik|outdoor/.test(combined)) {
    weights.activities += 0.06;
    weights.shopping -= 0.03;
    weights.other -= 0.03;
  }
  if (/budget|cheap|save|econom/.test(combined)) {
    weights.transportation += 0.07;
    weights.accommodation -= 0.05;
    weights.food -= 0.02;
  }

  for (const key of BUDGET_KEYS) weights[key] = Math.max(0.01, weights[key]);
  const sum = BUDGET_KEYS.reduce((total, key) => total + weights[key], 0);
  for (const key of BUDGET_KEYS) weights[key] = weights[key] / sum;
  return weights;
}

/** Splits a numeric budget into integer category amounts that always sum to total. */
export function splitBudget(total, preferences = []) {
  const amount = Number.isFinite(Number(total)) ? Math.max(0, Math.round(Number(total))) : 0;
  if (amount === 0) {
    return { transportation: 0, accommodation: 0, food: 0, activities: 0, shopping: 0, other: 0, total: 0 };
  }

  const weights = budgetWeights(preferences);
  const result = {};
  let allocated = 0;
  BUDGET_KEYS.forEach((key, index) => {
    if (index === BUDGET_KEYS.length - 1) {
      result[key] = amount - allocated;
    } else {
      const share = Math.min(amount - allocated, Math.round(amount * weights[key]));
      result[key] = share;
      allocated += share;
    }
  });
  result.total = amount;
  return result;
}

function parseDate(value) {
  if (typeof value !== 'string' && !(value instanceof Date)) return null;
  const raw = typeof value === 'string' ? value.trim() : value.toISOString();
  if (!raw) return null;

  const isoDay = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (isoDay) {
    const year = Number(isoDay[1]);
    const month = Number(isoDay[2]);
    const day = Number(isoDay[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    ) return null;
    return parsed;
  }

  const timestamp = Date.parse(raw);
  return Number.isNaN(timestamp) ? null : new Date(timestamp);
}

/** Validates input dates, clamps to 1..14 days and returns concrete day strings. */
export function getPlanWindow(input = {}) {
  const fallback = parseDate(FALLBACK_START);
  const parsedStart = parseDate(input.startDate);
  const start = parsedStart ?? fallback;
  let end = parseDate(input.endDate);
  if (!end || end.getTime() < start.getTime()) end = start;

  const rawDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  const days = Math.max(1, Math.min(MAX_DAYS, rawDays));
  const dates = Array.from({ length: days }, (_, index) => (
    new Date(start.getTime() + index * 86400000).toISOString().slice(0, 10)
  ));

  return { startDate: dates[0], endDate: dates[dates.length - 1], days, dates };
}

export function resolveDestination(input = {}) {
  if (input.destination) {
    const byId = getDestination(String(input.destination));
    if (byId) return byId;
  }
  const name = String(input.destinationName ?? input.destination ?? '').trim().toLowerCase();
  if (!name) return null;
  return destinations.find((item) => (
    item.name.toLowerCase() === name || item.city.toLowerCase() === name
  )) ?? null;
}

function slotDescriptions(destination) {
  const place = destination?.name ?? 'your chosen destination';
  return [
    `Morning: start with a relaxed visit and time to take it in. DEMO plan for ${place} — indicative only.`,
    `Afternoon: explore at an unhurried pace, leaving room for a café or rest stop. DEMO estimate, not a booking.`,
    `Evening: wind down nearby and note what you would like to re-visit. DEMO suggestion only.`,
  ];
}

function buildActivities(destination, window, preferences, tripType) {
  const curated = Array.isArray(destination?.highlights) && destination.highlights.length
    ? destination.highlights
    : ['Arrival and local orientation', 'Neighbourhood walk', 'Regional food tasting'];
  const descriptions = slotDescriptions(destination);
  const slots = ['morning', 'afternoon', 'evening'];
  const style = String(tripType ?? '').trim();
  const prefs = toPreferenceList(preferences);

  return window.dates.map((date, dayIndex) => ({
    day: dayIndex + 1,
    date,
    activities: slots.map((time, slotIndex) => {
      const highlight = curated[(dayIndex * 2 + slotIndex) % curated.length];
      const personalNote = slotIndex === 2 && prefs.length
        ? ` Tailored around your ${prefs.slice(0, 2).join(' and ')} preference.`
        : '';
      return {
        id: `d${dayIndex + 1}-${time}`,
        time,
        title: `${highlight}${style ? ` — ${style} day ${dayIndex + 1}` : ''}`,
        description: `${descriptions[slotIndex]} Featured highlight: ${highlight}.${personalNote}`,
      };
    }),
  }));
}

function buildDemoPlan(input = {}) {
  const window = getPlanWindow(input);
  const destination = resolveDestination(input);
  const preferences = toPreferenceList(input.preferences);
  const travellers = Math.max(1, Math.min(100, Math.round(Number(input.travellers) || 1)));
  const tripType = String(input.tripType ?? '').trim();
  const budget = splitBudget(input.budget, preferences);
  const itinerary = buildActivities(destination, window, preferences, tripType);

  const suggestions = [
    `DEMO / NEW PLAN: built locally from ${destination ? `${destination.name}'s curated highlights` : 'a generic template'} — no live AI, availability or bookings.`,
    destination
      ? `Indicative only: ${destination.idealDays} ideal day(s), roughly ₹${destination.avgDailyINR} per day. Verify all prices before booking.`
      : 'Choose a known destination id to generate activities from its real curated highlights.',
    ...preferences.slice(0, 3).map((item) => `Preference noted: ${item} — reflected where possible in this demo plan.`),
    `Trip length capped at ${MAX_DAYS} days for this demo. Adjust dates in the planner for your real trip.`,
  ];

  const summary = [
    'DEMO / NEW PLAN ONLY — locally generated, not live AI.',
    `${window.days} day${window.days === 1 ? '' : 's'} for ${travellerLabel(travellers)}`,
    destination ? `in ${destination.name}` : 'at a destination of your choice',
    tripType ? `(${tripType})` : '',
    `with an indicative budget of ₹${budget.total}.`,
    'All amounts are estimates; nothing is reserved or booked.',
  ].filter(Boolean).join(' ');

  return { mode: AI_MODE, itinerary, budget, suggestions, summary };
}

function travellerLabel(count) {
  return `${count} traveller${count === 1 ? '' : 's'}`;
}

async function requestRemotePlan(input) {
  if (!AI_ENDPOINT || typeof fetch !== 'function') return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const payload = await response.json();
    if (!payload || !Array.isArray(payload.itinerary) || !payload.budget || typeof payload.summary !== 'string') {
      return null;
    }

    return {
      ...payload,
      mode: AI_MODE,
      suggestions: Array.isArray(payload.suggestions) ? payload.suggestions : [],
      summary: `DEMO / NEW PLAN via configured endpoint (not a live booking): ${payload.summary}`,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function generatePlan(input = {}) {
  const demoPlan = buildDemoPlan(input);
  const remotePlan = await requestRemotePlan(input);
  return remotePlan ?? demoPlan;
}
