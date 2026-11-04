package com.ktsolution.butsukari;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.ktsolution.butsukari.LanDiscovery;
import com.ktsolution.butsukari.LanTransport;
import com.ktsolution.butsukari.LanWebServer;
import com.ktsolution.butsukari.MainActivity;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

public class MainActivity extends Activity {
    private static final int CREATE_SAVE = 42;
    private static final int MAX_SAVE_BYTES = 4194304;
    private static final int OPEN_SAVE = 41;
    private String exportData;
    private ValueCallback<Uri[]> fileCallback;
    private LanDiscovery lanDiscovery;
    private LanTransport lanTransport;
    private LanWebServer lanWebServer;
    private WebView web;

    public final class LanBridge {
        public LanBridge() {
        }

        @JavascriptInterface
        public void host(final String str) {
            MainActivity.this.runOnUiThread(new Runnable() { // from class: com.ktsolution.butsukari.MainActivity$LanBridge$$ExternalSyntheticLambda2
                @Override // java.lang.Runnable
                public final void run() {
                    MainActivity.LanBridge.this.m22lambda$0$comktsolutionbutsukariMainActivity$LanBridge(str);
                }
            });
        }

        /* renamed from: lambda$0$com-ktsolution-butsukari-MainActivity$LanBridge, reason: not valid java name */
        /* synthetic */ void m22lambda$0$comktsolutionbutsukariMainActivity$LanBridge(String str) {
            if (MainActivity.this.trustedGame()) {
                MainActivity.this.lanDiscovery.close();
                try {
                    MainActivity.this.lanTransport.host(str);
                } catch (Exception e) {
                    MainActivity.this.lanEvent("error", "0", "部屋を作れませんでした。Wi-Fiを確認してください");
                }
            }
        }

        @JavascriptInterface
        public void join(final String str, final int i, final String str2) {
            MainActivity.this.runOnUiThread(new Runnable() { // from class: com.ktsolution.butsukari.MainActivity$LanBridge$$ExternalSyntheticLambda3
                @Override // java.lang.Runnable
                public final void run() {
                    MainActivity.LanBridge.this.m23lambda$1$comktsolutionbutsukariMainActivity$LanBridge(str, i, str2);
                }
            });
        }

        /* renamed from: lambda$1$com-ktsolution-butsukari-MainActivity$LanBridge, reason: not valid java name */
        /* synthetic */ void m23lambda$1$comktsolutionbutsukariMainActivity$LanBridge(String str, int i, String str2) {
            if (MainActivity.this.trustedGame()) {
                MainActivity.this.lanDiscovery.close();
                MainActivity.this.lanWebServer.close();
                MainActivity.this.lanTransport.join(str, i, str2);
            }
        }

        @JavascriptInterface
        public void copyUrl(final String str) {
            MainActivity.this.runOnUiThread(new Runnable() { // from class: com.ktsolution.butsukari.MainActivity$LanBridge$$ExternalSyntheticLambda5
                @Override // java.lang.Runnable
                public final void run() {
                    MainActivity.LanBridge.this.m24lambda$2$comktsolutionbutsukariMainActivity$LanBridge(str);
                }
            });
        }

        /* renamed from: lambda$2$com-ktsolution-butsukari-MainActivity$LanBridge, reason: not valid java name */
        /* synthetic */ void m24lambda$2$comktsolutionbutsukariMainActivity$LanBridge(String str) {
            ClipboardManager clipboardManager;
            if (!MainActivity.this.trustedGame() || str == null || !str.matches("http://[0-9.]+:39762/") || (clipboardManager = (ClipboardManager) MainActivity.this.getSystemService("clipboard")) == null) {
                return;
            }
            clipboardManager.setPrimaryClip(ClipData.newPlainText("ぶつかり勇者：参加URL", str));
        }

        @JavascriptInterface
        public void discover(final int i) {
            MainActivity.this.runOnUiThread(new Runnable() { // from class: com.ktsolution.butsukari.MainActivity$LanBridge$$ExternalSyntheticLambda0
                @Override // java.lang.Runnable
                public final void run() {
                    MainActivity.LanBridge.this.m25lambda$3$comktsolutionbutsukariMainActivity$LanBridge(i);
                }
            });
        }

        /* renamed from: lambda$3$com-ktsolution-butsukari-MainActivity$LanBridge, reason: not valid java name */
        /* synthetic */ void m25lambda$3$comktsolutionbutsukariMainActivity$LanBridge(int i) {
            if (MainActivity.this.trustedGame()) {
                MainActivity.this.lanDiscovery.start(i);
            }
        }

        /* renamed from: lambda$4$com-ktsolution-butsukari-MainActivity$LanBridge, reason: not valid java name */
        /* synthetic */ void m26lambda$4$comktsolutionbutsukariMainActivity$LanBridge() {
            if (MainActivity.this.lanDiscovery != null) {
                MainActivity.this.lanDiscovery.stop();
            }
        }

        @JavascriptInterface
        public void stopDiscovery() {
            MainActivity.this.runOnUiThread(new Runnable() { // from class: com.ktsolution.butsukari.MainActivity$LanBridge$$ExternalSyntheticLambda4
                @Override // java.lang.Runnable
                public final void run() {
                    MainActivity.LanBridge.this.m26lambda$4$comktsolutionbutsukariMainActivity$LanBridge();
                }
            });
        }

        @JavascriptInterface
        public void send(String str, String str2) {
            if (MainActivity.this.lanTransport != null) {
                MainActivity.this.lanTransport.send(str, str2);
            }
        }

        @JavascriptInterface
        public void disconnect(String str) {
            if (MainActivity.this.lanTransport != null) {
                MainActivity.this.lanTransport.disconnect(str);
            }
        }

        @JavascriptInterface
        public void close() {
            MainActivity.this.runOnUiThread(new Runnable() { // from class: com.ktsolution.butsukari.MainActivity$LanBridge$$ExternalSyntheticLambda1
                @Override // java.lang.Runnable
                public final void run() {
                    MainActivity.LanBridge.this.m27lambda$5$comktsolutionbutsukariMainActivity$LanBridge();
                }
            });
        }

        /* renamed from: lambda$5$com-ktsolution-butsukari-MainActivity$LanBridge, reason: not valid java name */
        /* synthetic */ void m27lambda$5$comktsolutionbutsukariMainActivity$LanBridge() {
            if (MainActivity.this.lanDiscovery != null) {
                MainActivity.this.lanDiscovery.close();
            }
            if (MainActivity.this.lanTransport != null) {
                MainActivity.this.lanTransport.close();
            }
        }
    }

    /* JADX INFO: Access modifiers changed from: private */
    public void lanDiscoveryEvent(final int i, final String str, final String str2) {
        runOnUiThread(new Runnable() { // from class: com.ktsolution.butsukari.MainActivity$$ExternalSyntheticLambda7
            @Override // java.lang.Runnable
            public final void run() {
                MainActivity.this.m16lambda$0$comktsolutionbutsukariMainActivity(i, str, str2);
            }
        });
    }

    /* renamed from: lambda$0$com-ktsolution-butsukari-MainActivity, reason: not valid java name */
    /* synthetic */ void m16lambda$0$comktsolutionbutsukariMainActivity(int i, String str, String str2) {
        if (trustedGame()) {
            this.web.evaluateJavascript("window.__lanDiscovered && window.__lanDiscovered(" + i + "," + JSONObject.quote(str) + "," + str2 + ");", null);
        }
    }

    /* JADX INFO: Access modifiers changed from: private */
    public void lanEvent(final String str, final String str2, final String str3) {
        runOnUiThread(new Runnable() { // from class: com.ktsolution.butsukari.MainActivity$$ExternalSyntheticLambda2
            @Override // java.lang.Runnable
            public final void run() {
                MainActivity.this.m17lambda$1$comktsolutionbutsukariMainActivity(str, str2, str3);
            }
        });
    }

    /* renamed from: lambda$1$com-ktsolution-butsukari-MainActivity, reason: not valid java name */
    /* synthetic */ void m17lambda$1$comktsolutionbutsukariMainActivity(String str, String str2, String str3) {
        if (trustedGame()) {
            if (str.equals("hosted")) {
                this.lanDiscovery.advertise(this.lanTransport.localPort());
            }
            this.web.evaluateJavascript("window.__lanNative && window.__lanNative(" + JSONObject.quote(str) + "," + JSONObject.quote(str2) + "," + JSONObject.quote(str3) + ");", null);
            if (str.equals("hosted")) {
                try {
                    this.lanWebServer.start(LanWebServer.PORT);
                    this.web.evaluateJavascript("window.__lanNative && window.__lanNative('webhosted','0'," + JSONObject.quote(LanWebServer.addresses(this.lanWebServer.port())) + ");", null);
                } catch (Exception e) {
                    this.web.evaluateJavascript("window.__lanNative && window.__lanNative('weberror','0','ブラウザ用の接続を開始できませんでした。ほかの部屋を閉じてから作り直してください。');", null);
                }
            }
        }
    }

    /* JADX INFO: Access modifiers changed from: private */
    public boolean trustedGame() {
        return this.web != null && "file:///android_asset/index.html".equals(this.web.getUrl());
    }

    public final class SaveBridge {
        public SaveBridge() {
        }

        @JavascriptInterface
        public void exportSave(final String str, final String str2) {
            MainActivity.this.runOnUiThread(new Runnable() { // from class: com.ktsolution.butsukari.MainActivity$SaveBridge$$ExternalSyntheticLambda0
                @Override // java.lang.Runnable
                public final void run() {
                    MainActivity.SaveBridge.this.m28lambda$0$comktsolutionbutsukariMainActivity$SaveBridge(str, str2);
                }
            });
        }

        /* renamed from: lambda$0$com-ktsolution-butsukari-MainActivity$SaveBridge, reason: not valid java name */
        /* synthetic */ void m28lambda$0$comktsolutionbutsukariMainActivity$SaveBridge(String str, String str2) {
            if (MainActivity.this.trustedGame()) {
                if (MainActivity.this.exportData == null) {
                    if (str != null && str.getBytes(StandardCharsets.UTF_8).length <= MainActivity.MAX_SAVE_BYTES && str2 != null && str2.matches("[a-zA-Z0-9._-]{1,100}\\.json")) {
                        MainActivity.this.exportData = str;
                        Intent intent = new Intent("android.intent.action.CREATE_DOCUMENT");
                        intent.addCategory("android.intent.category.OPENABLE");
                        intent.setType("application/json");
                        intent.putExtra("android.intent.extra.TITLE", str2);
                        try {
                            MainActivity.this.startActivityForResult(intent, MainActivity.CREATE_SAVE);
                            return;
                        } catch (RuntimeException e) {
                            MainActivity.this.exportData = null;
                            MainActivity.this.saveResult(false, "保存先の選択画面を開けませんでした。");
                            return;
                        }
                    }
                    MainActivity.this.saveResult(false, "書き出すデータの形式が正しくありません。");
                    return;
                }
                MainActivity.this.saveResult(false, "保存先を選択中です。");
            }
        }
    }

    /* JADX INFO: Access modifiers changed from: private */
    public void saveResult(boolean z, String str) {
        if (this.web != null) {
            this.web.evaluateJavascript("window.__saveTransferNativeResult && window.__saveTransferNativeResult(" + z + "," + JSONObject.quote(str) + ");", null);
        }
    }

    @Override // android.app.Activity
    protected void onActivityResult(int i, int i2, Intent intent) {
        super.onActivityResult(i, i2, intent);
        Uri[] uriArr = null;
        if (i == OPEN_SAVE) {
            ValueCallback<Uri[]> valueCallback = this.fileCallback;
            this.fileCallback = null;
            if (valueCallback != null) {
                if (i2 == -1 && intent != null && intent.getData() != null) {
                    uriArr = new Uri[]{intent.getData()};
                }
                valueCallback.onReceiveValue(uriArr);
                return;
            }
            return;
        }
        if (i == CREATE_SAVE) {
            final String str = this.exportData;
            this.exportData = null;
            if (i2 != -1 || intent == null || intent.getData() == null || str == null) {
                saveResult(false, "保存をキャンセルしました。");
            } else {
                final Uri data = intent.getData();
                new Thread(new Runnable() { // from class: com.ktsolution.butsukari.MainActivity$$ExternalSyntheticLambda6
                    @Override // java.lang.Runnable
                    public final void run() {
                        MainActivity.this.m18lambda$2$comktsolutionbutsukariMainActivity(data, str);
                    }
                }, "save-export").start();
            }
        }
    }

    /* renamed from: lambda$2$com-ktsolution-butsukari-MainActivity, reason: not valid java name */
    /* synthetic */ void m18lambda$2$comktsolutionbutsukariMainActivity(Uri uri, String str) {
        boolean ok = false;
        try (OutputStream out = getContentResolver().openOutputStream(uri, "wt")) {
            if (out != null) {
                out.write(str.getBytes(StandardCharsets.UTF_8));
                out.flush();
                ok = true;
            }
        } catch (Exception e) {
            ok = false;
        }
        final boolean z = ok;
        runOnUiThread(() -> MainActivity.this.m19lambda$3$comktsolutionbutsukariMainActivity(z));
    }

    /* renamed from: lambda$3$com-ktsolution-butsukari-MainActivity, reason: not valid java name */
    /* synthetic */ void m19lambda$3$comktsolutionbutsukariMainActivity(boolean z) {
        saveResult(z, z ? "セーブファイルを保存しました。" : "ファイルを保存できませんでした。保存先を確認してください。");
    }

    @Override // android.app.Activity
    protected void onCreate(Bundle bundle) {
        super.onCreate(bundle);
        Window window = getWindow();
        window.addFlags(128);
        if (Build.VERSION.SDK_INT >= 28) {
            window.getAttributes().layoutInDisplayCutoutMode = 1;
        }
        this.web = new WebView(this);
        this.web.setBackgroundColor(-16777216);
        this.web.setVerticalScrollBarEnabled(false);
        this.web.setHorizontalScrollBarEnabled(false);
        this.web.setOverScrollMode(2);
        this.web.setHapticFeedbackEnabled(false);
        this.web.setLayerType(2, null);
        WebSettings settings = this.web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setTextZoom(100);
        this.web.setWebViewClient(new WebViewClient() { // from class: com.ktsolution.butsukari.MainActivity.1
            @Override // android.webkit.WebViewClient
            public boolean shouldOverrideUrlLoading(WebView webView, WebResourceRequest webResourceRequest) {
                return ("file".equals(webResourceRequest.getUrl().getScheme()) && "/android_asset/index.html".equals(webResourceRequest.getUrl().getPath())) ? false : true;
            }

            @Override // android.webkit.WebViewClient
            public boolean shouldOverrideUrlLoading(WebView webView, String str) {
                return !"file:///android_asset/index.html".equals(str);
            }
        });
        this.web.addJavascriptInterface(new SaveBridge(), "YushaSave");
        this.lanTransport = new LanTransport(new LanTransport.Listener() { // from class: com.ktsolution.butsukari.MainActivity$$ExternalSyntheticLambda3
            @Override // com.ktsolution.butsukari.LanTransport.Listener
            public final void event(String str, String str2, String str3) {
                MainActivity.this.lanEvent(str, str2, str3);
            }
        });
        this.lanDiscovery = new LanDiscovery(this, new LanDiscovery.Listener() { // from class: com.ktsolution.butsukari.MainActivity$$ExternalSyntheticLambda4
            @Override // com.ktsolution.butsukari.LanDiscovery.Listener
            public final void update(int i, String str, String str2) {
                MainActivity.this.lanDiscoveryEvent(i, str, str2);
            }
        });
        this.lanWebServer = new LanWebServer(this.lanTransport, new LanWebServer.Assets() { // from class: com.ktsolution.butsukari.MainActivity$$ExternalSyntheticLambda5
            @Override // com.ktsolution.butsukari.LanWebServer.Assets
            public final byte[] read(String str) throws java.io.IOException {
                return MainActivity.this.m20lambda$6$comktsolutionbutsukariMainActivity(str);
            }
        });
        this.web.addJavascriptInterface(new LanBridge(), "YushaLan");
        this.web.setWebChromeClient(new WebChromeClient() { // from class: com.ktsolution.butsukari.MainActivity.2
            @Override // android.webkit.WebChromeClient
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> valueCallback, WebChromeClient.FileChooserParams fileChooserParams) {
                if (!MainActivity.this.trustedGame()) {
                    return false;
                }
                if (MainActivity.this.fileCallback != null) {
                    MainActivity.this.fileCallback.onReceiveValue(null);
                }
                MainActivity.this.fileCallback = valueCallback;
                Intent intent = new Intent("android.intent.action.OPEN_DOCUMENT");
                intent.addCategory("android.intent.category.OPENABLE");
                intent.setType("*/*");
                intent.putExtra("android.intent.extra.MIME_TYPES", new String[]{"application/json", "text/plain", "application/octet-stream"});
                try {
                    MainActivity.this.startActivityForResult(intent, MainActivity.OPEN_SAVE);
                    return true;
                } catch (RuntimeException e) {
                    MainActivity.this.fileCallback = null;
                    valueCallback.onReceiveValue(null);
                    return true;
                }
            }
        });
        setContentView(this.web);
        hideSystemUi();
        this.web.loadUrl("file:///android_asset/index.html");
    }

    /* renamed from: lambda$6$com-ktsolution-butsukari-MainActivity, reason: not valid java name */
    /* synthetic */ byte[] m20lambda$6$comktsolutionbutsukariMainActivity(String str) throws IOException {
        Throwable th = null;
        try {
            InputStream open = getAssets().open(str);
            try {
                ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
                try {
                    byte[] bArr = new byte[16384];
                    while (true) {
                        int read = open.read(bArr);
                        if (read == -1) {
                            break;
                        }
                        byteArrayOutputStream.write(bArr, 0, read);
                    }
                    byte[] byteArray = byteArrayOutputStream.toByteArray();
                    if (open != null) {
                        open.close();
                    }
                    return byteArray;
                } finally {
                    byteArrayOutputStream.close();
                }
            } finally {
            }
        } finally {
        }
    }

    private void hideSystemUi() {
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController insetsController = getWindow().getInsetsController();
            if (insetsController != null) {
                insetsController.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                insetsController.setSystemBarsBehavior(2);
                return;
            }
            return;
        }
        getWindow().getDecorView().setSystemUiVisibility(5894);
    }

    @Override // android.app.Activity, android.view.Window.Callback
    public void onWindowFocusChanged(boolean z) {
        super.onWindowFocusChanged(z);
        if (z) {
            hideSystemUi();
        }
    }

    @Override // android.app.Activity
    public void onBackPressed() {
        if (this.web == null) {
            super.onBackPressed();
        } else {
            this.web.evaluateJavascript("(window.__appBack && window.__appBack()) ? 'yes' : 'no'", new ValueCallback() { // from class: com.ktsolution.butsukari.MainActivity$$ExternalSyntheticLambda0
                @Override // android.webkit.ValueCallback
                public final void onReceiveValue(Object obj) {
                    MainActivity.this.m21lambda$7$comktsolutionbutsukariMainActivity((String) obj);
                }
            });
        }
    }

    /* renamed from: lambda$7$com-ktsolution-butsukari-MainActivity, reason: not valid java name */
    /* synthetic */ void m21lambda$7$comktsolutionbutsukariMainActivity(String str) {
        if (str == null || !str.contains("yes")) {
            finish();
        }
    }

    @Override // android.app.Activity
    protected void onPause() {
        if (this.lanWebServer != null) {
            this.lanWebServer.close();
        }
        if (this.lanDiscovery != null) {
            this.lanDiscovery.close();
        }
        if (this.web != null) {
            this.web.evaluateJavascript("window.__lanSuspend && window.__lanSuspend()", null);
        }
        if (this.web != null) {
            this.web.evaluateJavascript("window.__appPause && window.__appPause()", null);
            this.web.onPause();
        }
        super.onPause();
    }

    @Override // android.app.Activity
    protected void onResume() {
        super.onResume();
        if (this.web != null) {
            this.web.onResume();
            this.web.evaluateJavascript("window.__appResume && window.__appResume()", null);
        }
        hideSystemUi();
    }

    @Override // android.app.Activity
    protected void onDestroy() {
        if (this.fileCallback != null) {
            this.fileCallback.onReceiveValue(null);
            this.fileCallback = null;
        }
        this.exportData = null;
        if (this.lanWebServer != null) {
            this.lanWebServer.close();
            this.lanWebServer = null;
        }
        if (this.lanDiscovery != null) {
            this.lanDiscovery.close();
            this.lanDiscovery = null;
        }
        if (this.lanTransport != null) {
            this.lanTransport.close();
            this.lanTransport = null;
        }
        if (this.web != null) {
            this.web.removeJavascriptInterface("YushaLan");
            this.web.removeJavascriptInterface("YushaSave");
            this.web.destroy();
            this.web = null;
        }
        super.onDestroy();
    }
}
