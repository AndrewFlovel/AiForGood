import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext(null);

const DEVICE_ID_KEY = '@venado_device_id';
const TOKEN_KEY = '@venado_token';
const LOGIN_TS_KEY = '@venado_login_ts';

function generateDeviceId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [loginTimestamp, setLoginTimestamp] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        let [storedToken, storedDeviceId, storedLoginTs] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(DEVICE_ID_KEY),
          AsyncStorage.getItem(LOGIN_TS_KEY),
        ]);

        if (!storedDeviceId) {
          storedDeviceId = generateDeviceId();
          await AsyncStorage.setItem(DEVICE_ID_KEY, storedDeviceId);
        }

        setDeviceId(storedDeviceId);
        setToken(storedToken);
        setLoginTimestamp(storedLoginTs);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  async function login(newToken) {
    const ts = new Date().toISOString();
    await AsyncStorage.multiSet([
      [TOKEN_KEY, newToken],
      [LOGIN_TS_KEY, ts],
    ]);
    setToken(newToken);
    setLoginTimestamp(ts);
  }

  async function logout() {
    await AsyncStorage.multiRemove([TOKEN_KEY, LOGIN_TS_KEY]);
    setToken(null);
    setLoginTimestamp(null);
  }

  return (
    <AuthContext.Provider value={{ token, deviceId, loginTimestamp, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
