import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Collapsible } from '@/components/ui/collapsible';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import { useTranslation } from '@/services/localization';
import { RoleSwitcher } from '@/components/RoleSwitcher';

export default function TabTwoScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#D3F3EA', dark: '#D3F3EA' }}
        headerImage={
          <IconSymbol
            size={310}
            color="#04967A"
            name="paperplane.fill"
            style={styles.headerImage}
          />
        }>
        <ThemedView style={styles.titleContainer}>
          <ThemedText
            type="title"
            style={{
              fontFamily: Fonts.rounded,
            }}>
            {t('helpTitle')}
          </ThemedText>
        </ThemedView>
        
        <ThemedText style={styles.headingText}>{t('helpHeading')}</ThemedText>
        <ThemedText style={styles.bodyText}>{t('helpBody')}</ThemedText>

        <Collapsible title={t('helpVoiceCommandsTitle')}>
          <View style={styles.commandRow}>
            <IconSymbol name="house.fill" size={16} color="#04967A" />
            <ThemedText style={styles.commandText}>{`"${t('helpVoiceCmd1')}"`}</ThemedText>
          </View>
          <View style={styles.commandRow}>
            <IconSymbol name="house.fill" size={16} color="#04967A" />
            <ThemedText style={styles.commandText}>{`"${t('helpVoiceCmd2')}"`}</ThemedText>
          </View>
          <View style={styles.commandRow}>
            <IconSymbol name="house.fill" size={16} color="#04967A" />
            <ThemedText style={styles.commandText}>{`"${t('helpVoiceCmd3')}"`}</ThemedText>
          </View>
        </Collapsible>

        <Collapsible title={t('helpSystemNotesTitle')}>
          <View style={styles.lockItem}>
            <ThemedText type="defaultSemiBold">{t('helpLock1Title')}</ThemedText>
            <ThemedText style={styles.lockDesc}>{t('helpLock1Desc')}</ThemedText>
          </View>
          <View style={styles.lockItem}>
            <ThemedText type="defaultSemiBold">{t('helpLock2Title')}</ThemedText>
            <ThemedText style={styles.lockDesc}>{t('helpLock2Desc')}</ThemedText>
          </View>
        </Collapsible>
      </ParallaxScrollView>

      {/* Floating Role Switcher */}
      <RoleSwitcher />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerImage: {
    color: 'rgba(74, 67, 104, 0.18)',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  headingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#122B27',
    marginTop: 8,
  },
  bodyText: {
    fontSize: 14,
    color: '#7C9C97',
    lineHeight: 20,
    marginBottom: 16,
  },
  commandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#D8F0E9',
    gap: 8,
  },
  commandText: {
    fontSize: 13.5,
    fontStyle: 'italic',
    color: '#122B27',
  },
  lockItem: {
    marginBottom: 14,
  },
  lockDesc: {
    fontSize: 13,
    color: '#7C9C97',
    marginTop: 2,
    lineHeight: 18,
  },
});
