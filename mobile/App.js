import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import { loginHtmlContent } from './src/loginHtmlContent';
import { htmlContent } from './src/htmlContent';

// Inject a bridge so the login page's redirect is intercepted by React Native
const LOGIN_BRIDGE = `
(function() {
  var _orig = Object.getOwnPropertyDescriptor(window.location, 'href');
  var origAssign = window.location.assign.bind(window.location);
  var origReplace = window.location.replace.bind(window.location);

  function intercept(url) {
    if (url && (url.includes('focus-buddy-app') || url.includes('focus-buddy-login'))) {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'navigate', url: url }));
      return true;
    }
    return false;
  }

  window.location.assign = function(url) { if (!intercept(url)) origAssign(url); };
  window.location.replace = function(url) { if (!intercept(url)) origReplace(url); };

  // Override href setter
  try {
    Object.defineProperty(window.location, 'href', {
      set: function(url) { intercept(url); },
      get: _orig ? _orig.get : undefined,
      configurable: true
    });
  } catch(e) {}
})();
true;
`;

export default function App() {
  const [screen, setScreen] = useState('login'); // 'login' | 'app'
  const loginRef = useRef(null);
  const appRef = useRef(null);

  const onLoginMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'navigate') {
        if (data.url.includes('focus-buddy-app') || !data.url.includes('login')) {
          setScreen('app');
        }
      }
    } catch (e) {}
  }, []);

  const onAppMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'navigate' && data.url.includes('login')) {
        setScreen('login');
      }
    } catch (e) {}
  }, []);

  if (Platform.OS === 'web') {
    // Web: use iframes
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        {screen === 'login' ? (
          <WebLoginFrame
            html={loginHtmlContent}
            onNavigate={(url) => {
              if (url.includes('focus-buddy-app') || !url.includes('login')) setScreen('app');
            }}
          />
        ) : (
          <WebAppFrame
            html={htmlContent}
            onNavigate={(url) => {
              if (url.includes('login')) setScreen('login');
            }}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <WebView
        key={screen}
        ref={screen === 'login' ? loginRef : appRef}
        source={{ html: screen === 'login' ? loginHtmlContent : htmlContent }}
        style={styles.webview}
        injectedJavaScript={LOGIN_BRIDGE}
        onMessage={screen === 'login' ? onLoginMessage : onAppMessage}
        scalesPageToFit={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </View>
  );
}

// Web-only helpers using iframes
function WebLoginFrame({ html, onNavigate }) {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (e.data && e.data.type === 'navigate') onNavigate(e.data.url);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onNavigate]);

  // Inject bridge into html to postMessage instead of redirect
  const patchedHtml = html
    .replace(
      'location.href=APP',
      "window.parent.postMessage({type:'navigate',url:APP},'*')"
    )
    .replace(
      'location.replace(APP)',
      "window.parent.postMessage({type:'navigate',url:APP},'*')"
    )
    .replace(
      'location.replace(LOGIN)',
      "window.parent.postMessage({type:'navigate',url:LOGIN},'*')"
    );

  return (
    <iframe
      ref={ref}
      srcDoc={patchedHtml}
      style={iframeStyle}
      title="Focus Buddy Login"
      frameBorder="0"
    />
  );
}

function WebAppFrame({ html, onNavigate }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.data && e.data.type === 'navigate') onNavigate(e.data.url);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onNavigate]);

  const patchedHtml = html
    .replace(
      'location.replace(LOGIN)',
      "window.parent.postMessage({type:'navigate',url:LOGIN},'*')"
    )
    .replace(
      'location.href=LOGIN',
      "window.parent.postMessage({type:'navigate',url:LOGIN},'*')"
    );

  return (
    <iframe
      srcDoc={patchedHtml}
      style={iframeStyle}
      title="Focus Buddy App"
      frameBorder="0"
    />
  );
}

const iframeStyle = {
  flex: 1,
  width: '100%',
  height: '100%',
  border: 'none',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
