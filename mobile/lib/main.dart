import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_database/firebase_database.dart';

// Run `flutterfire configure` first - it generates firebase_options.dart
// import 'firebase_options.dart';

const String kPatientId = 'P001'; // swap for the logged-in patient later

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    // options: DefaultFirebaseOptions.currentPlatform,
  );
  runApp(const HealthcareMonitorApp());
}

class HealthcareMonitorApp extends StatelessWidget {
  const HealthcareMonitorApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Healthcare Monitor',
      theme: ThemeData(primarySwatch: Colors.teal),
      home: const DashboardScreen(),
    );
  }
}

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final vitalsRef = FirebaseDatabase.instance
        .ref('vitals/$kPatientId')
        .limitToLast(1);

    return Scaffold(
      appBar: AppBar(title: const Text('Live Vitals')),
      body: StreamBuilder<DatabaseEvent>(
        stream: vitalsRef.onValue,
        builder: (context, snapshot) {
          if (!snapshot.hasData || snapshot.data!.snapshot.value == null) {
            return const Center(child: CircularProgressIndicator());
          }
          final raw = Map<String, dynamic>.from(
            (snapshot.data!.snapshot.value as Map).values.first as Map,
          );
          final heartRate = raw['heartRate'] ?? '--';
          final spo2 = raw['spo2'] ?? '--';
          final severity = raw['severity'] ?? 'Unknown';
          final fall = raw['fall'] == true;

          return Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Heart Rate: $heartRate bpm',
                    style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 8),
                Text('SpO2: $spo2 %',
                    style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 8),
                Text('Severity: $severity',
                    style: Theme.of(context).textTheme.headlineSmall),
                if (fall)
                  const Padding(
                    padding: EdgeInsets.only(top: 16),
                    child: Text(
                      'FALL DETECTED',
                      style: TextStyle(
                          color: Colors.red,
                          fontWeight: FontWeight.bold,
                          fontSize: 22),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}
