import { randomUUID } from 'node:crypto';
import {
  expect,
  test as base,
  type APIRequestContext,
  type Locator,
  type Page,
  type Response,
} from '@playwright/test';
import type { CreateReservationRequest } from '../shared/contracts';

type Slot = Pick<CreateReservationRequest, 'startTime' | 'endTime'>;
interface Students {
  owner: string;
  visitor: string;
}

function tomorrowSlot(hour: number, worker: number): Slot {
  // Slots are UTC instants. Each parallel worker gets a disjoint one-hour window.
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 1);
  start.setUTCHours(hour + worker, 0, 0, 0);
  return {
    startTime: start.toISOString(),
    endTime: new Date(start.getTime() + 3_600_000).toISOString(),
  };
}

function browserZone(zone: string | undefined): string {
  if (!zone) throw new Error('Set use.timezoneId in playwright.config.ts');
  return zone;
}

// datetime-local inputs take wall-clock time in the browser's zone.
function localInput(instant: string, timeZone: string): string {
  return new Date(instant)
    .toLocaleString('sv-SE', { timeZone })
    .replace(' ', 'T')
    .slice(0, 16);
}

async function history(
  request: APIRequestContext,
  student: string,
): Promise<(Slot & { id: string })[]> {
  const response = await request.get(`/api/v1/reservations/user/${student}`);
  await expect(response).toBeOK();
  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error('Expected a reservation list');
  return data.map((row: unknown) => {
    if (
      typeof row !== 'object' ||
      row === null ||
      !('id' in row) ||
      typeof row.id !== 'string' ||
      !('startTime' in row) ||
      typeof row.startTime !== 'string' ||
      !('endTime' in row) ||
      typeof row.endTime !== 'string'
    )
      throw new Error('Expected a reservation ID and timestamps');
    // Compare the instant across valid ISO encodings, including omitted .000.
    return {
      ...row,
      id: row.id,
      startTime: new Date(row.startTime).toISOString(),
      endTime: new Date(row.endTime).toISOString(),
    };
  });
}

const test = base.extend<{ students: Students }>({
  students: async ({ request }, use) => {
    const key = randomUUID();
    const students = { owner: `owner-${key}`, visitor: `guest-${key}` };
    await use(students);
    // Release this test's slots for repeats and interactive re-runs.
    for (const student of Object.values(students)) {
      for (const booking of await history(request, student)) {
        await expect(
          await request.patch(`/api/v1/reservations/${booking.id}/cancel`),
        ).toBeOK();
      }
    }
  },
});

function myBookings(page: Page): Locator {
  return page.getByRole('region', { name: /^My Bookings\b/ });
}

async function switchStudent(page: Page, id: string): Promise<void> {
  await page.getByLabel('Student ID').fill(id);
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(myBookings(page).getByText(id, { exact: true })).toBeVisible();
}

async function selectResource(
  page: Page,
  category: string,
  name: string,
): Promise<void> {
  const directory = page.getByRole('region', { name: 'Find your space' });
  const filter = directory.getByRole('button', { name: category, exact: true });
  await filter.click();
  await expect(filter).toHaveAttribute('aria-pressed', 'true');
  const card = directory
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name, exact: true }) });
  await card.getByRole('button', { name: 'Reserve resource' }).click();
}

function bookingForm(page: Page): Locator {
  return page.getByRole('region', { name: 'Reserve a moment.' });
}

async function submitSlot(
  page: Page,
  slot: Slot,
  timeZone: string,
): Promise<Response> {
  const form = bookingForm(page);
  await form
    .getByLabel('Start time')
    .fill(localInput(slot.startTime, timeZone));
  await form.getByLabel('End time').fill(localInput(slot.endTime, timeZone));
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.request().method() === 'POST' &&
        new URL(res.url()).pathname === '/api/v1/reservations',
    ),
    form.getByRole('button', { name: 'Create reservation' }).click(),
  ]);
  return response;
}

test('A student books an available study room', async ({
  page,
  request,
  students,
  timezoneId,
}, info) => {
  const zone = browserZone(timezoneId);
  const slot = tomorrowSlot(10, info.parallelIndex);
  await page.goto('/');
  await switchStudent(page, students.owner);
  await expect(
    myBookings(page).getByText(/No active bookings yet/),
  ).toBeVisible();
  const printer = page.getByRole('heading', {
    name: '3D Printer A',
    exact: true,
  });
  await expect(printer).toBeVisible();
  await selectResource(page, 'Study rooms', 'Study Room 302');
  await expect(printer).toHaveCount(0);

  expect((await submitSlot(page, slot, zone)).status()).toBe(201);
  await expect(bookingForm(page).getByRole('status')).toHaveText(
    'Reservation created. You can find it in My Bookings.',
  );
  await page.reload();
  await switchStudent(page, students.owner);
  const row = myBookings(page).getByRole('article');
  await expect(row).toHaveCount(1);
  await expect(
    row.getByRole('heading', { name: 'Study Room 302', exact: true }),
  ).toBeVisible();
  await expect(row.getByText('PENDING', { exact: true })).toBeVisible();
  // My Bookings renders the stored UTC instants in the browser's zone.
  await expect(row).toContainText(
    new Date(slot.startTime).toLocaleDateString('en-US', { timeZone: zone }),
  );
  for (const instant of [slot.startTime, slot.endTime])
    await expect(row).toContainText(
      new Date(instant).toLocaleTimeString('en-US', { timeZone: zone }),
    );
  expect(await history(request, students.owner)).toEqual([
    expect.objectContaining({
      userId: students.owner,
      resourceId: 'res-101',
      status: 'PENDING',
      ...slot,
    }),
  ]);
});

test('A second student tries to book an occupied printer', async ({
  page,
  request,
  students,
  timezoneId,
}, info) => {
  const zone = browserZone(timezoneId);
  const slot = tomorrowSlot(14, info.parallelIndex);
  await page.goto('/');
  await switchStudent(page, students.owner);
  await selectResource(page, 'Equipment', '3D Printer A');
  expect((await submitSlot(page, slot, zone)).status()).toBe(201);
  const original = await history(request, students.owner);
  expect(original).toEqual([
    expect.objectContaining({
      userId: students.owner,
      resourceId: 'res-102',
      status: 'PENDING',
      ...slot,
    }),
  ]);

  await switchStudent(page, students.visitor);
  await selectResource(page, 'Equipment', '3D Printer A');
  const denied = await submitSlot(page, slot, zone);
  expect(denied.status()).toBe(409);
  expect(await denied.json()).toMatchObject({ code: 'DOUBLE_BOOKING' });
  await expect(bookingForm(page).getByRole('alert')).toHaveText(
    'This resource is already reserved for the selected time window. Please choose another time.',
  );
  await myBookings(page).getByRole('button', { name: 'Refresh' }).click();
  await expect(
    myBookings(page).getByText(/No active bookings yet/),
  ).toBeVisible();
  expect(await history(request, students.visitor)).toEqual([]);
  expect(await history(request, students.owner)).toEqual(original);
});
