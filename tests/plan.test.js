import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AI_MODE,
  generatePlan,
  getPlanWindow,
  resolveDestination,
  splitBudget,
} from '../src/lib/ai.js';
import { destinations } from '../src/data/destinations.js';

const baseInput = {
  origin: 'Bengaluru',
  destination: 'ooty',
  destinationName: 'Ooty',
  startDate: '2026-12-01',
  endDate: '2026-12-03',
  travellers: 2,
  budget: 18000,
  preferences: ['food'],
  tripType: 'family',
};

test('splitBudget always sums exactly to the requested total', () => {
  for (const total of [0, 1, 7, 999, 18000, 1234567]) {
    const split = splitBudget(total, ['food', 'shopping']);
    const sum = split.transportation + split.accommodation + split.food
      + split.activities + split.shopping + split.other;
    assert.equal(sum, total);
    assert.equal(split.total, total);
  }
  assert.equal(splitBudget('not-a-number').total, 0);
});

test('getPlanWindow validates dates and caps at 14 days', () => {
  assert.deepEqual(getPlanWindow({ startDate: '2026-12-01', endDate: '2026-12-03' }), {
    startDate: '2026-12-01',
    endDate: '2026-12-03',
    days: 3,
    dates: ['2026-12-01', '2026-12-02', '2026-12-03'],
  });
  assert.equal(getPlanWindow({ startDate: '2026-01-01', endDate: '2026-12-31' }).days, 14);
  assert.equal(getPlanWindow({ startDate: 'not-a-date' }).days, 1);
  assert.equal(getPlanWindow({ startDate: '2026-02-30' }).dates[0], '1970-01-01');
});

test('resolveDestination uses the real catalogue', () => {
  assert.equal(resolveDestination({ destination: 'ooty' }).name, 'Ooty');
  assert.equal(resolveDestination({ destinationName: 'Jaipur' }).id, 'jaipur');
  assert.equal(resolveDestination({ destination: 'nowhere' }), null);
});

test('generatePlan is deterministic, demo-labelled and built from real highlights', async () => {
  const plan = await generatePlan(baseInput);
  const again = await generatePlan(baseInput);
  assert.equal(plan.mode, AI_MODE);
  assert.equal(plan.mode, 'demo');
  assert.deepEqual(plan, again);
  assert.match(plan.summary, /DEMO \/ NEW PLAN ONLY/);
  assert.equal(plan.itinerary.length, 3);
  assert.deepEqual(Object.keys(plan.budget).sort(), [
    'accommodation', 'activities', 'food', 'other', 'shopping', 'total', 'transportation',
  ]);

  const highlights = destinations.find((item) => item.id === 'ooty').highlights;
  const titles = plan.itinerary.flatMap((day) => day.activities.map((activity) => activity.title));
  assert.ok(titles.some((title) => highlights.some((highlight) => title.includes(highlight))));
  assert.ok(plan.itinerary.every((day) => day.activities.length === 3));
  assert.deepEqual(
    [...new Set(plan.itinerary[0].activities.map((item) => item.time))].sort(),
    ['afternoon', 'evening', 'morning'],
  );
});

test('generatePlan never exceeds 14 days and labels suggestions as demo', async () => {
  const plan = await generatePlan({ ...baseInput, endDate: '2027-03-01' });
  assert.equal(plan.itinerary.length, 14);
  assert.ok(plan.suggestions.some((item) => item.includes('DEMO')));
});
