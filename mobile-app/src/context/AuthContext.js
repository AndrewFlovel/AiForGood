import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { generarUUID } from '../utils/uuid';

const AuthContext = createContext(null);

const DEVICE_ID_KEY = '@venado_device_id';
const TOKEN_KEY = '@venado_token';
const REFRESH_KEY = '@venado_refresh';
const LOGIN_TS_KEY = '@venado_login_ts';
const USER_KEY = '@venado_user';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [loginTimestamp, setLoginTimestamp] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        let [storedToken, storedRefresh, storedDeviceId, storedLoginTs, storedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(REFRESH_KEY),
          AsyncStorage.getItem(DEVICE_ID_KEY),
          AsyncStorage.getItem(LOGIN_TS_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);

        if (!storedDeviceId) {
          storedDeviceId = generarUUID();
          await AsyncStorage.setItem(DEVICE_ID_KEY, storedDeviceId);
        }

        setDeviceId(storedDeviceId);
        setToken(storedToken);
        setRefreshToken(storedRefresh);
        setLoginTimestamp(storedLoginTs);
        setUser(storedUser ? JSON.parse(storedUser) : null);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  async function login(newToken, newUser = null, newRefresh = null) {
    const ts = new Date().toISOString();
    const entries = [
      [TOKEN_KEY, newToken],
      [LOGIN_TS_KEY, ts],
    ];
    if (newUser) entries.push([USER_KEY, JSON.stringify(newUser)]);
    if (newRefresh) entries.push([REFRESH_KEY, newRefresh]);
    await AsyncStorage.multiSet(entries);
    setToken(newToken);
    setRefreshToken(newRefresh);
    setLoginTimestamp(ts);
    setUser(newUser);
  }

  // Access token renovado por el sincronizador vía api/auth/refresh/
  async function actualizarToken(nuevoAccess) {
    await AsyncStorage.setItem(TOKEN_KEY, nuevoAccess);
    setToken(nuevoAccess);
  }

  // Nota: NO borra el device_id ni las keys del outbox (@venado_outbox*):
  // la cola offline sobrevive al cierre de sesión y se retoma tras re-login.
  async function logout() {
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY, LOGIN_TS_KEY, USER_KEY]);
    setToken(null);
    setRefreshToken(null);
    setLoginTimestamp(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ token, refreshToken, deviceId, loginTimestamp, user, isLoading, login, logout, actualizarToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
