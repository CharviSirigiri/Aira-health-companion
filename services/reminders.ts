import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getElder, getReminders, loadDatabase } from './database';

/**
 * Request notification permissions from the user.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const settings = await Notifications.getPermissionsAsync() as any;
    let granted = settings.granted || settings.status === 'granted';
    
    if (!granted) {
      const requestSettings = await Notifications.requestPermissionsAsync() as any;
      granted = requestSettings.granted || requestSettings.status === 'granted';
    }
    
    return granted;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Sync all confirmed medications with local scheduled notifications.
 * Clears old notifications and reschedules them daily based on the elder's routine times.
 */
export async function syncScheduledReminders(): Promise<void> {
  if (Platform.OS === 'web') {
    console.log('Notification scheduling skipped on Web.');
    return;
  }

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn('Cannot sync scheduled reminders: notification permissions denied.');
      return;
    }

    // Cancel all previously scheduled notifications to prevent duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Load elder routine times
    const elder = await getElder('elder-susan');
    if (!elder) {
      console.warn('Cannot sync scheduled reminders: Susan elder profile not found.');
      return;
    }
    const routine = elder.routine_json;

    // Load active reminders from the database
    const reminders = await getReminders('elder-susan');
    const db = await loadDatabase();

    for (const reminder of reminders) {
      // Find matching medication to get details
      const med = db.medications.find(m => m.id === reminder.medication_id);
      if (!med || !med.confirmed) continue;

      const anchor = reminder.anchor as keyof typeof routine;
      const timeStr = routine[anchor] || '08:00';
      const [hourStr, minuteStr] = timeStr.split(':');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);

      if (isNaN(hour) || isNaN(minute)) {
        console.warn(`Invalid routine time format for anchor ${anchor}: ${timeStr}`);
        continue;
      }

      // Schedule daily recurring notification
      await Notifications.scheduleNotificationAsync({
        identifier: reminder.id,
        content: {
          title: elder.language === 'ms' ? 'Peringatan Ubat' : 'Medication Reminder',
          body: reminder.spoken_text,
          data: {
            reminderId: reminder.id,
            medicationId: med.id,
            spokenText: reminder.spoken_text,
            language: elder.language
          },
          sound: true,
          vibrate: [0, 250, 250, 250],
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
      console.log(`Scheduled daily reminder for ${med.name} at ${hour}:${minute} (${anchor})`);
    }
  } catch (error) {
    console.error('Failed to sync scheduled reminders:', error);
  }
}

/**
 * Trigger an immediate notification (in 2 seconds) for a specific reminder for testing.
 */
export async function triggerTestReminder(reminderId: string): Promise<void> {
  if (Platform.OS === 'web') {
    console.log(`Simulating immediate test reminder triggers for reminder: ${reminderId}`);
    return;
  }

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      alert('Notification permissions are required to test alarms.');
      return;
    }

    const db = await loadDatabase();
    const reminder = db.reminders.find(r => r.id === reminderId);
    if (!reminder) {
      console.error(`Reminder ${reminderId} not found in DB`);
      return;
    }

    const med = db.medications.find(m => m.id === reminder.medication_id);
    if (!med) return;

    const elder = db.elders[0];
    const language = elder ? elder.language : 'en';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: language === 'ms' ? '⚠️ Ujian Peringatan Ubat' : '⚠️ Test Medication Reminder',
        body: reminder.spoken_text,
        data: {
          reminderId: reminder.id,
          medicationId: med.id,
          spokenText: reminder.spoken_text,
          language
        },
        sound: true,
        vibrate: [0, 250, 250, 250],
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
        repeats: false,
      },
    });
    console.log(`Test reminder scheduled to fire in 2 seconds for reminder ${reminderId}`);
  } catch (error) {
    console.error('Failed to schedule test reminder:', error);
  }
}
