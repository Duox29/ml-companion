package com.mlcompanion.app;

import android.os.Build;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;

public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Draw the WebView edge-to-edge so the app can fill status/navigation bar areas.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat insetsController =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (insetsController != null) {
            insetsController.setAppearanceLightStatusBars(false);
            insetsController.setAppearanceLightNavigationBars(false);
        }

        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();

        // ✅ Bật hardware acceleration cho renderer
        settings.setRenderPriority(WebSettings.RenderPriority.HIGH);

        // ✅ Request high refresh rate từ Android platform (API 30+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setFrameRateBoostOnTouchEnabled(true);
        }
    }

    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {
        // Marker method required by @capgo/capacitor-social-login for scopes/offline mode.
    }
}
