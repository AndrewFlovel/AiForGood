# Mobile App Testing Implementation Plan

**Objective:** Introduce a robust, reliable, and scalable testing infrastructure into the React Native (Expo) `mobile-app`. This plan addresses the current absence of testing frameworks and defines the pathway to validate business logic, UI components, and end-to-end anti-fraud features.

---

## Phase 1: Environment Setup & Tooling

**Goal:** Install necessary testing dependencies and configure the project to run unit and component tests.

### 1.1. Install Dependencies
Execute the following commands to add Jest and React Native Testing Library (`RNTL`) to the project:
```bash
cd mobile-app
npm install --save-dev jest jest-expo @testing-library/react-native @testing-library/jest-native react-test-renderer
```

### 1.2. Configuration Files
- **`package.json`:** Add testing scripts.
  ```json
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
  ```
  And add the Jest preset config:
  ```json
  "jest": {
    "preset": "jest-expo",
    "setupFilesAfterEnv": ["@testing-library/jest-native/extend-expect"],
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)"
    ],
    "setupFiles": ["./jest.setup.js"]
  }
  ```
- **`jest.setup.js`:** Create this file in the root of `mobile-app` to hold global mocks for navigation, AsyncStorage, and native Expo modules (like `expo-font`, `expo-location`, `expo-image-picker`).

---

## Phase 2: Core Mocking Strategy

**Goal:** Provide predictable mocks for native modules and external APIs so that components can be tested in isolation.

### 2.1. Mocking Expo Modules
In `jest.setup.js`, add standard mocks:
- Mock `@react-native-async-storage/async-storage`.
- Mock `expo-location` to simulate valid GPS, "Mock Location" fraud, and impossible speeds.
- Mock `expo-image-picker` to simulate successful camera captures and missing permissions.

### 2.2. Mocking Navigation & Contexts
- Mock `@react-navigation/native` to ensure `useNavigation` and `useFocusEffect` do not break tests.
- Create a test utility wrapper (`renderWithProviders`) that automatically wraps components under test with `AuthContext.Provider` and `SafeAreaProvider`.

---

## Phase 3: Unit & Component Testing Execution

**Goal:** Write tests for the most critical user flows, utilizing the Arrange-Act-Assert (AAA) pattern.

### 3.1. Utility & Hook Tests (Unit)
- **`useApi.js`:** Test that headers (Authorization, X-Device-ID) are applied. Test that FormData skips the `Content-Type` header mapping.
- **`AuthContext.js`:** Test login, logout, token persistence, and `deviceId` generation.

### 3.2. Critical Screen Tests (Component)
- **`HomeScreen.test.js`:**
  - *Assert:* Renders the route and stop list correctly.
  - *Act & Assert:* Pressing "CHECK-IN GPS" fires the check-in API with mocked GPS data.
  - *Edge Case:* Verify multiple rapid clicks on "CHECK-IN GPS" do not trigger concurrent API calls (tests the `checkingIn` loading state).
- **`TareaEnProcesoScreen.test.js` (To Be Written):**
  - *Assert:* Form schema renders appropriately.
  - *Act & Assert:* Pressing camera calls `launchCameraAsync` and not the gallery.
  - *Act & Assert:* Form submission constructs a valid FormData object containing timestamps and extra data.

---

## Phase 4: End-to-End (E2E) Integration (Future Scope)

**Goal:** Automate real-device user flows to test the compiled native code.

### 4.1. Tool Selection
Choose **Maestro** (recommended for Expo dev builds due to ease of setup and YAML syntax) or **Detox**.

### 4.2. E2E Target Flows
- **Full Route Flow:** Login -> Fetch Route -> Start Route -> Check-in to first Stop -> Complete Task (simulating camera) -> Verify Stop is marked Completed.
- **Anti-Fraud Flow:** Simulate GPS mock location on Android -> Attempt Check-in -> Assert "Fraude detectado" alert appears.

---

## Next Actionable Steps for the Team
1. Approve this plan.
2. Run dependency installations (Phase 1).
3. Create `jest.setup.js` and the basic component wrapper.
4. Begin writing `HomeScreen.test.js` as the benchmark test.
