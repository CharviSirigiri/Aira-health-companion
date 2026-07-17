const path = require('path');
const fs = require('fs');

// 1. Mock expo-notifications
const scheduledNotifications = [];
let allCancelled = false;

const mockNotifications = {
  getPermissionsAsync: async () => ({ granted: true, status: 'granted' }),
  requestPermissionsAsync: async () => ({ granted: true, status: 'granted' }),
  cancelAllScheduledNotificationsAsync: async () => {
    allCancelled = true;
    scheduledNotifications.length = 0;
  },
  scheduleNotificationAsync: async (config) => {
    scheduledNotifications.push(config);
    return config.identifier || 'test-notification-id';
  },
  SchedulableTriggerInputTypes: {
    DAILY: 'daily',
    TIME_INTERVAL: 'time_interval',
  }
};

// Mock react-native
const mockReactNative = {
  Platform: {
    OS: 'android', // Simulate android so notification scheduling isn't skipped
  }
};

// Mock expo-file-system
const mockFileSystem = {
  documentDirectory: path.join(__dirname, 'test_db_dir/'),
  writeAsStringAsync: async (filePath, content) => {
    fs.writeFileSync(filePath, content, 'utf8');
  },
  readAsStringAsync: async (filePath) => {
    return fs.readFileSync(filePath, 'utf8');
  },
  getInfoAsync: async (filePath) => {
    const exists = fs.existsSync(filePath);
    return { exists };
  }
};

// Create test_db_dir if it doesn't exist
if (!fs.existsSync(mockFileSystem.documentDirectory)) {
  fs.mkdirSync(mockFileSystem.documentDirectory);
}

// Set up mock require before loading modules
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === 'expo-notifications') {
    return mockNotifications;
  }
  if (id === 'react-native') {
    return mockReactNative;
  }
  if (id === 'expo-file-system/legacy') {
    return mockFileSystem;
  }
  return originalRequire.apply(this, arguments);
};

// Load database and reminders from compiled js
const database = require('./dist/database.js');
const reminders = require('./dist/reminders.js');

async function runTests() {
  console.log('--- STARTING REMINDERS UNIT TESTS ---');

  // Reset database first
  await database.resetDatabase();

  // Test 1: Initially Metformin reminder is present. Check if it's scheduled on sync.
  allCancelled = false;
  scheduledNotifications.length = 0;
  
  console.log('Testing syncScheduledReminders...');
  await reminders.syncScheduledReminders();

  if (!allCancelled) {
    throw new Error('Assertion failed: cancelAllScheduledNotificationsAsync was not called.');
  }
  
  if (scheduledNotifications.length !== 1) {
    throw new Error(`Assertion failed: Expected 1 scheduled notification, got ${scheduledNotifications.length}`);
  }

  const reminderConfig = scheduledNotifications[0];
  console.log('Scheduled Reminder:', JSON.stringify(reminderConfig, null, 2));

  if (reminderConfig.content.title !== 'Medication Reminder') {
    throw new Error(`Assertion failed: Expected title "Medication Reminder", got "${reminderConfig.content.title}"`);
  }

  if (reminderConfig.trigger.type !== 'daily' || reminderConfig.trigger.hour !== 8 || reminderConfig.trigger.minute !== 0) {
    throw new Error(`Assertion failed: Expected daily trigger at 08:00, got: ${JSON.stringify(reminderConfig.trigger)}`);
  }

  console.log('\x1b[32m%s\x1b[0m', '✅ Test 1 Passed: syncScheduledReminders successfully schedules daily repeating notification for default confirmed Metformin.');

  // Test 2: Add pending medication, verify it doesn't schedule reminders (safety gate)
  console.log('\nTesting Safety Gate (pending medication)...');
  const pres = await database.addPrescription({
    elder_id: 'elder-susan',
    photo_url: 'test-url',
    raw_parse_json: {},
    status: 'pending'
  });

  const pendingMed = await database.addMedication({
    prescription_id: pres.id,
    name: 'Amlodipine',
    dose: '5mg',
    frequency: 'Once daily',
    timing: 'Dinner',
    appearance: '',
    confidence: 0.95
  });

  scheduledNotifications.length = 0;
  await reminders.syncScheduledReminders();

  if (scheduledNotifications.length !== 1) {
    throw new Error(`Assertion failed: Safety gate failed, expected 1 reminder (Metformin), but got ${scheduledNotifications.length}`);
  }
  console.log('\x1b[32m%s\x1b[0m', '✅ Test 2 Passed: Safety Gate holds. Unconfirmed medications do not schedule reminders.');

  // Test 3: Confirm the pending medication, verify it triggers reminder sync automatically
  console.log('\nTesting confirmMedication triggers reminder sync...');
  scheduledNotifications.length = 0;
  
  // confirmMedication internally calls syncScheduledReminders
  await database.confirmMedication(pendingMed.id, 'Oval blue capsule');

  if (scheduledNotifications.length !== 2) {
    throw new Error(`Assertion failed: Expected 2 active reminders scheduled, got ${scheduledNotifications.length}`);
  }

  const amlodipineReminder = scheduledNotifications.find(n => n.content.data.medicationId === pendingMed.id);
  if (!amlodipineReminder) {
    throw new Error('Assertion failed: Amlodipine reminder was not scheduled.');
  }

  console.log('Scheduled Amlodipine Reminder:', JSON.stringify(amlodipineReminder, null, 2));
  if (amlodipineReminder.trigger.type !== 'daily' || amlodipineReminder.trigger.hour !== 20 || amlodipineReminder.trigger.minute !== 0) {
    throw new Error(`Assertion failed: Expected daily trigger at 20:00 (dinner time), got: ${JSON.stringify(amlodipineReminder.trigger)}`);
  }
  if (!amlodipineReminder.content.body.includes('Oval blue capsule')) {
    throw new Error(`Assertion failed: Expected body to contain "Oval blue capsule", got: "${amlodipineReminder.content.body}"`);
  }

  console.log('\x1b[32m%s\x1b[0m', '✅ Test 3 Passed: confirmMedication automatically creates reminders, fetches appearance, schedules notifications, and maps dinner to 20:00.');

  // Test 4: Reject medication, verify reminder is cancelled
  console.log('\nTesting rejectMedication triggers reminder sync...');
  scheduledNotifications.length = 0;
  
  // rejectMedication internally calls syncScheduledReminders
  await database.rejectMedication(pendingMed.id);

  if (scheduledNotifications.length !== 1) {
    throw new Error(`Assertion failed: Expected 1 reminder (Metformin) after Amlodipine rejection, got ${scheduledNotifications.length}`);
  }
  console.log('\x1b[32m%s\x1b[0m', '✅ Test 4 Passed: Rejection successfully deletes reminders and triggers notification resync.');

  // Test 5: Test immediate alarm scheduling
  console.log('\nTesting triggerTestReminder...');
  scheduledNotifications.length = 0;
  const rems = await database.getReminders('elder-susan');
  
  await reminders.triggerTestReminder(rems[0].id);
  
  if (scheduledNotifications.length !== 1) {
    throw new Error(`Assertion failed: Expected 1 scheduled test reminder, got ${scheduledNotifications.length}`);
  }
  const testRem = scheduledNotifications[0];
  console.log('Test Alarm Config:', JSON.stringify(testRem, null, 2));
  if (testRem.trigger.type !== 'time_interval' || testRem.trigger.seconds !== 2) {
    throw new Error(`Assertion failed: Expected interval trigger of 2 seconds, got: ${JSON.stringify(testRem.trigger)}`);
  }
  console.log('\x1b[32m%s\x1b[0m', '✅ Test 5 Passed: triggerTestReminder schedules immediate interval trigger of 2 seconds.');

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉');
  
  // Clean up test DB file
  try {
    fs.rmSync(mockFileSystem.documentDirectory, { recursive: true, force: true });
  } catch (e) {}
}

runTests().catch(e => {
  console.error('\n❌ TEST RUN FAILED:', e);
  process.exit(1);
});
