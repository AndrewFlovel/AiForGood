import React, { useEffect, useRef, useState } from 'react';
import {
  View, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { colors, SPACING, FONT_SIZES, FONTS, RADIUS, shadow } from '../theme';
import { commonStyles } from '../theme/commonStyles';
import { Heading, BodyText, Caption, Label } from '../components/StyledText';
import AppButton from '../components/AppButton';
import { useAuth } from '../context/AuthContext';
import { useConnectivity } from '../hooks/useConnectivity';
import { useRegistroEventos } from '../hooks/useRegistroEventos';
import { useSincronizacion } from '../context/SincronizacionContext';
import { encolar, limpiarBorradorEventos, stopsConTareaPendiente } from '../services/outbox';
import { persistirFoto } from '../services/fotosOutbox';
import { generarUUID } from '../utils/uuid';
import { CAMPOS_ADICIONALES } from '../constants/formSchema';

// Las notas también se auditan como pregunta, con el mismo debounce de texto
const CAMPO_NOTAS = { key: 'notas', label: 'Notas', type: 'text' };

export default function TareaEnProcesoScreen({ route, navigation }) {
  const { stop } = route.params;
  const { loginTimestamp } = useAuth();
  const { isOnline } = useConnectivity();
  const { sincronizarAhora } = useSincronizacion();
  const { registrarRespuesta, registrarFoto, finalizarEventos, datosIniciales } =
    useRegistroEventos(stop);

  const [photo, setPhoto] = useState(null);
  const [fotoTimestamp, setFotoTimestamp] = useState(null);
  const [notas, setNotas] = useState('');
  const [datos, setDatos] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Idempotencia: un solo id por intento de tarea, aunque se reintente
  const clientSubmissionIdRef = useRef(null);
  const fotoPersistidaRef = useRef(null);

  // Rehidratar respuestas desde el borrador (recuperación tras crash)
  useEffect(() => {
    if (datosIniciales) setDatos((prev) => ({ ...datosIniciales, ...prev }));
  }, [datosIniciales]);

  function setCampo(campo, value) {
    setDatos((prev) => ({ ...prev, [campo.key]: value }));
    registrarRespuesta(campo, value); // asíncrono, no bloquea la UI
  }

  // Comprobante visual: SOLO cámara (nunca galería ni descargas)
  async function tomarFoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara para el comprobante visual.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets?.length) {
      const uri = result.assets[0].uri;
      const ts = new Date().toISOString();
      setPhoto(uri);
      setFotoTimestamp(ts);
      registrarFoto(uri, ts);
    }
  }

  // Encolar-primero: la tarea y sus eventos SIEMPRE pasan por el outbox.
  // Con conexión se sincroniza al instante; sin conexión queda guardado en el
  // teléfono y el sincronizador lo envía al recuperar señal. Nada se pierde.
  async function enviarTarea() {
    if (!photo) {
      Alert.alert('Falta comprobante', 'Debes tomar una foto del estado del stock para continuar.');
      return;
    }

    setSubmitting(true);
    try {
      if (!clientSubmissionIdRef.current) clientSubmissionIdRef.current = generarUUID();

      // 1. Copiar la foto fuera del cache (el OS puede purgarlo)
      if (!fotoPersistidaRef.current) {
        fotoPersistidaRef.current = await persistirFoto(photo, stop.id);
      }

      // 2. Encolar eventos por pregunta + tarea completa
      const eventos = finalizarEventos();
      if (eventos.length) await encolar('eventos', eventos);
      await encolar('tarea', {
        stopId: stop.id,
        fotoPath: fotoPersistidaRef.current,
        notas,
        datosExtra: datos,
        fotoTimestamp,
        sesionIniciadaAt: loginTimestamp,
        clientSubmissionId: clientSubmissionIdRef.current,
      });
      await limpiarBorradorEventos(stop.id);

      // 3. Si hay conexión, intentar el envío inmediato
      let sincronizado = false;
      if (isOnline) {
        await sincronizarAhora();
        const stopsPendientes = await stopsConTareaPendiente();
        sincronizado = !stopsPendientes.includes(stop.id);
      }

      if (sincronizado) {
        Alert.alert('✅ Parada completada', 'La evidencia se registró correctamente.', [
          { text: 'OK', onPress: () => navigation.navigate('Home') },
        ]);
      } else {
        Alert.alert(
          '📦 Guardado sin conexión',
          'Tus respuestas quedaron guardadas en el teléfono y se enviarán automáticamente al recuperar la conexión.',
          [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
        );
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function renderCampo(campo) {
    const valor = datos[campo.key];

    if (campo.type === 'select') {
      return (
        <View style={styles.optionsRow}>
          {campo.options.map((op) => {
            const activo = valor === op;
            return (
              <TouchableOpacity
                key={op}
                style={[styles.pill, activo && styles.pillActive]}
                onPress={() => setCampo(campo, op)}
                activeOpacity={0.8}
              >
                <Caption style={[styles.pillText, activo && styles.pillTextActive]}>{op}</Caption>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    if (campo.type === 'boolean') {
      return (
        <View style={styles.optionsRow}>
          {[{ l: 'Sí', v: true }, { l: 'No', v: false }].map(({ l, v }) => {
            const activo = valor === v;
            return (
              <TouchableOpacity
                key={l}
                style={[styles.pill, activo && styles.pillActive]}
                onPress={() => setCampo(campo, v)}
                activeOpacity={0.8}
              >
                <Caption style={[styles.pillText, activo && styles.pillTextActive]}>{l}</Caption>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    // text / number
    return (
      <TextInput
        style={styles.input}
        placeholder={campo.label}
        placeholderTextColor={colors.outlineVariant}
        value={valor != null ? String(valor) : ''}
        onChangeText={(t) => setCampo(campo, campo.type === 'number' ? t.replace(/[^0-9.]/g, '') : t)}
        keyboardType={campo.type === 'number' ? 'numeric' : 'default'}
      />
    );
  }

  return (
    <SafeAreaView style={commonStyles.screen} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnBack} activeOpacity={0.7}>
          <Caption style={styles.btnBackText}>← Volver</Caption>
        </TouchableOpacity>
        <Heading style={styles.headerTitle}>Tarea en Proceso</Heading>
        <View style={{ width: 56 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* PDV */}
        <View style={styles.card}>
          <Heading style={styles.cardTitle}>PDV {stop.pdv.code}</Heading>
          <BodyText style={styles.cardSub}>{stop.pdv.market_name}</BodyText>
        </View>

        {/* Comprobante visual */}
        <View style={styles.card}>
          <Label style={styles.label}>📸 Comprobante visual (cámara)</Label>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.preview} />
          ) : (
            <View style={styles.placeholder}>
              <Caption style={styles.placeholderText}>Sin foto. Solo se acepta captura de cámara.</Caption>
            </View>
          )}
          <AppButton
            title={photo ? 'REPETIR FOTO' : 'TOMAR FOTO'}
            variant="primary"
            onPress={tomarFoto}
            style={styles.photoBtn}
          />
        </View>

        {/* Notas */}
        <View style={styles.card}>
          <Label style={styles.label}>📝 Notas</Label>
          <TextInput
            style={styles.textarea}
            placeholder="Observaciones de la visita..."
            placeholderTextColor={colors.outlineVariant}
            value={notas}
            onChangeText={(t) => {
              setNotas(t);
              registrarRespuesta(CAMPO_NOTAS, t);
            }}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Datos adicionales (schema dinámico) */}
        <View style={styles.card}>
          <Label style={styles.label}>⚙️ Datos adicionales</Label>
          {CAMPOS_ADICIONALES.map((campo) => (
            <View key={campo.key} style={styles.campo}>
              <Caption style={styles.campoLabel}>{campo.label}</Caption>
              {renderCampo(campo)}
            </View>
          ))}
        </View>

        <AppButton
          title="ENVIAR Y COMPLETAR"
          variant="success"
          onPress={enviarTarea}
          loading={submitting}
          style={styles.submit}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.primary, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg,
  },
  headerTitle: { fontSize: FONT_SIZES.lg, color: colors.white },
  btnBack: { padding: SPACING.xs },
  btnBackText: { fontFamily: FONTS.semibold, color: colors.inversePrimary, fontSize: FONT_SIZES.md },

  scroll: { padding: SPACING.md, gap: SPACING.md },

  card: {
    backgroundColor: colors.white, borderRadius: RADIUS.md, padding: SPACING.lg,
    ...shadow(2),
  },
  cardTitle: { fontSize: FONT_SIZES.lg },
  cardSub: { color: colors.onSurfaceVariant, marginTop: 2 },

  label: { fontFamily: FONTS.semibold, fontSize: FONT_SIZES.md, color: colors.primary, marginBottom: SPACING.sm + 2 },

  preview: { width: '100%', height: 220, borderRadius: RADIUS.sm, marginBottom: SPACING.sm + 2 },
  placeholder: {
    width: '100%', height: 220, backgroundColor: colors.surface, borderRadius: RADIUS.sm,
    justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm + 2,
    borderWidth: 1, borderColor: colors.outlineVariant, borderStyle: 'dashed',
  },
  placeholderText: { fontSize: FONT_SIZES.sm, color: colors.onSurfaceVariant, paddingHorizontal: SPACING.xl, textAlign: 'center' },
  photoBtn: { height: 48 },

  textarea: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outlineVariant,
    borderRadius: RADIUS.sm, padding: SPACING.md, minHeight: 96,
    fontFamily: FONTS.regular, fontSize: FONT_SIZES.md, color: colors.black, textAlignVertical: 'top',
  },

  campo: { marginBottom: SPACING.md + 2 },
  campoLabel: { fontFamily: FONTS.medium, fontSize: FONT_SIZES.sm, color: colors.onSurfaceVariant, marginBottom: SPACING.xs + 2 },
  input: {
    height: 48, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outlineVariant,
    borderRadius: RADIUS.sm, paddingHorizontal: SPACING.md, fontFamily: FONTS.regular, fontSize: FONT_SIZES.md, color: colors.black,
  },

  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  pill: {
    paddingHorizontal: SPACING.md + 2, paddingVertical: SPACING.sm, borderRadius: RADIUS.pill,
    borderWidth: 1, borderColor: colors.outlineVariant, backgroundColor: colors.surface,
  },
  pillActive: { backgroundColor: colors.surfaceTint, borderColor: colors.surfaceTint },
  pillText: { fontFamily: FONTS.medium, fontSize: FONT_SIZES.sm, color: colors.onSurfaceVariant },
  pillTextActive: { color: colors.white },

  submit: { marginTop: SPACING.xs },
});
