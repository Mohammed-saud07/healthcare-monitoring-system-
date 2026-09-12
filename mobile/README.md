# Mobile App (Flutter)

This folder has a minimal starting point (`lib/main.dart`) - a live
dashboard screen streaming from Firebase Realtime Database. Build out
the BLoC layer and remaining screens (Trends, Alerts, Settings, Profile)
from here per the main project README's Phase 5.

## Setup

1. Install Flutter: https://docs.flutter.dev/get-started/install
2. From this folder:
   ```bash
   flutter create . --project-name healthcare_monitor
   flutter pub add firebase_core firebase_database firebase_messaging dio
   ```
3. Run `flutterfire configure` (requires the Firebase CLI) to generate
   `firebase_options.dart` and wire up `google-services.json` /
   `GoogleService-Info.plist` automatically.
4. Replace the generated `lib/main.dart` with the one already in this
   folder (or merge the StreamBuilder logic into it).
5. `flutter run`

## Suggested structure once you scaffold further

```
lib/
  presentation/
    dashboard_screen.dart
    trends_screen.dart
    alerts_screen.dart
    settings_screen.dart
    profile_screen.dart
  domain/        # VitalsBloc, AlertsBloc, AuthBloc
  data/
    firebase_repository.dart
    api_repository.dart   # Dio client -> Flask REST API
```
