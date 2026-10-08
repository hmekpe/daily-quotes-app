# Daily Quotes

A premium daily quote app built with React Native and Expo. A new quote every day across motivation, psychology, faith, wisdom and leadership, in a dark gray, diamond, neon and gold interface.

**Demo build (Android APK):** https://expo.dev/accounts/hope_musike/projects/quotes-app/builds/fcb8bdbd-92b3-40a7-9267-cef757a3cf8d

## Features

**Core**
- A new quote every day. The daily pick is random-looking but the same all day, and it avoids repeating the last two days.
- "Another quote" button for an instant random pick, with Back and "Back to today's quote".
- Save quotes to a personal collection, with undo.
- Clean, readable quote screen with high contrast and large touch targets.
- Works offline. Quotes are stored in the app.

**Author profiles**
- Each quote shows the author's photo and a short biography, loaded live from the Wikipedia REST API and cached on the device.
- Scripture quotes are labeled as King James Version.

**Daily notification**
- Optional pop-up notification with the day's quote at a time the user picks (presets or a custom time).
- Schedules the next 14 days, each with that day's own quote.
- "Send a test notification" button.

**Six unique features**
1. Theme of the day: Sunday is Faith, Monday is Motivation, and so on (can be turned off).
2. Daily streak tracker with a 7-day view.
3. Personal reflections on saved quotes.
4. Past days: catch up on the last 14 daily quotes.
5. Listen: reads the quote aloud with text to speech.
6. Topic selection: choose which categories appear in quotes and notifications.

**Sharing**
- Share a quote as an image in three styles (Diamond, Gold, Neon) or as plain text, for WhatsApp, Instagram and other apps.

## Tech stack

- React Native with Expo (SDK 57)
- AsyncStorage for local data
- expo-notifications, expo-speech, expo-sharing, react-native-view-shot
- expo-linear-gradient, @react-native-community/datetimepicker
- Wikipedia REST API for author photos and biographies

## Run locally

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go. Everything works in Expo Go except daily notifications, which need the installed app build.

## Build the Android APK

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

## Project structure

```
App.js          Main app: screens, quote library, notifications, sharing
app.json        Expo configuration, icons, plugins
eas.json        EAS build profiles
assets/         App icon, adaptive icon, splash image
```

## Author

Ekpe Hope Mawutor, [github.com/hmekpe](https://github.com/hmekpe)