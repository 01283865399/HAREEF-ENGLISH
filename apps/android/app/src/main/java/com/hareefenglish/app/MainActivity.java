package com.hareefenglish.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

public final class MainActivity extends Activity {
    private static final String SITE_URL = "https://hareef-english.vercel.app/";
    private static final String SITE_HOST = "hareef-english.vercel.app";
    private static final int FILE_CHOOSER_REQUEST = 4101;

    private WebView webView;
    private View splashView;
    private ValueCallback<Uri[]> fileChooserCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(0xFF855CA3);
        getWindow().setNavigationBarColor(0xFF16121B);

        webView = new WebView(this);
        webView.setLayoutParams(new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));
        configureWebView();

        FrameLayout root = new FrameLayout(this);
        root.addView(webView);
        splashView = createSplashView();
        root.addView(splashView);
        setContentView(root);

        Uri callback = getIntent().getData();
        if (isAuthCallback(callback)) {
            loadWebsiteCallback(callback);
        } else {
            webView.loadUrl(SITE_URL);
        }
    }

    private View createSplashView() {
        LinearLayout splash = new LinearLayout(this);
        splash.setOrientation(LinearLayout.VERTICAL);
        splash.setGravity(Gravity.CENTER);
        splash.setBackgroundColor(Color.rgb(249, 246, 251));

        ImageView icon = new ImageView(this);
        icon.setImageResource(R.drawable.brand_icon);
        int iconSize = (int) (148 * getResources().getDisplayMetrics().density);
        splash.addView(icon, new LinearLayout.LayoutParams(iconSize, iconSize));

        TextView title = new TextView(this);
        title.setText("حريف إنجليش");
        title.setTextColor(Color.rgb(88, 56, 111));
        title.setTextSize(24);
        title.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        title.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        titleParams.topMargin = (int) (18 * getResources().getDisplayMetrics().density);
        splash.addView(title, titleParams);

        TextView subtitle = new TextView(this);
        subtitle.setText("مستر محمود عبد الواحد");
        subtitle.setTextColor(Color.rgb(101, 92, 107));
        subtitle.setTextSize(15);
        subtitle.setGravity(Gravity.CENTER);
        splash.addView(subtitle);
        return splash;
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        webView.addJavascriptInterface(new PlatformBridge(), "AlarrabAndroid");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equals(uri.getScheme()) && SITE_HOST.equals(uri.getHost())) {
                    return false;
                }
                openExternal(uri);
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (splashView != null) {
                    splashView.setVisibility(View.GONE);
                }
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                getWindow().setStatusBarColor(0xFF855CA3);
            }

            @Override
            public void onReceivedSslError(
                WebView view,
                android.webkit.SslErrorHandler handler,
                android.net.http.SslError error
            ) {
                handler.cancel();
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                WebView view,
                ValueCallback<Uri[]> callback,
                FileChooserParams params
            ) {
                if (fileChooserCallback != null) {
                    fileChooserCallback.onReceiveValue(null);
                }
                fileChooserCallback = callback;
                try {
                    startActivityForResult(params.createIntent(), FILE_CHOOSER_REQUEST);
                    return true;
                } catch (android.content.ActivityNotFoundException exception) {
                    fileChooserCallback = null;
                    callback.onReceiveValue(null);
                    return false;
                }
            }

        });
    }

    private void openExternal(Uri uri) {
        String scheme = uri.getScheme();
        if (!"https".equals(scheme) && !"mailto".equals(scheme) && !"tel".equals(scheme)) {
            return;
        }
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (android.content.ActivityNotFoundException exception) {
            Toast.makeText(this, "تعذر فتح الرابط على الجهاز.", Toast.LENGTH_SHORT).show();
        }
    }

    private boolean isAuthCallback(Uri uri) {
        return uri != null
            && "hareefenglish".equals(uri.getScheme())
            && "auth".equals(uri.getHost())
            && ("/callback".equals(uri.getPath()) || "/reset-password".equals(uri.getPath()));
    }

    private void loadWebsiteCallback(Uri callback) {
        Uri.Builder builder = new Uri.Builder()
            .scheme("https")
            .authority(SITE_HOST)
            .path("/" + callback.getHost() + callback.getPath());
        if (callback.getEncodedQuery() != null) {
            builder.encodedQuery(callback.getEncodedQuery());
        }
        if (callback.getEncodedFragment() != null) {
            builder.encodedFragment(callback.getEncodedFragment());
        }
        webView.loadUrl(builder.build().toString());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        Uri callback = intent.getData();
        if (isAuthCallback(callback) && webView != null) {
            loadWebsiteCallback(callback);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST || fileChooserCallback == null) {
            return;
        }
        Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
        fileChooserCallback.onReceiveValue(results);
        fileChooserCallback = null;
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (fileChooserCallback != null) {
            fileChooserCallback.onReceiveValue(null);
            fileChooserCallback = null;
        }
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    public final class PlatformBridge {
        @android.webkit.JavascriptInterface
        public String authRedirectUrl(String route, String nextPath) {
            if (!"/auth/callback".equals(route) && !"/reset-password".equals(route)) {
                return SITE_URL;
            }
            Uri parsedNext = Uri.parse(nextPath == null ? "/dashboard" : nextPath);
            String safeNext = parsedNext.getPath();
            if (safeNext == null
                || !safeNext.startsWith("/")
                || safeNext.startsWith("//")
                || parsedNext.isAbsolute()) {
                safeNext = "/dashboard";
            }
            String[] parts = route.substring(1).split("/");
            Uri.Builder builder = new Uri.Builder().scheme("hareefenglish");
            if (parts.length == 2) {
                builder.authority(parts[0]).appendPath(parts[1]);
                builder.appendQueryParameter("next", safeNext);
            } else {
                builder.authority("auth").appendPath(parts[0]);
            }
            return builder.build().toString();
        }

        @android.webkit.JavascriptInterface
        public void setDarkMode(boolean isDark) {
            runOnUiThread(() -> {
                Window window = getWindow();
                window.setStatusBarColor(isDark ? 0xFF231C29 : 0xFF855CA3);
                window.getDecorView().setSystemUiVisibility(
                    isDark ? 0 : View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
                );
            });
        }
    }
}
