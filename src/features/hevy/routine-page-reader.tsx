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
  var seen = 0;
  var timer = setInterval(function () {
    // Scroll so a list that only draws what is on screen renders every exercise.
    window.scrollTo(0, document.body ? document.body.scrollHeight : 0);
    var text = document.body ? document.body.innerText : '';
    var found = /\\d+\\s+\\S+\\s*[·•|]\\s*\\d+/.test(text);
    if ((found && ++seen > 4) || ++tries > 40) {
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
      <View className="flex-row items-center justify-center gap-3 px-4 pb-3 pt-1">
        <ActivityIndicator color={hex(scheme, 'primary-text')} />
        <Text numberOfLines={1} className="shrink font-regular text-footnote text-muted-foreground">
          {url}
        </Text>
      </View>
      {/* Shown at a real size: the page only draws the exercises that fit on screen. */}
      <View
        pointerEvents="none"
        style={{ height: 360 }}
        className="mx-2 mb-2 overflow-hidden rounded-lg"
      >
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
