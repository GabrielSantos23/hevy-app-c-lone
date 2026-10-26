import { requireOptionalNativeModule } from 'expo';

// Only in iOS builds; null in Expo Go and on Android.
export const healthProbe = requireOptionalNativeModule<{ probe(): Promise<string> }>('HealthProbe');
