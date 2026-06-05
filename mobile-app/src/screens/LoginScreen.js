import React, { useState } from 'react';
import {
  View, TextInput, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Image } from 'react-native';
import { colors, SPACING, FONT_SIZES, FONTS, RADIUS, shadow } from '../theme';
import { BodyText, Label } from '../components/StyledText';
import AppButton from '../components/AppButton';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../constants/api';

export default function LoginScreen() {
  const { deviceId, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      setError('Completa usuario y contraseña.');
      return;
    }
    setError('');
    setLoading(true);

    // Aborta el request si el servidor no responde en 10s (evita spinner infinito)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      // 1. Autenticar
      const authRes = await fetch(`${BACKEND_URL}/api/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password, device_id: deviceId }),
        signal: controller.signal,
      });

      const authData = await authRes.json();

      if (!authRes.ok) {
        setError('Usuario o contraseña incorrectos.');
        return;
      }

      const accessToken = authData.access;

      // 2. Verificar que sea reponedor — solo tienen ruta asignada
      const rutaRes = await fetch(`${BACKEND_URL}/api/logistica/rutas/hoy/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
        },
        signal: controller.signal,
      });

      if (rutaRes.status === 404) {
        setError('Esta app es exclusiva para reponedores. No tienes una ruta asignada.');
        return;
      }

      if (!rutaRes.ok) {
        setError('Error al verificar tu ruta. Intenta de nuevo.');
        return;
      }

      const user = {
        username: authData.username || username.trim(),
        firstName: authData.first_name || authData.username || username.trim(),
        role: authData.role || 'Reponedor',
      };
      await login(accessToken, user);
    } catch (e) {
      if (e.name === 'AbortError') {
        setError(`El servidor no responde (${BACKEND_URL}). ¿Misma red WiFi?`);
      } else {
        setError('Sin conexión al servidor. Verifica tu red.');
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.brandContainer}>
          <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="Logo Venaris Route"
            />
          <View style={styles.wordmarkContainer}>
            <BodyText style={styles.wordmarkTop}>INDUSTRIAS</BodyText>
            <BodyText style={styles.wordmarkBottom}>VENARIS</BodyText>
            <BodyText style={styles.wordmarkAccent}>ROUTE</BodyText>
          </View>
        </View>

        <View style={styles.formContainer}>
          <Label style={styles.formLabel}>ACCESO LOGÍSTICA PRO</Label>

          {!!error && <BodyText style={styles.errorText}>{error}</BodyText>}

          <TextInput
            style={styles.input}
            placeholder="Usuario (Ej. reponedor1)"
            placeholderTextColor={colors.outlineVariant}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor={colors.outlineVariant}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          <AppButton
            title="INICIAR SESIÓN"
            variant="success"
            onPress={handleLogin}
            loading={loading}
            style={styles.submit}
            textStyle={styles.submitText}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  keyboardView: { flex: 1, justifyContent: 'center', padding: SPACING.xl },

  brandContainer: { alignItems: 'center', marginBottom: SPACING.xxl + SPACING.lg },
  logo: {
    width: 96, height: 96,
    marginBottom: SPACING.lg,
  },
  wordmarkContainer: { alignItems: 'center' },
  wordmarkTop: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.sm, letterSpacing: 2, color: colors.primary,
  },
  wordmarkBottom: {
    fontFamily: FONTS.extrabold,
    fontSize: FONT_SIZES.xxl + 4, letterSpacing: -0.5, color: colors.primary, marginTop: -4,
  },
  wordmarkAccent: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.sm, letterSpacing: 6, color: colors.surfaceTint, marginTop: 2,
  },

  formContainer: {
    backgroundColor: colors.white, padding: SPACING.xl, borderRadius: RADIUS.lg,
    ...shadow(6),
  },
  formLabel: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.sm, letterSpacing: 1.3, color: colors.primary,
    marginBottom: SPACING.lg, textAlign: 'center',
  },
  errorText: {
    fontSize: FONT_SIZES.sm, color: colors.error,
    marginBottom: SPACING.md, textAlign: 'center',
  },
  input: {
    height: 56, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.outlineVariant,
    borderRadius: RADIUS.sm, paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg,
    fontFamily: FONTS.regular, fontSize: FONT_SIZES.lg, color: colors.black,
  },
  submit: { height: 56, marginTop: SPACING.sm },
  submitText: { fontSize: FONT_SIZES.lg, letterSpacing: 1.5 },
});
