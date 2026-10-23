/**
 * TabNote Studio — Doğrudan Yerel Android APK Üretici (build-apk.js)
 * Tüm uygulama dosyalarını ve Android Dosya/Fotoğraf/PDF seçici (onShowFileChooser) desteğini
 * tek bir çevrimdışı Android WebView APK paketine dönüştürür.
 */

const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, 'apk-build');
const assetsDir = path.join(buildDir, 'assets');
const resDrawableDir = path.join(buildDir, 'res', 'drawable');
const resValuesDir = path.join(buildDir, 'res', 'values');

fs.mkdirSync(assetsDir, { recursive: true });
fs.mkdirSync(resDrawableDir, { recursive: true });
fs.mkdirSync(resValuesDir, { recursive: true });

// 1. ES Modüllerini (templates.js, storage.js, chart-builder.js, canvas-engine.js, app.js) Android WebView (file://) uyumlu tek bir bundle.js dosyasında birleştir
const templatesCode = fs
  .readFileSync(path.join(__dirname, 'js', 'templates.js'), 'utf8')
  .replace(/export\s+const\s+/g, 'const ')
  .replace(/export\s+function\s+/g, 'function ');

const storageCode = fs
  .readFileSync(path.join(__dirname, 'js', 'storage.js'), 'utf8')
  .replace(/export\s+const\s+/g, 'const ')
  .replace(/export\s+function\s+/g, 'function ');

const chartCode = fs
  .readFileSync(path.join(__dirname, 'js', 'chart-builder.js'), 'utf8')
  .replace(/export\s+const\s+/g, 'const ')
  .replace(/export\s+function\s+/g, 'function ');

const devremSymbolsCode = fs
  .readFileSync(path.join(__dirname, 'js', 'devrem-symbols.js'), 'utf8')
  .replace(/export\s+const\s+/g, 'const ')
  .replace(/export\s+function\s+/g, 'function ');

const devremLabCode = fs
  .readFileSync(path.join(__dirname, 'js', 'devrem-lab.js'), 'utf8')
  .replace(/export\s+class\s+/g, 'class ');

const engineCode = fs
  .readFileSync(path.join(__dirname, 'js', 'canvas-engine.js'), 'utf8')
  .replace(/import\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];?/g, '')
  .replace(/export\s+const\s+/g, 'const ')
  .replace(/export\s+class\s+/g, 'class ');

const appCode = fs
  .readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8')
  .replace(/import\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];?/g, '');

const combinedBundle = `/* TabNote Studio Android Bundle */\n(function(){\n${templatesCode}\n${storageCode}\n${chartCode}\n${devremSymbolsCode}\n${devremLabCode}\n${engineCode}\n${appCode}\n})();\n`;

fs.writeFileSync(path.join(assetsDir, 'bundle.js'), combinedBundle, 'utf8');

// 2. CSS, Logo ve HTML'i assets içine kopyala (type="module" yerine bundle.js kullanacak şekilde)
const cssCode = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');
fs.writeFileSync(path.join(assetsDir, 'styles.css'), cssCode, 'utf8');

if (fs.existsSync(path.join(__dirname, 'logo.svg'))) {
  fs.copyFileSync(path.join(__dirname, 'logo.svg'), path.join(assetsDir, 'logo.svg'));
}

let htmlCode = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
htmlCode = htmlCode.replace(
  '<script type="module" src="./js/app.js"></script>',
  '<script src="./bundle.js"></script>'
);
fs.writeFileSync(path.join(assetsDir, 'index.html'), htmlCode, 'utf8');

// 2c. Devrem Studio (44 EEM Simülasyonu) klasörünü assets içine kopyala
const devremSrcDir = path.join(__dirname, 'devrem-studio');
const devremDestDir = path.join(assetsDir, 'devrem-studio');
if (fs.existsSync(devremSrcDir)) {
  fs.cpSync(devremSrcDir, devremDestDir, { recursive: true });
  console.log('✓ Devrem Studio 44 simülasyon klasörü APK assets içine kopyalandı.');
}

// 2b. Android Uygulama İkonu (res/drawable/ic_launcher.xml) oluştur
const icLauncherXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="128"
    android:viewportHeight="128">
    <path
        android:fillColor="#0F172A"
        android:pathData="M28,8 L100,8 C111,8 120,17 120,28 L120,100 C120,111 111,120 100,120 L28,120 C17,120 8,111 8,100 L8,28 C8,17 17,8 28,8 Z" />
    <path
        android:fillColor="#2563EB"
        android:pathData="M26,24 L36,24 L36,104 L26,104 Z" />
    <path
        android:fillColor="#FCFBF7"
        android:pathData="M34,24 L86,24 C91.5,24 96,28.5 96,34 L96,94 C96,99.5 91.5,104 86,104 L34,104 Z" />
    <path
        android:strokeColor="#CBD5E1"
        android:strokeWidth="2.5"
        android:pathData="M44,42 L84,42 M44,54 L84,54 M44,66 L76,66 M44,78 L68,78" />
    <path
        android:strokeColor="#3B82F6"
        android:strokeWidth="3.5"
        android:pathData="M44,90 Q54,82 62,90 T78,86" />
    <path
        android:fillColor="#F59E0B"
        android:pathData="M98,22 L108,32 L76,64 L66,54 Z" />
    <path
        android:fillColor="#FDE68A"
        android:pathData="M66,54 L76,64 L62,68 Z" />
</vector>`;
fs.writeFileSync(path.join(resDrawableDir, 'ic_launcher.xml'), icLauncherXml, 'utf8');

// 3. AndroidManifest.xml oluştur (Tam ekran, özel ikonlu, donanım hızlandırmalı, doğrudan mikrofon kaydı + dosya/fotoğraf/PDF erişimli)
const manifestXml = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.tabnote.studio"
    android:versionCode="9"
    android:versionName="1.8.0">

    <uses-sdk android:minSdkVersion="24" android:targetSdkVersion="34" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />

    <application
        android:label="TabNote Studio"
        android:icon="@drawable/ic_launcher"
        android:hardwareAccelerated="true"
        android:usesCleartextTraffic="true"
        android:theme="@android:style/Theme.DeviceDefault.NoActionBar.Fullscreen">
        <activity
            android:name="com.tabnote.studio.MainActivity"
            android:exported="true"
            android:screenOrientation="fullSensor"
            android:configChanges="orientation|screenSize|screenLayout|smallestScreenSize|keyboardHidden|uiMode"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

fs.writeFileSync(path.join(buildDir, 'AndroidManifest.xml'), manifestXml, 'utf8');

// 4. MainActivity.java oluştur (Android WebView + Doğrudan Native MediaRecorder Ses Kayıt Köprüsü + Fotoğraf/PDF/Dosya Seçici Desteği)
const javaDir = path.join(buildDir, 'src', 'com', 'tabnote', 'studio');
fs.mkdirSync(javaDir, { recursive: true });

const mainActivityJava = `package com.tabnote.studio;

import android.Manifest;
import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.media.MediaRecorder;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Base64;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_RESULT_CODE = 1001;
    private static final int AUDIO_PERMISSION_REQUEST_CODE = 1002;
    private static final int NATIVE_MIC_PERMISSION_CODE = 1003;
    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private PermissionRequest pendingWebPermissionRequest;
    private MediaRecorder nativeRecorder;
    private File currentAudioFile;

    public class AndroidVoiceBridge {
        @JavascriptInterface
        public String startNativeRecording() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, NATIVE_MIC_PERMISSION_CODE);
                    return "PERMISSION_REQUESTED";
                }
            }
            try {
                cleanupNativeRecorder();
                currentAudioFile = new File(getCacheDir(), "line_voice_" + System.currentTimeMillis() + ".m4a");
                nativeRecorder = new MediaRecorder();
                nativeRecorder.setAudioSource(MediaRecorder.AudioSource.MIC);
                nativeRecorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
                nativeRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
                nativeRecorder.setAudioEncodingBitRate(128000);
                nativeRecorder.setAudioSamplingRate(44100);
                nativeRecorder.setOutputFile(currentAudioFile.getAbsolutePath());
                nativeRecorder.prepare();
                nativeRecorder.start();
                return "OK";
            } catch (Exception e) {
                cleanupNativeRecorder();
                return "ERR:" + e.getMessage();
            }
        }

        @JavascriptInterface
        public void pauseNativeRecording() {
            if (nativeRecorder != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                try {
                    nativeRecorder.pause();
                } catch (Exception ignored) {}
            }
        }

        @JavascriptInterface
        public void resumeNativeRecording() {
            if (nativeRecorder != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                try {
                    nativeRecorder.resume();
                } catch (Exception ignored) {}
            }
        }

        @JavascriptInterface
        public String stopNativeRecording() {
            try {
                if (nativeRecorder != null) {
                    try {
                        nativeRecorder.stop();
                    } catch (Exception ignored) {}
                    try {
                        nativeRecorder.release();
                    } catch (Exception ignored) {}
                    nativeRecorder = null;
                }
                if (currentAudioFile != null && currentAudioFile.exists() && currentAudioFile.length() > 0) {
                    FileInputStream fis = new FileInputStream(currentAudioFile);
                    ByteArrayOutputStream bos = new ByteArrayOutputStream();
                    byte[] buf = new byte[8192];
                    int read;
                    while ((read = fis.read(buf)) != -1) {
                        bos.write(buf, 0, read);
                    }
                    fis.close();
                    String b64 = Base64.encodeToString(bos.toByteArray(), Base64.NO_WRAP);
                    currentAudioFile.delete();
                    currentAudioFile = null;
                    return "data:audio/mp4;base64," + b64;
                }
            } catch (Exception ignored) {}
            cleanupNativeRecorder();
            return "";
        }

        @JavascriptInterface
        public void cancelNativeRecording() {
            cleanupNativeRecorder();
        }
    }

    private void cleanupNativeRecorder() {
        if (nativeRecorder != null) {
            try {
                nativeRecorder.stop();
            } catch (Exception ignored) {}
            try {
                nativeRecorder.release();
            } catch (Exception ignored) {}
            nativeRecorder = null;
        }
        if (currentAudioFile != null && currentAudioFile.exists()) {
            try {
                currentAudioFile.delete();
            } catch (Exception ignored) {}
            currentAudioFile = null;
        }
    }

    private void applyImmersiveMode() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                final Window window = getWindow();
                window.setDecorFitsSystemWindows(false);
                final WindowInsetsController controller = window.getInsetsController();
                if (controller != null) {
                    controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                    controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                }
            } else {
                View decorView = getWindow().getDecorView();
                decorView.setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_FULLSCREEN
                );
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyImmersiveMode();
        }
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        if (webView != null) {
            webView.post(new Runnable() {
                @Override
                public void run() {
                    applyImmersiveMode();
                    webView.evaluateJavascript("if(window.fitPageToViewport) window.fitPageToViewport();", null);
                }
            });
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        webView.addJavascriptInterface(new AndroidVoiceBridge(), "AndroidVoiceBridge");
        webView.setWebViewClient(new WebViewClient());
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        setContentView(webView);

        webView.post(new Runnable() {
            @Override
            public void run() {
                applyImmersiveMode();
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                                pendingWebPermissionRequest = request;
                                requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, AUDIO_PERMISSION_REQUEST_CODE);
                                return;
                            }
                        }
                        request.grant(request.getResources());
                    }
                });
            }

            @Override
            public boolean onShowFileChooser(
                WebView webView,
                ValueCallback<Uri[]> filePathCallback,
                FileChooserParams fileChooserParams
            ) {
                if (MainActivity.this.filePathCallback != null) {
                    MainActivity.this.filePathCallback.onReceiveValue(null);
                }
                MainActivity.this.filePathCallback = filePathCallback;

                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");

                String[] acceptTypes = fileChooserParams.getAcceptTypes();
                if (acceptTypes != null && acceptTypes.length > 0 && acceptTypes[0] != null && !acceptTypes[0].isEmpty()) {
                    if (acceptTypes[0].contains("image")) {
                        intent.setType("image/*");
                    } else if (acceptTypes[0].contains("pdf")) {
                        intent.setType("application/pdf");
                    }
                }

                if (fileChooserParams.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) {
                    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                }

                try {
                    startActivityForResult(Intent.createChooser(intent, "Dosya / Fotoğraf / PDF Seçin"), FILE_CHOOSER_RESULT_CODE);
                } catch (Exception e) {
                    MainActivity.this.filePathCallback = null;
                    return false;
                }
                return true;
            }
        });

        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        if (requestCode == NATIVE_MIC_PERMISSION_CODE) {
            final boolean granted = grantResults != null && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (webView != null) {
                webView.post(new Runnable() {
                    @Override
                    public void run() {
                        webView.evaluateJavascript("if(window.onAndroidMicPermissionResult) window.onAndroidMicPermissionResult(" + granted + ");", null);
                    }
                });
            }
        } else if (requestCode == AUDIO_PERMISSION_REQUEST_CODE) {
            if (pendingWebPermissionRequest != null) {
                if (grantResults != null && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    pendingWebPermissionRequest.grant(pendingWebPermissionRequest.getResources());
                } else {
                    pendingWebPermissionRequest.deny();
                }
                pendingWebPermissionRequest = null;
            }
        } else {
            super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_RESULT_CODE) {
            if (filePathCallback == null) return;
            Uri[] results = null;
            if (resultCode == Activity.RESULT_OK && data != null) {
                String dataString = data.getDataString();
                ClipData clipData = data.getClipData();
                if (clipData != null) {
                    results = new Uri[clipData.getItemCount()];
                    for (int i = 0; i < clipData.getItemCount(); i++) {
                        results[i] = clipData.getItemAt(i).getUri();
                    }
                } else if (dataString != null) {
                    results = new Uri[]{Uri.parse(dataString)};
                }
            }
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null) {
            webView.evaluateJavascript(
                "(function(){ return (window.handleAndroidBack && window.handleAndroidBack()) ? 'HANDLED' : 'EXIT'; })()",
                new ValueCallback<String>() {
                    @Override
                    public void onReceiveValue(String value) {
                        if (value == null || !value.contains("HANDLED")) {
                            MainActivity.super.onBackPressed();
                        }
                    }
                }
            );
        } else {
            super.onBackPressed();
        }
    }
}
`;

fs.writeFileSync(path.join(javaDir, 'MainActivity.java'), mainActivityJava, 'utf8');
console.log('APK kaynak dosyalari (v1.4.0 - Ana Ekran & Taşınabilir Ses/Not Stüdyosu) apk-build/ icinde hazirlandi.');


