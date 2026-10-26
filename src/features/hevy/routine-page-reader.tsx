import { View } from 'react-native';
import { WebView } from 'react-native-webview';

// The routine page fills itself in with JavaScript, so it is loaded the way a browser would
// and its text is read once the first "3 sets · 12 reps" line shows up.
const READ_TEXT = `
(function () {
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
  return (
    <View style={{ height: 1, width: 1, opacity: 0 }} pointerEvents="none">
      <WebView
        // English names match the exercise library best.
        source={{ uri: url, headers: { 'Accept-Language': 'en-US,en' } }}
        injectedJavaScript={READ_TEXT}
        onMessage={(e) => onRead(JSON.parse(e.nativeEvent.data))}
        onError={onError}
        onHttpError={onError}
      />
    </View>
  );
}
