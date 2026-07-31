// Safety-critical: AD-3 confirmation gate. A reminder must never be created
// (or auto-generated) for a medication the caregiver hasn't confirmed.

jest.mock('../supabase', () => ({
  supabase: { from: jest.fn() },
}));
// confirmMedication/addReminder pull this in via a dynamic require() to sync
// on-device notifications; that's covered separately in reminders.test.ts.
jest.mock('../reminders', () => ({
  syncScheduledReminders: jest.fn(),
}));

import { supabase } from '../supabase';
import { addReminder, confirmMedication } from '../database';

type Response = { data?: any; error?: any };

// supabase-js query builders are chainable AND directly awaitable (some call
// sites terminate with .single()/.maybeSingle(), others just await the
// builder itself after .update()/.delete()/.insert()). This fake supports
// both by queuing one response per supabase.from(...) call, in call order.
function mockSupabaseSequence(responses: Response[]) {
  const builders: any[] = [];
  let call = 0;
  (supabase.from as jest.Mock).mockImplementation(() => {
    const response = responses[call] ?? { data: null, error: null };
    call++;
    const builder: any = {
      select: jest.fn(() => builder),
      eq: jest.fn(() => builder),
      in: jest.fn(() => builder),
      order: jest.fn(() => builder),
      insert: jest.fn(() => builder),
      update: jest.fn(() => builder),
      delete: jest.fn(() => builder),
      maybeSingle: jest.fn(() => Promise.resolve(response)),
      single: jest.fn(() => Promise.resolve(response)),
      then: (resolve: any, reject: any) => Promise.resolve(response).then(resolve, reject),
    };
    builders.push(builder);
    return builder;
  });
  return builders;
}

describe('addReminder (AD-3 confirmation gate)', () => {
  afterEach(() => jest.clearAllMocks());

  it('throws and does not insert when the medication is unconfirmed', async () => {
    const builders = mockSupabaseSequence([
      { data: { id: 'm1', confirmed: false }, error: null },
    ]);

    await expect(
      addReminder({ medication_id: 'm1', anchor: 'breakfast', spoken_text: 'Take X' })
    ).rejects.toThrow('Cannot create a reminder for an unconfirmed medication');

    expect(builders).toHaveLength(1); // never reached the reminder insert
  });

  it('throws when the medication does not exist', async () => {
    mockSupabaseSequence([{ data: null, error: null }]);

    await expect(
      addReminder({ medication_id: 'missing', anchor: 'breakfast', spoken_text: 'Take X' })
    ).rejects.toThrow('Medication not found');
  });

  it('inserts the reminder once the medication is confirmed', async () => {
    const builders = mockSupabaseSequence([
      { data: { id: 'm1', confirmed: true }, error: null },
      { data: { id: 'r1', medication_id: 'm1', anchor: 'breakfast', spoken_text: 'Take X' }, error: null },
    ]);

    const reminder = await addReminder({ medication_id: 'm1', anchor: 'breakfast', spoken_text: 'Take X' });

    expect(reminder.id).toBe('r1');
    expect(builders[1].insert).toHaveBeenCalledWith(
      expect.objectContaining({ medication_id: 'm1', anchor: 'breakfast' })
    );
  });
});

describe('confirmMedication (AD-3 / AD-4)', () => {
  afterEach(() => jest.clearAllMocks());

  it('throws when the medication does not exist', async () => {
    mockSupabaseSequence([{ data: null, error: null }]);
    await expect(confirmMedication('missing', 'white round pill')).rejects.toThrow('Medication not found');
  });

  it('marks the medication confirmed and generates one fresh spoken reminder', async () => {
    const builders = mockSupabaseSequence([
      { data: { id: 'm1', prescription_id: 'p1', name: 'Panadol', dose: '500mg', timing: 'breakfast', confirmed: false }, error: null }, // getMedicationById
      { data: null, error: null }, // medication update (confirmed: true)
      { data: { elder_id: 'e1' }, error: null }, // prescription -> elder_id
      { data: { language: 'en' }, error: null }, // elder -> language
      { data: null, error: null }, // delete old reminders
      { data: null, error: null }, // insert fresh reminder
    ]);

    await confirmMedication('m1', 'white round pill');

    expect(builders[1].update).toHaveBeenCalledWith(
      expect.objectContaining({ confirmed: true, appearance: 'white round pill' })
    );
    expect(builders[5].insert).toHaveBeenCalledWith(
      expect.objectContaining({
        medication_id: 'm1',
        anchor: 'breakfast',
        spoken_text: expect.stringContaining('Panadol'),
      })
    );
  });

  it('speaks the reminder in Malay when the elder profile is set to Malay', async () => {
    const builders = mockSupabaseSequence([
      { data: { id: 'm1', prescription_id: 'p1', name: 'Panadol', dose: '500mg', timing: 'malam', confirmed: false }, error: null },
      { data: null, error: null },
      { data: { elder_id: 'e1' }, error: null },
      { data: { language: 'ms' }, error: null },
      { data: null, error: null },
      { data: null, error: null },
    ]);

    await confirmMedication('m1', 'pil bulat putih');

    expect(builders[5].insert).toHaveBeenCalledWith(
      expect.objectContaining({
        anchor: 'dinner', // 'malam' maps to the dinner anchor
        spoken_text: expect.stringContaining('Sila ambil ubat'),
      })
    );
  });
});
