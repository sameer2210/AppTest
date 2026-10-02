import { useMemo, useState, type ComponentType } from "react";
import { ActivityIndicator, StyleSheet, TurboModuleRegistry, View } from "react-native";
import CustomText from "@/components/CustomText";

type WebViewComponent = ComponentType<{
  source: { uri: string };
  style?: object;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: () => void;
  startInLoadingState?: boolean;
  javaScriptEnabled?: boolean;
  domStorageEnabled?: boolean;
  setSupportMultipleWindows?: boolean;
  automaticallyAdjustContentInsets?: boolean;
  contentInsetAdjustmentBehavior?: "automatic" | "scrollableAxes" | "never" | "always";
  injectedJavaScript?: string;
  injectedJavaScriptBeforeContentLoaded?: string;
}>;

const loadWebView = (): WebViewComponent | null => {
  if (!TurboModuleRegistry.get("RNCWebViewModule")) {
    return null;
  }

  try {
    return require("react-native-webview").WebView as WebViewComponent;
  } catch {
    return null;
  }
};

type Props = {
  uri: string;
  topOffset?: number;
};

const StronWebView = ({ uri, topOffset = 0 }: Props) => {
  const WebView = useMemo(() => loadWebView(), []);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const customJs = useMemo(() => {
    const topVal = topOffset || 0;
    return `
      (function() {
        try {
          var css = [
            'html, body { margin: 0 !important; padding-top: ${topVal}px !important; }',
            'header, nav, [role="banner"] { display: none !important; }',
            '[class*="nav" i], [class*="Nav" i], [class*="header" i], [class*="Header" i],',
            '[class*="Navbar" i], [class*="TopBar" i], [class*="topbar" i],',
            '[data-navbar], [data-header] { display: none !important; }',
            'main, section, article, div, h1, h2, h3, p { margin-top: 0 !important; }',
            'body > div, body > main, body > section, main > div, section > div, [class*="container" i], [class*="wrapper" i], [class*="hero" i], [class*="pt-" i], [class*="py-" i] { padding-top: 0 !important; margin-top: 0 !important; }',
          ].join('\\n');

          var style = document.getElementById('stron-app-trim-all');
          if (!style) {
            style = document.createElement('style');
            style.id = 'stron-app-trim-all';
            (document.head || document.documentElement).appendChild(style);
          }
          style.textContent = css;

          var removeHeaders = function() {
            var nodes = document.querySelectorAll('header, nav, [role="banner"]');
            for (var i = 0; i < nodes.length; i++) {
              nodes[i].style.setProperty('display', 'none', 'important');
            }
          };
          removeHeaders();
          document.addEventListener('DOMContentLoaded', removeHeaders);
          setTimeout(removeHeaders, 300);
          setTimeout(removeHeaders, 1000);
        } catch(e) {}
      })();
      true;
    `;
  }, [topOffset]);

  if (!WebView) {
    return (
      <View style={styles.centered}>
        <CustomText className="font-body text-[14px] text-white/60 text-center px-6">
          Web content is unavailable in this build.
        </CustomText>
      </View>
    );
  }

  if (failed) {
    return (
      <View style={styles.centered}>
        <CustomText className="font-body-medium text-[16px] text-white mb-2">Could not load page</CustomText>
        <CustomText className="font-body text-[14px] text-white/60 text-center px-6">
          Check your connection and try again.
        </CustomText>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <WebView
        source={{ uri }}
        style={styles.webview}
        onLoadStart={() => {
          setFailed(false);
          setLoading(true);
        }}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setFailed(true);
        }}
        startInLoadingState
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        injectedJavaScriptBeforeContentLoaded={customJs}
        injectedJavaScript={customJs}
      />
      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#086CFF" size="large" />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "transparent",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    paddingHorizontal: 24,
  },
});

export default StronWebView;
