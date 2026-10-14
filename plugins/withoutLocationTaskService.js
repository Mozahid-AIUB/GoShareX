const { withAndroidManifest } = require('expo/config-plugins');

// expo-location's library manifest always adds a location-type foreground
// service. The app never uses it (no startLocationUpdatesAsync), and its
// presence can make Play require a foreground-service declaration + video.
const SERVICE = 'expo.modules.location.services.LocationTaskService';

module.exports = function withoutLocationTaskService(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    const app = manifest.application[0];
    app.service = (app.service || []).filter((s) => s.$['android:name'] !== SERVICE);
    app.service.push({ $: { 'android:name': SERVICE, 'tools:node': 'remove' } });
    return cfg;
  });
};
