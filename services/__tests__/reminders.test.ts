jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DAILY: 'daily', TIME_INTERVAL: 'timeInterval' },
}));
jest.mock('../database', () => ({
  getElder: jest.fn(),
  getReminders: jest.fn(),
  getMedications: jest.fn(),
  getReminderById: jest.fn(),
  getMedicationById: jest.fn(),
}));

import * as Notifications from 'expo-notifications';
import { getElder, getReminders, getMedications } from '../database';
import { syncScheduledReminders } from '../reminders';

const elder = {
  id: 'e1',
  language: 'en' as const,
  routine_json: { wake: '07:00', breakfast: '08:00', lunch: '12:00', tea: '16:00', dinner: '19:00', sleep: '22:00' },
};

describe('syncScheduledReminders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
  });

  it('does not schedule anything when notification permission is denied', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false, status: 'denied' });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false, status: 'denied' });

    await syncScheduledReminders();

    expect(Notifications.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('cancels prior notifications and reschedules confirmed reminders at their routine time', async () => {
    (getElder as jest.Mock).mockResolvedValue(elder);
    (getReminders as jest.Mock).mockResolvedValue([
      { id: 'r1', medication_id: 'm1', anchor: 'breakfast', spoken_text: 'Take your Panadol now.' },
    ]);
    (getMedications as jest.Mock).mockResolvedValue([
      { id: 'm1', confirmed: true, name: 'Panadol' },
    ]);

    await syncScheduledReminders();

    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'r1',
        trigger: expect.objectContaining({ hour: 8, minute: 0 }),
      })
    );
  });

  it('skips reminders whose medication is not confirmed', async () => {
    (getElder as jest.Mock).mockResolvedValue(elder);
    (getReminders as jest.Mock).mockResolvedValue([
      { id: 'r1', medication_id: 'm1', anchor: 'breakfast', spoken_text: 'Take your Panadol now.' },
    ]);
    (getMedications as jest.Mock).mockResolvedValue([
      { id: 'm1', confirmed: false, name: 'Panadol' },
    ]);

    await syncScheduledReminders();

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('skips a reminder whose medication was deleted/rejected out from under it', async () => {
    (getElder as jest.Mock).mockResolvedValue(elder);
    (getReminders as jest.Mock).mockResolvedValue([
      { id: 'r1', medication_id: 'missing-med', anchor: 'breakfast', spoken_text: 'Take X.' },
    ]);
    (getMedications as jest.Mock).mockResolvedValue([]);

    await syncScheduledReminders();

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
