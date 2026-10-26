import { type ComponentRef, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { Sheet } from '@/components/ui/sheet';
import { hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

const TIMEOUT_MS = 30_000;

// The routine page fills itself in with JavaScript, so it is loaded the way a browser would
// and its text is read once the first "3 sets · 12 reps" line shows up.
const READ_TEXT = `
(function () {
  if (window.__repforgeReading) return;
  window.__repforgeReading = true;
  var tries = 0;
  var timer = setInterval(function () {
    var text = document.body ? document.body.innerText : '';
    if (/\\d+\\s+\\S+\\s*·\\s*\\d+/.test(text) || ++tries > 40) {
      clearInterval(timer);
      window.ReactNativeWebView.postMessage(JSON.stringify({ title: document.title, text: text }));
    }
  }, 500);
})();
true;
`;

export function RoutinePageReader({
  url,
  onRead,
  onError,
}: {
  url: string;
  onRead: (page: { title: string; text: string }) => void;
  onError: () => void;
}) {
  const { t } = useTranslation();
  const scheme = useScheme();
  const web = useRef<ComponentRef<typeof WebView>>(null);
  const done = useRef(false);
  const finish = (fn: () => void) => {
    if (done.current) return;
    done.current = true;
    fn();
  };

  useEffect(() => {
    const timer = setTimeout(() => finish(onError), TIMEOUT_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Sheet title={t('data.hevyReading')} visible onClose={() => finish(onError)}>
      <View className="items-center gap-3 px-4 pb-4 pt-2">
        <ActivityIndicator color={hex(scheme, 'primary-text')} />
        <Text className="text-center font-regular text-body text-muted-foreground">{url}</Text>
      </View>
      {/* Kept on screen (tiny) so iOS keeps running the page's scripts. */}
      <View style={{ height: 2, width: '100%' }}>
        <WebView
          ref={web}
          // English names match the exercise library best.
          source={{ uri: url, headers: { 'Accept-Language': 'en-US,en' } }}
          injectedJavaScript={READ_TEXT}
          onLoadEnd={() => web.current?.injectJavaScript(READ_TEXT)}
          onMessage={(e) => finish(() => onRead(JSON.parse(e.nativeEvent.data)))}
          onError={() => finish(onError)}
          onHttpError={() => finish(onError)}
        />
      </View>
    </Sheet>
  );
}
