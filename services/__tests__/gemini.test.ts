// AD-9: the red-flag keyword gate must fire deterministically, before any
// model call, regardless of what the model would have said.

jest.mock('../supabase', () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));

import { supabase } from '../supabase';
import { generateCompanionReply } from '../gemini';

describe('generateCompanionReply red-flag gate (AD-9)', () => {
  afterEach(() => jest.clearAllMocks());

  it('short-circuits on an English red-flag phrase without calling the model', async () => {
    const result = await generateCompanionReply('I have chest pain right now', [], [], [], 'en');

    expect(result.replyText).toContain('Danger!');
    expect(result.raisedAlert).toContain('chest pain');
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('short-circuits on a Malay red-flag phrase and replies in Malay', async () => {
    const result = await generateCompanionReply('saya rasa sakit dada', [], [], [], 'ms');

    expect(result.replyText).toContain('Bahaya!');
    expect(result.raisedAlert).toContain('sakit dada');
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('is case-insensitive when matching red flags', async () => {
    const result = await generateCompanionReply('CHEST PAIN since this morning', [], [], [], 'en');
    expect(result.raisedAlert).toBeDefined();
  });

  it('routes an explicit "call my family" request to the distress helper, not the red-flag path', async () => {
    const result = await generateCompanionReply('please call my family', [], [], [], 'en');

    expect(result.replyText).toContain('contacting your family');
    expect(result.raisedAlert).toContain('distress contact');
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });
});
