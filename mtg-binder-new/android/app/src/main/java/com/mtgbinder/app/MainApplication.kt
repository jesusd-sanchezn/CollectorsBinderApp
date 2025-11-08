package com.mtgbinder.app

import android.app.Application
import android.content.res.Configuration
import android.util.Log

import com.facebook.FacebookSdk
import com.facebook.appevents.AppEventsLogger
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactNativeHost

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
      this,
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())
            }

          override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      }
  )

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    if (!FacebookSdk.isInitialized()) {
      val appId = runCatching { getString(R.string.facebook_app_id) }.getOrNull()
      if (!appId.isNullOrBlank()) {
        if (appId == "fb_placeholder_app_id") {
          Log.w("MainApplication", "Using placeholder Facebook App ID; replace with production value before release.")
        }
        FacebookSdk.setApplicationId(appId)
        val clientToken = runCatching { getString(R.string.facebook_client_token) }.getOrNull()
        if (!clientToken.isNullOrBlank()) {
          if (clientToken == "placeholder_client_token") {
            Log.w("MainApplication", "Using placeholder Facebook Client Token; replace before release.")
          }
          FacebookSdk.setClientToken(clientToken)
        }
        FacebookSdk.sdkInitialize(applicationContext)
        AppEventsLogger.activateApp(this)
      } else {
        Log.w("MainApplication", "Facebook App ID resource missing; skipping SDK initialization.")
      }
    }
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
