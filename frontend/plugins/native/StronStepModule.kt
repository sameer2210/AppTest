package com.stepwars.stepwarsnew_app

import android.content.Context
import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * StronStepModule — React Native NativeModule bridge between JS and StronStepService.
 *
 * Mirrors Flutter FlutterForegroundTask API:
 *  startService  ↔ FlutterForegroundTask.startService / restartService
 *  stopService   ↔ FlutterForegroundTask.stopService
 *  updateDbSteps ↔ FlutterForegroundTask.sendDataToTask({ dbSteps })
 *  sendOffset    ↔ FlutterForegroundTask.sendDataToTask({ offset })
 *  getCurrentSteps ↔ reading SharedPreferences (foreground task data store)
 *  isRunning     ↔ FlutterForegroundTask.isRunningService
 */
class StronStepModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "StronStepModule"

    // ─── Start / stop ─────────────────────────────────────────────────────────

    /**
     * Start (or restart) the foreground service.
     * config keys: userId, apiUrl, dbSteps, dailyOffset, offsetDate, accessToken, refreshToken
     */
    @ReactMethod
    fun startService(config: ReadableMap, promise: Promise) {
        try {
            // Android 14+ crashes when starting a `health` foreground service without
            // the ACTIVITY_RECOGNITION runtime permission. Persist the config so it's
            // ready once the user grants the permission, then bail out without starting.
            if (!StronStepService.hasHealthFgsPermission(reactContext)) {
                persistConfig(config)
                promise.resolve(false)
                return
            }
            val intent = Intent(reactContext, StronStepService::class.java).apply {
                config.getString("userId")?.let { putExtra(StronStepService.EXTRA_USER_ID, it) }
                config.getString("apiUrl")?.let { putExtra(StronStepService.EXTRA_API_URL, it) }
                if (config.hasKey("dbSteps")) {
                    putExtra(StronStepService.EXTRA_DB_STEPS, config.getInt("dbSteps"))
                }
                if (config.hasKey("dailyOffset")) {
                    putExtra(StronStepService.EXTRA_DAILY_OFFSET, config.getInt("dailyOffset"))
                }
                config.getString("offsetDate")?.let { putExtra(StronStepService.EXTRA_OFFSET_DATE, it) }
                config.getString("accessToken")?.let { putExtra(StronStepService.EXTRA_ACCESS_TOKEN, it) }
                config.getString("refreshToken")?.let { putExtra(StronStepService.EXTRA_REFRESH_TOKEN, it) }
            }
            com.facebook.react.bridge.UiThreadUtil.runOnUiThread {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    reactContext.startForegroundService(intent)
                } else {
                    reactContext.startService(intent)
                }
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("START_SERVICE_ERROR", e.message ?: "Unknown error")
        }
    }

    @ReactMethod
    fun stopService(promise: Promise) {
        try {
            reactContext.stopService(Intent(reactContext, StronStepService::class.java))
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_SERVICE_ERROR", e.message ?: "Unknown error")
        }
    }

    // ─── Data bridge — mirrors FlutterForegroundTask.sendDataToTask ──────────

    /**
     * Send updated DB step baseline to the service (mirrors sendDataToTask({dbSteps: x})).
     * Raises local/notification when the baseline is ahead of native local.
     */
    @ReactMethod
    fun updateDbSteps(steps: Int, promise: Promise) {
        try {
            val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val capped = steps.coerceIn(0, StronStepService.MAX_DAILY_STEPS)
            val p = prefs()
            val date = p.getString(StronStepService.KEY_LOCAL_STEPS_DATE, "") ?: ""
            val nativeLocal = if (date == today) p.getInt(StronStepService.KEY_LOCAL_STEPS, 0) else 0
            val safeLocal = nativeLocal.coerceIn(0, StronStepService.MAX_DAILY_STEPS)
            val nextLocal = if (capped == 0) 0 else maxOf(safeLocal, capped)
            val editor = p.edit()
                .putInt(StronStepService.KEY_DB_STEPS, capped)
                .putInt(StronStepService.KEY_LOCAL_STEPS, nextLocal)
                .putString(StronStepService.KEY_LOCAL_STEPS_DATE, today)
            if (capped == 0) {
                editor.remove(StronStepService.KEY_HISTORY_PREFIX + today)
                StronNotificationLayout.writeZeroIdlePayload(editor)
            }
            editor.commit()
            if (capped == 0) {
                StronStepService.replaceAccountSteps(0, today)
            } else {
                StronStepService.adoptBaselineSteps(capped, today)
            }
            if (StronStepService.hasHealthFgsPermission(reactContext)) {
                val refreshIntent = Intent(reactContext, StronStepService::class.java).apply {
                    action = StronStepService.ACTION_REFRESH_NOTIFICATION
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    reactContext.startForegroundService(refreshIntent)
                } else {
                    reactContext.startService(refreshIntent)
                }
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("UPDATE_DB_STEPS_ERROR", e.message ?: "Unknown error")
        }
    }

    /**
     * Replace native today-total on account switch. Unlike updateDbSteps this
     * does not max() with the previous account's count, and rebases the sensor offset.
     */
    @ReactMethod
    fun replaceAccountSteps(steps: Int, promise: Promise) {
        try {
            val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val capped = steps.coerceIn(0, StronStepService.MAX_DAILY_STEPS)
            val editor = prefs().edit()
                .putInt(StronStepService.KEY_LOCAL_STEPS, capped)
                .putString(StronStepService.KEY_LOCAL_STEPS_DATE, today)
                .putInt(StronStepService.KEY_DB_STEPS, capped)
                .remove(StronStepService.KEY_HISTORY_PREFIX + today)
                .remove(StronStepService.KEY_DAILY_OFFSET)
                .remove(StronStepService.KEY_OFFSET_DATE)
            if (capped == 0) {
                StronNotificationLayout.writeZeroIdlePayload(editor)
            }
            val lastSaved = prefs().getInt(StronStepService.KEY_LAST_READING, 0)
            if (lastSaved > 0) {
                StronStepService.writeSessionAnchor(editor, capped, lastSaved, today)
            } else {
                editor
                    .putInt(StronStepService.KEY_SESSION_SEED, capped)
                    .putString(StronStepService.KEY_SESSION_DATE, today)
                    .remove(StronStepService.KEY_SESSION_RAW)
            }
            editor.commit()
            StronStepService.replaceAccountSteps(capped, today)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("REPLACE_ACCOUNT_STEPS_ERROR", e.message ?: "Unknown error")
        }
    }

    /**
     * Send offset to the service (mirrors sendDataToTask({offset: x})).
     * Called from JS after offset is calculated in seedInitialSteps.
     */
    /**
     * Persist custom notification payload — parity with StepNotificationPayloadStore + sendDataToTask(notifContext).
     * Triggers an immediate notification refresh if the foreground service is running.
     */
    @ReactMethod
    fun updateNotificationPayload(payload: ReadableMap, promise: Promise) {
        try {
            val map = mutableMapOf<String, String>()
            val keys = arrayOf(
                "case", "caseName", "title", "subtitle", "steps", "calories", "distance",
                "cta", "eventEmoji", "colSteps", "colCalories", "colDistance",
            )
            for (key in keys) {
                if (payload.hasKey(key)) {
                    map[key] = payload.getString(key) ?: ""
                }
            }

            // If JS sends a sane step total while native is behind (or holds a boot-leak),
            // adopt the JS value so the shade matches the in-app counter.
            val jsSteps = (map["steps"] ?: "0").replace(",", "").toIntOrNull() ?: 0
            val p = prefs()
            val nativeLocal = p.getInt(StronStepService.KEY_LOCAL_STEPS, 0)
            val editor = p.edit()
            StronNotificationLayout.writePayload(editor, map)
            val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            if (jsSteps in 0..StronStepService.MAX_DAILY_STEPS) {
                if (nativeLocal > StronStepService.MAX_DAILY_STEPS || jsSteps > nativeLocal) {
                    editor
                        .putInt(StronStepService.KEY_LOCAL_STEPS, jsSteps)
                        .putString(StronStepService.KEY_LOCAL_STEPS_DATE, today)
                        .putInt(StronStepService.KEY_DB_STEPS, jsSteps)
                    if (nativeLocal > StronStepService.MAX_DAILY_STEPS) {
                        editor
                            .remove(StronStepService.KEY_HISTORY_PREFIX + today)
                            .remove(StronStepService.KEY_DAILY_OFFSET)
                            .remove(StronStepService.KEY_OFFSET_DATE)
                    }
                    editor.apply()
                    StronStepService.adoptBaselineSteps(jsSteps, today)
                } else {
                    editor.apply()
                }
            } else {
                editor.apply()
            }

            if (StronStepService.hasHealthFgsPermission(reactContext)) {
                val refreshIntent = Intent(reactContext, StronStepService::class.java).apply {
                    action = StronStepService.ACTION_REFRESH_NOTIFICATION
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    reactContext.startForegroundService(refreshIntent)
                } else {
                    reactContext.startService(refreshIntent)
                }
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("UPDATE_NOTIF_PAYLOAD_ERROR", e.message ?: "Unknown error")
        }
    }

    @ReactMethod
    fun sendOffset(offset: Int, offsetDate: String, promise: Promise) {
        try {
            prefs().edit()
                .putInt(StronStepService.KEY_DAILY_OFFSET, offset)
                .putString(StronStepService.KEY_OFFSET_DATE, offsetDate)
                .putLong(StronStepService.KEY_OFFSET_TS_MS, System.currentTimeMillis())
                .apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SEND_OFFSET_ERROR", e.message ?: "Unknown error")
        }
    }

    // ─── Read state ───────────────────────────────────────────────────────────

    /**
     * Read today's step count from the service's SharedPreferences.
     * JS calls this on app resume to sync UI with the service's running count.
     * Mirrors: reading FlutterForegroundTask data / StepProvider.refreshFromPrefs
     */
    @ReactMethod
    fun getCurrentSteps(promise: Promise) {
        try {
            val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val p = prefs()
            val lastSaved = p.getInt(StronStepService.KEY_LAST_READING, 0)
            val session = StronStepService.computeSessionSteps(p, 0, lastSaved)
            if (session >= 0) {
                promise.resolve(session)
                return
            }
            val date = p.getString(StronStepService.KEY_LOCAL_STEPS_DATE, "") ?: ""
            var steps = if (date == today) p.getInt(StronStepService.KEY_LOCAL_STEPS, 0) else 0
            if (steps > StronStepService.MAX_DAILY_STEPS) {
                steps = 0
            }
            promise.resolve(steps.coerceIn(0, StronStepService.MAX_DAILY_STEPS))
        } catch (e: Exception) {
            promise.reject("GET_STEPS_ERROR", e.message ?: "Unknown error")
        }
    }

    /**
     * Wipe poisoned daily step state (offset=0 → ~80k "today" bug).
     * Called from JS when local/native totals exceed the daily sanity cap.
     */
    @ReactMethod
    fun resetDailyStepState(promise: Promise) {
        try {
            val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val editor = prefs().edit()
                .remove(StronStepService.KEY_DAILY_OFFSET)
                .remove(StronStepService.KEY_OFFSET_DATE)
                .remove(StronStepService.KEY_OFFSET_TS_MS)
                .remove(StronStepService.KEY_LAST_READING)
                // History max() was re-inflating the notification after resets
                .remove(StronStepService.KEY_HISTORY_PREFIX + today)
                .putInt(StronStepService.KEY_LOCAL_STEPS, 0)
                .putString(StronStepService.KEY_LOCAL_STEPS_DATE, today)
                .putInt(StronStepService.KEY_DB_STEPS, 0)
            // Rewrite custom notification columns to 0 / 0 kcal / 0 m
            StronNotificationLayout.writeZeroIdlePayload(editor)
            editor.apply()

            // Keep in-memory service fields in sync + force notification redraw
            StronStepService.resetInMemoryDailyState(today)

            // Explicit refresh so the shade updates even if FGS was mid-cycle
            if (StronStepService.hasHealthFgsPermission(reactContext)) {
                val refreshIntent = Intent(reactContext, StronStepService::class.java).apply {
                    action = StronStepService.ACTION_REFRESH_NOTIFICATION
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    reactContext.startForegroundService(refreshIntent)
                } else {
                    reactContext.startService(refreshIntent)
                }
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("RESET_DAILY_STEP_STATE_ERROR", e.message ?: "Unknown error")
        }
    }

    /**
     * Persist JWT tokens for authenticated background sync.
     * Pass empty strings to clear (logout / account switch).
     */
    @ReactMethod
    fun updateAuthTokens(accessToken: String, refreshToken: String, promise: Promise) {
        try {
            val editor = prefs().edit()
            if (accessToken.isNotEmpty()) {
                editor.putString(StronStepService.KEY_ACCESS_TOKEN, accessToken)
            } else {
                editor.remove(StronStepService.KEY_ACCESS_TOKEN)
            }
            if (refreshToken.isNotEmpty()) {
                editor.putString(StronStepService.KEY_REFRESH_TOKEN, refreshToken)
            } else {
                editor.remove(StronStepService.KEY_REFRESH_TOKEN)
            }
            editor.apply()

            // Push into running service memory without waiting for next startService.
            if (StronStepService.hasHealthFgsPermission(reactContext) && StronStepService.isRunning) {
                val intent = Intent(reactContext, StronStepService::class.java).apply {
                    action = StronStepService.ACTION_REFRESH_NOTIFICATION
                    putExtra(StronStepService.EXTRA_ACCESS_TOKEN, accessToken)
                    putExtra(StronStepService.EXTRA_REFRESH_TOKEN, refreshToken)
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    reactContext.startForegroundService(intent)
                } else {
                    reactContext.startService(intent)
                }
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("UPDATE_AUTH_TOKENS_ERROR", e.message ?: "Unknown error")
        }
    }

    /**
     * Clear all user step state on logout or account switch.
     */
    @ReactMethod
    fun clearUserStepState(promise: Promise) {
        try {
            val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val editor = prefs().edit()
                .remove(StronStepService.KEY_USER_ID)
                .remove(StronStepService.KEY_ACCESS_TOKEN)
                .remove(StronStepService.KEY_REFRESH_TOKEN)
                .remove(StronStepService.KEY_DAILY_OFFSET)
                .remove(StronStepService.KEY_OFFSET_DATE)
                .remove(StronStepService.KEY_OFFSET_TS_MS)
                .remove(StronStepService.KEY_LAST_READING)
                .remove(StronStepService.KEY_LOCAL_STEPS)
                .remove(StronStepService.KEY_LOCAL_STEPS_DATE)
                .remove(StronStepService.KEY_DB_STEPS)
                .remove(StronStepService.KEY_HISTORY_PREFIX + today)
            StronStepService.clearSessionAnchor(editor)
            StronNotificationLayout.writeZeroIdlePayload(editor)
            editor.commit()

            StronStepService.resetInMemoryDailyState(today, 0)

            if (StronStepService.hasHealthFgsPermission(reactContext)) {
                val refreshIntent = Intent(reactContext, StronStepService::class.java).apply {
                    action = StronStepService.ACTION_REFRESH_NOTIFICATION
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    reactContext.startForegroundService(refreshIntent)
                } else {
                    reactContext.startService(refreshIntent)
                }
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLEAR_USER_STEP_STATE_ERROR", e.message ?: "Unknown error")
        }
    }

    /**
     * Returns a snapshot of the service's current state for debugging / refresh.
     */
    @ReactMethod
    fun getServiceSnapshot(promise: Promise) {
        try {
            val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val p = prefs()
            val date = p.getString(StronStepService.KEY_LOCAL_STEPS_DATE, "") ?: ""
            // Return RAW localSteps (even if inflated) so JS can detect + wipe corruption.
            val map = Arguments.createMap().apply {
                putInt("localSteps", if (date == today) p.getInt(StronStepService.KEY_LOCAL_STEPS, 0) else 0)
                putString("localStepsDate", date)
                putInt("dbSteps", p.getInt(StronStepService.KEY_DB_STEPS, 0))
                putString("offsetDate", p.getString(StronStepService.KEY_OFFSET_DATE, "") ?: "")
                putBoolean("isRunning", isServiceRunningInternal())
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("SNAPSHOT_ERROR", e.message ?: "Unknown error")
        }
    }

    // ─── Status ───────────────────────────────────────────────────────────────

    @ReactMethod
    fun getElapsedRealtime(promise: Promise) {
        try {
            promise.resolve(android.os.SystemClock.elapsedRealtime().toDouble())
        } catch (e: Exception) {
            promise.reject("GET_ELAPSED_REALTIME_ERROR", e.message ?: "Unknown error")
        }
    }

    @ReactMethod
    fun isServiceRunning(promise: Promise) {
        promise.resolve(isServiceRunningInternal())
    }

    @Suppress("DEPRECATION")
    private fun isServiceRunningInternal(): Boolean {
        return StronStepService.isRunning
    }

    private fun prefs() =
        reactContext.getSharedPreferences(StronStepService.PREFS_NAME, Context.MODE_PRIVATE)

    /**
     * Persist the start config to SharedPreferences without starting the service.
     * Used when we can't start the health foreground service yet (missing runtime
     * permission) so the seeded state is available once the service starts later.
     */
    private fun persistConfig(config: ReadableMap) {
        val editor = prefs().edit()
        config.getString("userId")?.let { editor.putString(StronStepService.KEY_USER_ID, it) }
        config.getString("apiUrl")?.let { editor.putString(StronStepService.KEY_API_URL, it) }
        config.getString("accessToken")?.takeIf { it.isNotEmpty() }?.let {
            editor.putString(StronStepService.KEY_ACCESS_TOKEN, it)
        }
        config.getString("refreshToken")?.takeIf { it.isNotEmpty() }?.let {
            editor.putString(StronStepService.KEY_REFRESH_TOKEN, it)
        }
        if (config.hasKey("dbSteps")) {
            editor.putInt(StronStepService.KEY_DB_STEPS, config.getInt("dbSteps"))
        }
        // Only persist offset when JS also sends a matching offsetDate.
        // Persisting offset=0 with today's date breaks first-reading init.
        if (config.hasKey("dailyOffset") && config.hasKey("offsetDate")) {
            val date = config.getString("offsetDate")
            if (!date.isNullOrEmpty()) {
                editor.putInt(StronStepService.KEY_DAILY_OFFSET, config.getInt("dailyOffset"))
                editor.putString(StronStepService.KEY_OFFSET_DATE, date)
            }
        }
        editor.apply()
    }

    /**
     * Post / refresh the dedicated Step Race Live notification (custom RemoteViews).
     * Independent from the step-tracker FGS notification.
     */
    @ReactMethod
    fun updateRaceLiveNotification(payload: ReadableMap, promise: Promise) {
        try {
            fun str(key: String, fallback: String = ""): String =
                if (payload.hasKey(key)) payload.getString(key) ?: fallback else fallback

            fun intVal(key: String, fallback: Int = 0): Int =
                if (payload.hasKey(key)) payload.getInt(key) else fallback

            val isLeading = str("isLeading", "0") == "1" || str("isLeading", "false") == "true"
            StronRaceLiveNotification.show(
                reactContext,
                StronRaceLiveNotification.Payload(
                    raceTitle = str("raceTitle", "1K STEPS RACE"),
                    leadLabel = str("leadLabel", "YOUR LEAD"),
                    leadDiff = str("leadDiff", "0"),
                    isLeading = isLeading,
                    statusLine = str("statusLine", ""),
                    userStepsLabel = str("userStepsLabel", "0 steps"),
                    opponentName = str("opponentName", "Opponent"),
                    opponentStepsLabel = str("opponentStepsLabel", "0 steps"),
                    youLine = str("youLine", "You · 0"),
                    oppLine = str("oppLine", "Opp · 0"),
                    userProgress = intVal("userProgress", 0),
                    oppProgress = intVal("oppProgress", 0),
                    youAvatarPath = str("youAvatarPath", ""),
                    oppAvatarPath = str("oppAvatarPath", ""),
                    goalLabel = str("goalLabel", "1,000 step goal"),
                    userStepsValue = str("userStepsValue", "0"),
                    oppStepsValue = str("oppStepsValue", "0"),
                ),
            )
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("UPDATE_RACE_NOTIF_ERROR", e.message ?: "Unknown error")
        }
    }

    @ReactMethod
    fun clearRaceLiveNotification(promise: Promise) {
        try {
            StronRaceLiveNotification.clear(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLEAR_RACE_NOTIF_ERROR", e.message ?: "Unknown error")
        }
    }

    /**
     * Persist active race computational state so FGS can POST /api/step-race/update
     * and refresh the race shade after the app is swiped away.
     */
    @ReactMethod
    fun persistActiveRaceState(payload: ReadableMap, promise: Promise) {
        try {
            val json = org.json.JSONObject().apply {
                put("raceId", payload.getString("raceId") ?: "")
                put("startSteps", if (payload.hasKey("startSteps")) payload.getInt("startSteps") else 0)
                put("targetSteps", if (payload.hasKey("targetSteps")) payload.getInt("targetSteps") else 1000)
                put(
                    "opponentPaceSeconds",
                    if (payload.hasKey("opponentPaceSeconds")) payload.getInt("opponentPaceSeconds") else 600,
                )
                put(
                    "startTimeMs",
                    if (payload.hasKey("startTimeMs")) payload.getDouble("startTimeMs").toLong()
                    else System.currentTimeMillis(),
                )
                put("opponentName", payload.getString("opponentName") ?: "Opponent")
                put("youAvatarPath", payload.getString("youAvatarPath") ?: "")
                put("oppAvatarPath", payload.getString("oppAvatarPath") ?: "")
            }
            val existingRaw = StronRaceLiveNotification.readRaceStateJson(reactContext)
            if (!existingRaw.isNullOrBlank()) {
                try {
                    val existing = org.json.JSONObject(existingRaw)
                    if (existing.optString("raceId") == json.optString("raceId")) {
                        val lastPosted = existing.optInt("lastPostedUserSteps", 0)
                        if (lastPosted > 0) json.put("lastPostedUserSteps", lastPosted)
                    }
                } catch (_: Exception) { /* ignore */ }
            }
            if (json.optString("raceId").isBlank()) {
                StronRaceLiveNotification.clearRaceState(reactContext)
            } else {
                StronRaceLiveNotification.persistRaceState(reactContext, json.toString())
            }
            StronStepService.restartSyncTimerIfRunning()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("PERSIST_RACE_STATE_ERROR", e.message ?: "Unknown error")
        }
    }

    @ReactMethod
    fun clearActiveRaceState(promise: Promise) {
        try {
            StronRaceLiveNotification.clearRaceState(reactContext)
            StronStepService.restartSyncTimerIfRunning()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLEAR_RACE_STATE_ERROR", e.message ?: "Unknown error")
        }
    }

    @ReactMethod
    fun updateEventsLiveNotification(payload: ReadableMap, promise: Promise) {
        try {
            val rowsArr = payload.getArray("rows")
            val rows = ArrayList<StronEventLiveNotification.EventRow>()
            if (rowsArr != null) {
                for (i in 0 until rowsArr.size()) {
                    val row = rowsArr.getMap(i) ?: continue
                    fun str(key: String, fallback: String = ""): String =
                        if (row.hasKey(key)) row.getString(key) ?: fallback else fallback
                    fun intVal(key: String, fallback: Int = 0): Int =
                        if (row.hasKey(key)) row.getInt(key) else fallback
                    rows.add(
                        StronEventLiveNotification.EventRow(
                            title = str("title", "Event"),
                            format = str("format", ""),
                            progressLabel = str("progressLabel", ""),
                            progressPercent = intVal("progressPercent", 0),
                            covered = intVal("covered", 0),
                            target = intVal("target", 0),
                            unit = str("unit", "steps"),
                            lastLocalSteps = intVal("lastLocalSteps", 0),
                            eventKey = str("eventKey", ""),
                        ),
                    )
                }
            }
            StronEventLiveNotification.show(reactContext, rows)
            StronStepService.restartSyncTimerIfRunning()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("UPDATE_EVENTS_NOTIF_ERROR", e.message ?: "Unknown error")
        }
    }

    @ReactMethod
    fun clearEventsLiveNotification(promise: Promise) {
        try {
            StronEventLiveNotification.clear(reactContext)
            StronStepService.restartSyncTimerIfRunning()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLEAR_EVENTS_NOTIF_ERROR", e.message ?: "Unknown error")
        }
    }

    /** Rebuild race/event shade from prefs + current local steps (foreground step path). */
    @ReactMethod
    fun refreshLiveNotifications(promise: Promise) {
        try {
            val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val p = prefs()
            val steps = if ((p.getString(StronStepService.KEY_LOCAL_STEPS_DATE, "") ?: "") == today) {
                p.getInt(StronStepService.KEY_LOCAL_STEPS, 0)
            } else {
                p.getInt(StronStepService.KEY_DB_STEPS, 0)
            }
            StronRaceLiveNotification.refreshFromLocalSteps(reactContext, steps)
            StronEventLiveNotification.refreshFromLocalSteps(reactContext, steps)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("REFRESH_LIVE_NOTIFS_ERROR", e.message ?: "Unknown error")
        }
    }
}
