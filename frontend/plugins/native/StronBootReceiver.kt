package com.stepwars.stepwarsnew_app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

/**
 * StronBootReceiver — restarts the step foreground service after device boot.
 * Mirrors Flutter ForegroundTaskOptions(autoRunOnBoot: true).
 *
 * Requires: android.permission.RECEIVE_BOOT_COMPLETED in AndroidManifest.xml
 */
class StronBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED &&
            intent.action != "android.intent.action.QUICKBOOT_POWERON"
        ) return

        // Only auto-start if a userId is stored (user was previously signed in)
        val prefs = context.getSharedPreferences(StronStepService.PREFS_NAME, Context.MODE_PRIVATE)
        val userId = prefs.getString(StronStepService.KEY_USER_ID, null)
        if (userId.isNullOrEmpty()) {
            Log.d("StronBootReceiver", "No userId stored — skipping auto-start")
            return
        }

        // Skip auto-start if we can't legally start a health foreground service
        // (missing ACTIVITY_RECOGNITION runtime permission on Android 14+).
        if (!StronStepService.hasHealthFgsPermission(context)) {
            Log.d("StronBootReceiver", "Missing health FGS permission — skipping auto-start")
            return
        }

        Log.d("StronBootReceiver", "Device booted. Auto-starting step service for userId=$userId")
        val serviceIntent = Intent(context, StronStepService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent)
        } else {
            context.startService(serviceIntent)
        }
    }
}
