// Mock React Native and Expo Modules for Node testing environment
import Module from 'module';
import fs from 'fs';

// Define global localStorage mock for Node environment
const storageMock: { [key: string]: string } = {};
(global as any).localStorage = {
  getItem: (key: string) => storageMock[key] || null,
  setItem: (key: string, value: string) => {
    storageMock[key] = value;
  },
  removeItem: (key: string) => {
    delete storageMock[key];
  },
  clear: () => {
    for (const key of Object.keys(storageMock)) {
      delete storageMock[key];
    }
  }
};

const originalRequire = (Module.prototype as any).require;
(Module.prototype as any).require = function (id: string) {
  if (id === 'react-native') {
    return {
      Platform: { OS: 'web' },
    };
  }
  if (id === 'expo-file-system/legacy') {
    return {
      documentDirectory: './scratch/',
      getInfoAsync: async (path: string) => {
        return { exists: fs.existsSync(path) };
      },
      readAsStringAsync: async (path: string) => {
        return fs.readFileSync(path, 'utf8');
      },
      writeAsStringAsync: async (path: string, content: string) => {
        fs.writeFileSync(path, content, 'utf8');
      },
    };
  }
  return originalRequire.apply(this, arguments);
};

// Now run the main tests using dynamic imports
const runTests = async () => {
  console.log('=== STARTING MODULE VERIFICATION TESTS ===\n');

  try {
    const {
      loadDatabase,
      getMedications,
      addMedication,
      addReminder,
      confirmMedication,
      getReminders,
      resetDatabase,
    } = await import('../services/database');
    
    const { generateCompanionReply } = await import('../services/gemini');

    // Create scratch directory if it does not exist
    if (!fs.existsSync('./scratch')) {
      fs.mkdirSync('./scratch');
    }

    // 1. Reset database to default mock state
    console.log('1. Resetting database to defaults...');
    await resetDatabase();
    const db = await loadDatabase();
    console.log(`Database initialized. Found ${db.elders.length} elder record(s). Default language: ${db.elders[0].language}\n`);

    // 2. Validate Default Medications & Reminders
    console.log('2. Auditing default medications and reminders...');
    const meds = await getMedications('elder-susan');
    console.log(`- Active medications: ${meds.map(m => `${m.name} (${m.confirmed ? 'Confirmed' : 'Pending'})`).join(', ')}`);
    const reminders = await getReminders('elder-susan');
    console.log(`- Scheduled reminders: ${reminders.map(r => `"${r.spoken_text}"`).join(', ')}\n`);

    // 3. Test Safety Gate Invariant (AD-3)
    console.log('3. Testing Safety Gate Invariant: Blocking unconfirmed medication reminders...');
    const newMed = await addMedication({
      prescription_id: 'initial',
      name: 'Lisinopril',
      dose: '10mg',
      frequency: 'Once daily',
      timing: 'Morning',
      appearance: '', // Empty appearance, unconfirmed
      confidence: 0.9,
      confirmed: false, // NOT confirmed
    });
    console.log(`- Added unconfirmed medication: ${newMed.name}`);

    try {
      console.log('- Attempting to schedule a reminder for Lisinopril...');
      await addReminder({
        medication_id: newMed.id,
        anchor: 'breakfast',
        spoken_text: 'Take your Lisinopril now.',
      });
      console.error('❌ FAILURE: Was able to schedule a reminder for an unconfirmed medication!');
      process.exit(1);
    } catch (e: any) {
      console.log(`- Success: Safety Gate threw expected error: "${e.message}"\n`);
    }

    // 4. Test Safety Gate Confirmation (AD-3 / AD-4)
    console.log('4. Testing Caregiver Confirmation Gate...');
    const appearanceDesc = 'Pink oval tablet marked with L10';
    console.log(`- Caregiver confirms Lisinopril with appearance: "${appearanceDesc}"`);
    await confirmMedication(newMed.id, appearanceDesc);

    // Verify reminder is now successfully scheduled
    const updatedRems = await getReminders('elder-susan');
    const lisinoprilRem = updatedRems.find(r => r.medication_id === newMed.id);
    if (lisinoprilRem) {
      console.log(`- Success: Reminder scheduled successfully: "${lisinoprilRem.spoken_text}"\n`);
    } else {
      console.error('❌ FAILURE: Reminder was not created after confirmation.');
      process.exit(1);
    }

    // 5. Test AI Dialogues and Localized TTS Split (Module 2)
    console.log('5. Testing AI Companion Dialogue System...');
    const testQueries = [
      { text: 'Did I take my Metformin today?', lang: 'en' as const },
      { text: 'Adakah saya sudah makan ubat?', lang: 'ms' as const },
      { text: 'I feel dizzy in my head', lang: 'en' as const }
    ];

    for (const q of testQueries) {
      console.log(`\n- Sending query [${q.lang.toUpperCase()}]: "${q.text}"`);
      const reply = await generateCompanionReply(q.text, [], db.memories, meds, q.lang);
      console.log(`  AI Reply text: "${reply.replyText}"`);
      console.log('  AI Voice output now comes from on-device TTS in the app screen.');
      if (reply.extractedSymptom) {
        console.log(`  Logged symptom: "${reply.extractedSymptom.content}" (significant: ${reply.extractedSymptom.significant})`);
      }
    }

    console.log('\n=== ALL TESTS COMPLETED SUCCESSFULLY! ===');
    process.exit(0);

  } catch (err) {
    console.error('❌ Test execution encountered an unexpected error:', err);
    process.exit(1);
  }
};

runTests();

