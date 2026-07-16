import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  AudioModule,
  RecordingPresets,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import {
  configureVoicePlaybackAudioMode,
  configureVoiceRecordingAudioMode,
} from '@/services/voice';

export interface UseVoiceRecorderResult {
  isSupported: boolean;
  isReady: boolean;
  isRecording: boolean;
  canRecord: boolean;
  durationMillis: number;
  recordingUri: string | null;
  permissionGranted: boolean;
  lastError: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
}

export function useVoiceRecorder(): UseVoiceRecorderResult {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const [isReady, setIsReady] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const permission = await AudioModule.requestRecordingPermissionsAsync();
        if (!mounted) return;

        setPermissionGranted(permission.granted);
        if (permission.granted) {
          await configureVoicePlaybackAudioMode();
        } else {
          setLastError('Microphone permission was denied.');
        }
      } catch (error) {
        if (mounted) {
          setLastError(error instanceof Error ? error.message : 'Unable to initialize microphone');
        }
      } finally {
        if (mounted) {
          setIsReady(true);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const startRecording = async () => {
    setLastError(null);
    if (!permissionGranted) {
      throw new Error('Microphone permission is required.');
    }

    await configureVoiceRecordingAudioMode();
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const stopRecording = async () => {
    if (!recorderState.isRecording) {
      await configureVoicePlaybackAudioMode();
      return recorder.uri ?? null;
    }

    await recorder.stop();
    await configureVoicePlaybackAudioMode();
    return recorder.uri ?? null;
  };

  return {
    isSupported: Platform.OS !== 'web',
    isReady,
    isRecording: recorderState.isRecording,
    canRecord: recorderState.canRecord && permissionGranted,
    durationMillis: recorderState.durationMillis,
    recordingUri: recorder.uri ?? null,
    permissionGranted,
    lastError,
    startRecording,
    stopRecording,
  };
}
