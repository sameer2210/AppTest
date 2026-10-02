package com.stepwars.stepwarsnew_app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.Timer
import java.util.TimerTask
import kotlin.concurrent.thread
import java.util.TimeZone
import java.util.UUID
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import androidx.core.content.ContextCompat

/**
 * StronStepService — Android foreground service that exactly mirrors
 * Flutter's StepTaskHandler + flutter_foreground_task behaviour.
 *
 * Architecture parity with Flutter:
 *  - Uses Sensor.TYPE_STEP_COUNTER (cumulative since boot) — same as Flutter Pedometer.stepCountStream
 *  - Daily offset converts raw sensor reading to today's steps (Flutter: _dailyStepOffset)
 *  - RESET_THRESHOLD=100 reboot detection (Flutter: rebootDetected logic)
 *  - Midnight transition: saves yesterday's steps and resets offset (Flutter: _handleMidnightTransition)
 *  - Periodic server sync every SYNC_INTERVAL_MS (Flutter: _attemptBackgroundSync)
 *  - autoRunOnBoot via StronBootReceiver (Flutter: ForegroundTaskOptions.autoRunOnBoot)
 *  - START_STICKY: OS restarts service if killed (Flutter: foreground service restart)
 *  - SharedPreferences for state (readable by NativeModule bridge from JS)
 */
class StronStepService : Service(), SensorEventListener {

    companion object {
        var isRunning = false
        @Volatile
        private var runningInstance: StronStepService? = null
        const val TAG = "StronStepService"
        const val CHANNEL_ID = "stron_step_counter_channel"
        const val NOTIFICATION_ID = 1001

        /** Called from JS/NativeModule when a since-boot leak is detected. */
        fun resetInMemoryDailyState(today: String, displaySteps: Int = 0) {
            runningInstance?.apply {
                dailyOffset = null
                offsetDate = ""
                lastSavedPedometerReading = 0
                localStepCount = displaySteps.coerceIn(0, MAX_DAILY_STEPS)
                localStepCountDate = today
                lastKnownDbSteps = localStepCount
                userId = null
                try {
                    val editor = prefs().edit()
                    if (localStepCount == 0) {
                        StronNotificationLayout.writeZeroIdlePayload(editor)
                    }
                    editor
                        .putInt(KEY_LOCAL_STEPS, localStepCount)
                        .putString(KEY_LOCAL_STEPS_DATE, today)
                        .putInt(KEY_DB_STEPS, localStepCount)
                        .remove(KEY_HISTORY_PREFIX + today)
                        .remove(KEY_DAILY_OFFSET)
                        .remove(KEY_OFFSET_DATE)
                        .apply()
                    updateNotification(localStepCount)
                } catch (_: Exception) {
                    /* service may not be in foreground yet */
                }
                Log.d(TAG, "In-memory daily step state reset for $today steps=$localStepCount")
            }
        }

        // SharedPreferences file name — used by StronStepModule to read state from JS
        const val PREFS_NAME = "stron_foreground_prefs"
        // ... rest of companion object
        const val KEY_DAILY_OFFSET     = "fg_daily_offset"
        const val KEY_OFFSET_DATE      = "fg_offset_date"
        const val KEY_OFFSET_TS_MS     = "fg_offset_ts_ms"
        const val KEY_LAST_READING     = "fg_last_pedometer_reading"
        const val KEY_LOCAL_STEPS      = "fg_local_steps"
        const val KEY_LOCAL_STEPS_DATE = "fg_local_steps_date"
        const val KEY_DB_STEPS         = "fg_db_steps"
        const val KEY_USER_ID          = "fg_user_id"
        /** Per-login session anchor — steps = seed + max(0, raw - anchor). */
        const val KEY_SESSION_SEED     = "fg_session_seed"
        const val KEY_SESSION_RAW      = "fg_session_raw"
        const val KEY_SESSION_DATE     = "fg_session_date"
        const val KEY_API_URL          = "fg_api_url"
        /** JWT access token for authenticated background sync (set by JS). */
        const val KEY_ACCESS_TOKEN     = "fg_access_token"
        /** JWT refresh token for 401 recovery from FGS (set by JS). */
        const val KEY_REFRESH_TOKEN    = "fg_refresh_token"
        const val KEY_HISTORY_PREFIX   = "fg_history_"  // + date key
        const val KEY_PENDING_DATE     = "fg_pending_past_date"
        const val KEY_PENDING_STEPS    = "fg_pending_past_steps"
        /** JSON array of {date,steps} objects for multi-day offline support. */
        const val KEY_PENDING_QUEUE    = "fg_pending_queue"
        const val KEY_LAST_SYNC_MS     = "fg_last_sync_ms"
        /** SystemClock.elapsedRealtime() at last sensor event — resets on reboot. */
        const val KEY_LAST_ELAPSED_RT  = "fg_last_elapsed_realtime"

        // Mirror Flutter constants
        const val RESET_THRESHOLD    = 100
        /** Hard cap — higher almost always means TYPE_STEP_COUNTER since-boot leak. */
        const val MAX_DAILY_STEPS    = 100_000
        const val SYNC_INTERVAL_MS   = 10L * 60 * 1000  // 10 minutes
        /** Faster sync while a live race or events payload is present. */
        const val SYNC_INTERVAL_LIVE_MS = 90L * 1000  // 1.5 minutes
        /** Throttle for race/event shade refresh on sensor ticks. */
        const val LIVE_SHADE_THROTTLE_MS = 1000L
        /** Opponent clock tick while an active race is persisted. */
        const val RACE_SHADE_INTERVAL_MS = 1000L

        // Intent extras
        const val EXTRA_USER_ID      = "userId"
        const val EXTRA_API_URL      = "apiUrl"
        const val EXTRA_DB_STEPS     = "dbSteps"
        const val EXTRA_DAILY_OFFSET = "dailyOffset"
        const val EXTRA_OFFSET_DATE  = "offsetDate"
        const val EXTRA_ACCESS_TOKEN = "accessToken"
        const val EXTRA_REFRESH_TOKEN = "refreshToken"
        const val ACTION_REFRESH_NOTIFICATION = "com.stepwars.stepwarsnew_app.REFRESH_NOTIFICATION"

        fun restartSyncTimerIfRunning() {
            runningInstance?.forceRestartSyncTimer()
        }

        /** Start/stop the 1s race shade timer when JS persists or clears race state. */
        fun syncRaceShadeTimerIfRunning() {
            runningInstance?.syncRaceShadeTimer()
        }

        /** Session-based today total when anchor is set for today; else -1. */
        fun computeSessionSteps(
            p: SharedPreferences,
            rawReading: Int = 0,
            lastSaved: Int = 0,
        ): Int {
            val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            if (p.getString(KEY_SESSION_DATE, "") != today) return -1
            val seed = if (p.contains(KEY_SESSION_SEED)) p.getInt(KEY_SESSION_SEED, 0) else -1
            val anchor = if (p.contains(KEY_SESSION_RAW)) p.getInt(KEY_SESSION_RAW, 0) else -1
            if (seed < 0 || anchor <= 0) return -1
            val raw = when {
                rawReading > 0 -> rawReading
                lastSaved > 0 -> lastSaved
                else -> anchor
            }
            return (seed + maxOf(0, raw - anchor)).coerceIn(0, MAX_DAILY_STEPS)
        }

        fun writeSessionAnchor(
            editor: SharedPreferences.Editor,
            seed: Int,
            rawAnchor: Int,
            today: String,
        ) {
            editor
                .putInt(KEY_SESSION_SEED, seed.coerceIn(0, MAX_DAILY_STEPS))
                .putInt(KEY_SESSION_RAW, rawAnchor.coerceAtLeast(0))
                .putString(KEY_SESSION_DATE, today)
        }

        fun clearSessionAnchor(editor: SharedPreferences.Editor) {
            editor
                .remove(KEY_SESSION_SEED)
                .remove(KEY_SESSION_RAW)
                .remove(KEY_SESSION_DATE)
        }

        /**
         * Raise in-memory + prefs local/db steps from JS baseline when higher than native.
         * Keeps notification shade in sync with Redux/UI.
         */
        fun adoptBaselineSteps(steps: Int, today: String = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())) {
            val capped = steps.coerceIn(0, MAX_DAILY_STEPS)
            runningInstance?.apply {
                if (capped == 0) {
                    replaceAccountSteps(0, today)
                    return@apply
                }
                lastKnownDbSteps = maxOf(lastKnownDbSteps.coerceIn(0, MAX_DAILY_STEPS), capped)
                val localSameDay = localStepCountDate == today
                val currentLocal = if (localSameDay) localStepCount.coerceIn(0, MAX_DAILY_STEPS) else 0
                if (capped >= currentLocal) {
                    localStepCount = capped
                    localStepCountDate = today
                }
                try {
                    prefs().edit()
                        .putInt(KEY_DB_STEPS, lastKnownDbSteps)
                        .putInt(KEY_LOCAL_STEPS, localStepCount)
                        .putString(KEY_LOCAL_STEPS_DATE, localStepCountDate)
                        .apply()
                    updateNotification(displaySteps())
                } catch (_: Exception) {
                    /* service may not be in foreground yet */
                }
                Log.d(TAG, "Adopted baseline steps=$capped local=$localStepCount db=$lastKnownDbSteps")
            }
        }

        /**
         * Account switch / logout: REPLACE local+db (never max with the previous user)
         * and rebase the sensor offset so today starts at [steps], not the phone total.
         */
        fun replaceAccountSteps(steps: Int, today: String = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())) {
            val seeded = steps.coerceIn(0, MAX_DAILY_STEPS)
            runningInstance?.apply {
                val rebaseRaw = when {
                    rawSteps > 0 -> rawSteps
                    lastSavedPedometerReading > 0 -> lastSavedPedometerReading
                    else -> 0
                }
                localStepCount = seeded
                localStepCountDate = today
                lastKnownDbSteps = seeded
                if (rebaseRaw > seeded) {
                    dailyOffset = rebaseRaw - seeded
                    offsetDate = today
                    lastSavedPedometerReading = rebaseRaw
                } else {
                    dailyOffset = null
                    offsetDate = ""
                }
                try {
                    val editor = prefs().edit()
                        .putInt(KEY_LOCAL_STEPS, seeded)
                        .putString(KEY_LOCAL_STEPS_DATE, today)
                        .putInt(KEY_DB_STEPS, seeded)
                        .remove(KEY_HISTORY_PREFIX + today)
                    if (rebaseRaw > 0) {
                        writeSessionAnchor(editor, seeded, rebaseRaw, today)
                    } else {
                        editor
                            .putInt(KEY_SESSION_SEED, seeded)
                            .putString(KEY_SESSION_DATE, today)
                            .remove(KEY_SESSION_RAW)
                    }
                    if (dailyOffset != null) {
                        editor
                            .putInt(KEY_DAILY_OFFSET, dailyOffset!!)
                            .putString(KEY_OFFSET_DATE, today)
                            .putLong(KEY_OFFSET_TS_MS, System.currentTimeMillis())
                            .putInt(KEY_LAST_READING, rebaseRaw)
                    } else {
                        editor
                            .remove(KEY_DAILY_OFFSET)
                            .remove(KEY_OFFSET_DATE)
                            .remove(KEY_OFFSET_TS_MS)
                    }
                    if (seeded == 0) {
                        StronNotificationLayout.writeZeroIdlePayload(editor)
                    }
                    editor.commit()
                    updateNotification(computeDisplaySteps())
                } catch (_: Exception) {
                    /* service may not be in foreground yet */
                }
                Log.d(TAG, "Replaced account steps=$seeded offset=$dailyOffset raw=$rebaseRaw")
            }
        }

        /**
         * On Android 14+ a foreground service of type `health` can only be started
         * while the app holds at least one of these runtime permissions. Starting it
         * without one throws SecurityException and crashes the whole process.
         */
        val HEALTH_FGS_PERMISSIONS = arrayOf(
            "android.permission.ACTIVITY_RECOGNITION",
            "android.permission.BODY_SENSORS",
            "android.permission.HIGH_SAMPLING_RATE_SENSORS",
        )

        fun hasHealthFgsPermission(context: Context): Boolean {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) return true
            return HEALTH_FGS_PERMISSIONS.any {
                ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED
            }
        }
    }

    // ─── Runtime state ────────────────────────────────────────────────────────

    private var sensorManager: SensorManager? = null
    private var stepSensor: Sensor? = null
    private var syncTimer: Timer? = null
    private var raceShadeHandler: Handler? = null
    private var lastLiveShadeRefreshMs: Long = 0L

    private val raceShadeTick = object : Runnable {
        override fun run() {
            try {
                if (!StronRaceLiveNotification.hasActiveRace(this@StronStepService)) {
                    stopRaceShadeTimer()
                    return
                }
                StronRaceLiveNotification.refreshFromLocalSteps(
                    this@StronStepService,
                    computeDisplaySteps(),
                )
            } catch (e: Exception) {
                Log.w(TAG, "Race shade tick failed: ${e.message}")
            }
            raceShadeHandler?.postDelayed(this, RACE_SHADE_INTERVAL_MS)
        }
    }

    // Mirrors Flutter StepTaskHandler fields
    private var rawSteps: Int = 0
    private var dailyOffset: Int? = null
    private var offsetDate: String = ""
    private var lastSavedPedometerReading: Int = 0
    private var localStepCount: Int = 0
    private var localStepCountDate: String = ""
    private var lastKnownDbSteps: Int = 0
    private var userId: String? = null
    private var apiUrl: String? = null
    private var accessToken: String? = null
    private var refreshToken: String? = null
    /** Last stored elapsedRealtime — drops on reboot. */
    private var lastElapsedRt: Long = 0L

    private val df = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
    private fun todayKey() = df.format(Date())

    /** IANA timezone (e.g. "Asia/Kolkata") for sync payloads. */
    private fun ianaTimezone(): String = TimeZone.getDefault().id
    /** ISO-8601 UTC timestamp for sync payloads. */
    private fun utcTimestamp(): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        sdf.timeZone = TimeZone.getTimeZone("UTC")
        return sdf.format(Date())
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    override fun onCreate() {
        Log.d(TAG, "onCreate entered")
        super.onCreate()
        isRunning = true
        runningInstance = this
        createNotificationChannel()
        // Android kills the process if startForeground() is not called within a few
        // seconds of startForegroundService(). Do it before prefs or sensor work.
        try {
            startForegroundNow(fallbackNotification())
        } catch (e: Exception) {
            Log.e(TAG, "onCreate startForeground failed: ${e.message}")
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                    startForeground(
                        NOTIFICATION_ID,
                        fallbackNotification(),
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_SHORT_SERVICE,
                    )
                }
            } catch (fallback: Exception) {
                Log.e(TAG, "onCreate fallback startForeground failed: ${fallback.message}")
            }
        }
        loadStateFromPrefs()
        // Drop poisoned prefs immediately so UI/notification never read ~80k again
        if (localStepCount > MAX_DAILY_STEPS || lastKnownDbSteps > MAX_DAILY_STEPS) {
            Log.w(TAG, "Clearing poisoned prefs onCreate local=$localStepCount db=$lastKnownDbSteps")
            val today = todayKey()
            dailyOffset = null
            offsetDate = ""
            localStepCount = 0
            localStepCountDate = today
            lastKnownDbSteps = 0
            lastSavedPedometerReading = 0
            val editor = prefs().edit()
                .remove(KEY_DAILY_OFFSET)
                .remove(KEY_OFFSET_DATE)
                .remove(KEY_OFFSET_TS_MS)
                .remove(KEY_HISTORY_PREFIX + today)
                .putInt(KEY_LOCAL_STEPS, 0)
                .putString(KEY_LOCAL_STEPS_DATE, today)
                .putInt(KEY_DB_STEPS, 0)
            StronNotificationLayout.writeZeroIdlePayload(editor)
            editor.apply()
        }
        Log.d(TAG, "Service created. Offset=$dailyOffset offsetDate=$offsetDate localSteps=$localStepCount")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Every startForegroundService() starts a new deadline. startForeground()
        // has to succeed before any return, including a missing health permission.
        // Stopping without it throws ForegroundServiceDidNotStartInTimeException.
        val notification = try {
            buildNotification(displaySteps())
        } catch (e: Exception) {
            Log.e(TAG, "notification build failed: ${e.message}")
            fallbackNotification()
        }
        try {
            if (!startForegroundNow(notification)) {
                stopSelf(startId)
                return START_NOT_STICKY
            }
        } catch (e: Exception) {
            Log.e(TAG, "startForeground failed: ${e.message}")
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                    startForeground(
                        NOTIFICATION_ID,
                        fallbackNotification(),
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_SHORT_SERVICE,
                    )
                    stopForeground(STOP_FOREGROUND_REMOVE)
                }
            } catch (fallback: Exception) {
                Log.e(TAG, "fallback startForeground failed: ${fallback.message}")
            }
            stopSelf(startId)
            return START_NOT_STICKY
        }

        // Always apply extras first so auth-token / dbSteps updates take effect
        // even when the caller only sent ACTION_REFRESH_NOTIFICATION.
        intent?.let { applyIntent(it) }

        if (intent?.action == ACTION_REFRESH_NOTIFICATION) {
            updateNotification(displaySteps())
            return START_STICKY
        }

        // Re-publish after applyIntent so dbSteps seed is visible in the shade.
        updateNotification(displaySteps())

        // Register step sensor
        initStepSensor()

        // Start periodic server sync timer
        startSyncTimer()
        syncRaceShadeTimer()

        Log.d(TAG, "Service started (START_STICKY). userId=$userId")
        // START_STICKY: OS restarts service if killed — mirrors Flutter autoRunOnBoot+restart
        return START_STICKY
    }

    private fun applyIntent(intent: Intent) {
        val prefs = prefs()
        var replaceDbBaseline = false
        intent.getStringExtra(EXTRA_USER_ID)?.let { incomingUid ->
            val previousUid = userId ?: prefs.getString(KEY_USER_ID, null)
            val isAccountSwitch = previousUid == null || previousUid != incomingUid
            if (isAccountSwitch) {
                // Logout / account switch: never keep previous user's local/history totals.
                val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
                val seeded = intent.getIntExtra(EXTRA_DB_STEPS, 0).coerceIn(0, MAX_DAILY_STEPS)
                val rebaseRaw = when {
                    rawSteps > 0 -> rawSteps
                    lastSavedPedometerReading > 0 -> lastSavedPedometerReading
                    else -> 0
                }
                Log.d(TAG, "User switched $previousUid -> $incomingUid; reseeding steps=$seeded raw=$rebaseRaw")
                localStepCount = seeded
                localStepCountDate = today
                lastKnownDbSteps = seeded
                replaceDbBaseline = true
                if (rebaseRaw > seeded) {
                    dailyOffset = rebaseRaw - seeded
                    offsetDate = today
                    lastSavedPedometerReading = rebaseRaw
                } else {
                    dailyOffset = null
                    offsetDate = ""
                    lastSavedPedometerReading = 0
                }
                val editor = prefs.edit()
                    .remove(KEY_HISTORY_PREFIX + today)
                    .putInt(KEY_LOCAL_STEPS, seeded)
                    .putString(KEY_LOCAL_STEPS_DATE, today)
                    .putInt(KEY_DB_STEPS, seeded)
                if (dailyOffset != null) {
                    editor
                        .putInt(KEY_DAILY_OFFSET, dailyOffset!!)
                        .putString(KEY_OFFSET_DATE, today)
                        .putLong(KEY_OFFSET_TS_MS, System.currentTimeMillis())
                        .putInt(KEY_LAST_READING, rebaseRaw)
                } else {
                    editor
                        .remove(KEY_DAILY_OFFSET)
                        .remove(KEY_OFFSET_DATE)
                        .remove(KEY_OFFSET_TS_MS)
                        .remove(KEY_LAST_READING)
                }
                if (seeded == 0) {
                    StronNotificationLayout.writeZeroIdlePayload(editor)
                }
                if (rebaseRaw > 0) {
                    writeSessionAnchor(editor, seeded, rebaseRaw, today)
                } else {
                    editor
                        .putInt(KEY_SESSION_SEED, seeded)
                        .putString(KEY_SESSION_DATE, today)
                        .remove(KEY_SESSION_RAW)
                }
                editor.commit()
                updateNotification(computeDisplaySteps())
            }
            userId = incomingUid
            prefs.edit().putString(KEY_USER_ID, incomingUid).apply()
        }
        intent.getStringExtra(EXTRA_API_URL)?.let {
            apiUrl = it; prefs.edit().putString(KEY_API_URL, it).apply()
        }
        if (intent.hasExtra(EXTRA_ACCESS_TOKEN)) {
            val t = intent.getStringExtra(EXTRA_ACCESS_TOKEN)
            if (t.isNullOrEmpty()) {
                accessToken = null
                prefs.edit().remove(KEY_ACCESS_TOKEN).apply()
            } else {
                accessToken = t
                prefs.edit().putString(KEY_ACCESS_TOKEN, t).apply()
            }
        }
        if (intent.hasExtra(EXTRA_REFRESH_TOKEN)) {
            val t = intent.getStringExtra(EXTRA_REFRESH_TOKEN)
            if (t.isNullOrEmpty()) {
                refreshToken = null
                prefs.edit().remove(KEY_REFRESH_TOKEN).apply()
            } else {
                refreshToken = t
                prefs.edit().putString(KEY_REFRESH_TOKEN, t).apply()
            }
        }
        val newDbSteps = intent.getIntExtra(EXTRA_DB_STEPS, -1)
        if (newDbSteps >= 0) {
            val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val capped = newDbSteps.coerceIn(0, MAX_DAILY_STEPS)
            if (replaceDbBaseline) {
                lastKnownDbSteps = capped
                localStepCount = capped
                localStepCountDate = today
            } else {
                lastKnownDbSteps = maxOf(lastKnownDbSteps.coerceIn(0, MAX_DAILY_STEPS), capped)
                val localSameDay = localStepCountDate == today
                val currentLocal = if (localSameDay) localStepCount.coerceIn(0, MAX_DAILY_STEPS) else 0
                if (capped >= currentLocal) {
                    localStepCount = capped
                    localStepCountDate = today
                }
            }
            prefs.edit()
                .putInt(KEY_DB_STEPS, lastKnownDbSteps)
                .putInt(KEY_LOCAL_STEPS, localStepCount)
                .putString(KEY_LOCAL_STEPS_DATE, localStepCountDate)
                .apply()
            Log.d(TAG, "Received DB steps baseline: $lastKnownDbSteps local=$localStepCount replace=$replaceDbBaseline")
        }
        val newOffset = intent.getIntExtra(EXTRA_DAILY_OFFSET, Int.MIN_VALUE)
        if (newOffset != Int.MIN_VALUE) {
            // Honor JS offsetDate when provided — never invent "today" for a
            // zero/stale offset (that turns since-boot cumulative into "today").
            val incomingDate = intent.getStringExtra(EXTRA_OFFSET_DATE)?.takeIf { it.isNotEmpty() }
            if (incomingDate != null) {
                dailyOffset = newOffset
                offsetDate = incomingDate
                prefs.edit()
                    .putInt(KEY_DAILY_OFFSET, newOffset)
                    .putString(KEY_OFFSET_DATE, offsetDate)
                    .putLong(KEY_OFFSET_TS_MS, System.currentTimeMillis())
                    .apply()
                Log.d(TAG, "Received offset from JS: $newOffset date=$offsetDate")
            } else {
                Log.d(TAG, "Ignoring offset without offsetDate (let sensor init calculate)")
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        Log.d(TAG, "Task removed — flushing sync immediately")
        // Flush sync on a background thread so we don't block the main thread.
        thread {
            try {
                attemptBackgroundSync()
            } catch (e: Exception) {
                Log.e(TAG, "onTaskRemoved sync failed: ${e.message}")
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        if (runningInstance === this) runningInstance = null
        sensorManager?.unregisterListener(this)
        syncTimer?.cancel()
        stopRaceShadeTimer()
        Log.d(TAG, "Service destroyed")
    }

    // ─── Sensor ───────────────────────────────────────────────────────────────

    private fun initStepSensor() {
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        stepSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        if (stepSensor != null) {
            sensorManager?.registerListener(this, stepSensor, SensorManager.SENSOR_DELAY_NORMAL)
            Log.d(TAG, "Step counter sensor registered")
        } else {
            Log.w(TAG, "No TYPE_STEP_COUNTER sensor available on this device")
        }
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event?.sensor?.type != Sensor.TYPE_STEP_COUNTER) return
        val rawReading = event.values[0].toInt()
        handleNewReading(rawReading)
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    // ─── Step computation — mirrors Flutter StepTaskHandler pedometer listener ─

    private fun handleNewReading(rawReading: Int) {
        val today = todayKey()
        Log.d(TAG, "Raw pedometer: $rawReading, offset=$dailyOffset, lastSaved=$lastSavedPedometerReading")

        // Finish session anchor when bind happened before first sensor tick.
        val p = prefs()
        if (p.getString(KEY_SESSION_DATE, "") == today &&
            p.contains(KEY_SESSION_SEED) &&
            !p.contains(KEY_SESSION_RAW) &&
            rawReading > 0
        ) {
            val seed = p.getInt(KEY_SESSION_SEED, 0).coerceIn(0, MAX_DAILY_STEPS)
            dailyOffset = rawReading - seed
            offsetDate = today
            lastSavedPedometerReading = rawReading
            p.edit()
                .putInt(KEY_SESSION_RAW, rawReading)
                .putInt(KEY_DAILY_OFFSET, dailyOffset!!)
                .putString(KEY_OFFSET_DATE, today)
                .putLong(KEY_OFFSET_TS_MS, System.currentTimeMillis())
                .putInt(KEY_LAST_READING, rawReading)
                .apply()
            Log.d(TAG, "Deferred session anchor: seed=$seed raw=$rawReading offset=$dailyOffset")
        }

        // Midnight transition — mirrors Flutter _handleMidnightTransition
        if (offsetDate.isNotEmpty() && offsetDate != today) {
            handleMidnightTransition(today)
        }

        // ── Reboot detection — uses elapsedRealtime (resets on reboot) + heuristic ─
        var rebootDetected = false
        val currentElapsedRt = SystemClock.elapsedRealtime()
        if (lastElapsedRt > 0 && currentElapsedRt < lastElapsedRt) {
            rebootDetected = true
            Log.d(TAG, "Reboot detected via elapsedRealtime: current=$currentElapsedRt < last=$lastElapsedRt")
        }
        // Persist for next comparison
        lastElapsedRt = currentElapsedRt
        prefs().edit().putLong(KEY_LAST_ELAPSED_RT, currentElapsedRt).apply()

        // Fallback heuristic: raw reading dropped significantly
        if (!rebootDetected && lastSavedPedometerReading > RESET_THRESHOLD &&
            rawReading < lastSavedPedometerReading &&
            (lastSavedPedometerReading - rawReading) > RESET_THRESHOLD
        ) {
            rebootDetected = true
            Log.d(TAG, "Reboot detected via lastSaved check: lastSaved=$lastSavedPedometerReading, current=$rawReading")
        }
        if (!rebootDetected) {
            dailyOffset?.let { offset ->
                if (rawReading < offset) {
                    rebootDetected = true
                    Log.d(TAG, "Reboot detected via offset check: rawReading=$rawReading < offset=$offset")
                }
            }
        }
        if (!rebootDetected) {
            val calculatedBeforeReboot = rawReading - (dailyOffset ?: 0)
            if (localStepCount > 0 && calculatedBeforeReboot < (localStepCount - RESET_THRESHOLD)) {
                rebootDetected = true
                Log.d(TAG, "Reboot detected via local count check: calc=$calculatedBeforeReboot < local=$localStepCount")
            }
        }

        // Safe baseline: never use a corrupted DB/local total (since-boot leak ~80k+)
        fun safeBaseline(): Int {
            val db = if (lastKnownDbSteps > MAX_DAILY_STEPS) 0 else lastKnownDbSteps
            val local = if (localStepCount > MAX_DAILY_STEPS) 0 else localStepCount
            return maxOf(0, maxOf(db, local))
        }

        if (rebootDetected) {
            Log.d(TAG, "REBOOT DETECTED! Recalculating offset. lastSaved=$lastSavedPedometerReading current=$rawReading")
            val baseline = safeBaseline()
            val newOffset = rawReading - baseline
            dailyOffset = newOffset
            offsetDate = today
            if (localStepCount > MAX_DAILY_STEPS) {
                localStepCount = 0
                lastKnownDbSteps = 0
            }
            prefs().edit()
                .putInt(KEY_DAILY_OFFSET, newOffset)
                .putString(KEY_OFFSET_DATE, today)
                .putLong(KEY_OFFSET_TS_MS, System.currentTimeMillis())
                .putInt(KEY_LAST_READING, rawReading)
                .putInt(KEY_LOCAL_STEPS, localStepCount.coerceAtMost(MAX_DAILY_STEPS))
                .putInt(KEY_DB_STEPS, lastKnownDbSteps.coerceAtMost(MAX_DAILY_STEPS))
                .apply()
            Log.d(TAG, "New offset after reboot: $newOffset (rawReading=$rawReading - baseline=$baseline)")
        }

        // ── First reading / poisoned offset (0 + large raw = since-boot leak) ──
        val offsetPoisoned =
            dailyOffset == null ||
                offsetDate != today ||
                (dailyOffset == 0 && rawReading > RESET_THRESHOLD) ||
                (dailyOffset != null && rawReading - dailyOffset!! > MAX_DAILY_STEPS)

        if (offsetPoisoned) {
            val p = prefs()
            val hasSession =
                p.getString(KEY_SESSION_DATE, "") == today &&
                    p.contains(KEY_SESSION_SEED) &&
                    p.contains(KEY_SESSION_RAW)
            if (!hasSession) {
            // Always start repaired days at 0 vs current raw — never trust inflated local/db/history.
            val wasInflated =
                (localStepCount > MAX_DAILY_STEPS) ||
                    (lastKnownDbSteps > MAX_DAILY_STEPS) ||
                    (dailyOffset == 0 && rawReading > RESET_THRESHOLD) ||
                    (dailyOffset != null && rawReading - dailyOffset!! > MAX_DAILY_STEPS)

            val baseline = if (wasInflated) 0 else safeBaseline()
            if (wasInflated) {
                localStepCount = 0
                lastKnownDbSteps = 0
            }
            val newOffset = rawReading - baseline
            dailyOffset = newOffset
            offsetDate = today
            localStepCount = baseline
            localStepCountDate = today
            val editor = p.edit()
                .putInt(KEY_DAILY_OFFSET, newOffset)
                .putString(KEY_OFFSET_DATE, today)
                .putLong(KEY_OFFSET_TS_MS, System.currentTimeMillis())
                .putInt(KEY_LAST_READING, rawReading)
                .putInt(KEY_LOCAL_STEPS, baseline)
                .putString(KEY_LOCAL_STEPS_DATE, today)
                .putInt(KEY_DB_STEPS, lastKnownDbSteps)
                // CRITICAL: history max() was re-inflating notification to ~89k after every repair
                .remove(KEY_HISTORY_PREFIX + today)
            if (wasInflated) {
                StronNotificationLayout.writeZeroIdlePayload(editor)
            }
            editor.apply()
            Log.d(TAG, "Calculated INITIAL/REPAIR offset: $rawReading - $baseline = $newOffset inflated=$wasInflated")
            if (wasInflated) {
                updateNotification(0)
            }
            }
        }

        rawSteps = rawReading
        lastSavedPedometerReading = rawReading
        prefs().edit().putInt(KEY_LAST_READING, rawReading).apply()

        val offsetSteps = maxOf(0, rawReading - (dailyOffset ?: rawReading)).coerceAtMost(MAX_DAILY_STEPS)
        val sessionSteps = computeSessionSteps(prefs(), rawReading, lastSavedPedometerReading)
        val steps = if (sessionSteps >= 0) sessionSteps else offsetSteps
        updateAndSaveLocalSteps(steps, today)
    }

    // ─── Midnight transition — mirrors Flutter _handleMidnightTransition ──────

    private fun addDaysToKey(key: String, delta: Int): String {
        return try {
            val cal = Calendar.getInstance()
            cal.time = df.parse(key) ?: return key
            cal.add(Calendar.DAY_OF_YEAR, delta)
            df.format(cal.time)
        } catch (_: Exception) {
            key
        }
    }

    private fun enumerateDateKeys(fromKey: String, toKey: String): List<String> {
        if (fromKey.isEmpty() || toKey.isEmpty() || fromKey > toKey) return emptyList()
        val keys = mutableListOf<String>()
        var cursor = fromKey
        while (cursor <= toKey) {
            keys.add(cursor)
            cursor = addDaysToKey(cursor, 1)
        }
        return keys
    }

    private fun handleMidnightTransition(today: String) {
        Log.d(TAG, "MIDNIGHT TRANSITION: $offsetDate -> $today")
        val yesterdayKey = addDaysToKey(today, -1)
        val datesToClose = enumerateDateKeys(offsetDate, yesterdayKey)
        if (datesToClose.isEmpty()) {
            Log.w(TAG, "No dates to close for midnight transition")
            return
        }

        val useSensorForLastDay =
            datesToClose.size == 1 && datesToClose[0] == yesterdayKey

        for (date in datesToClose) {
            val steps = when {
                useSensorForLastDay && date == yesterdayKey ->
                    maxOf(0, rawSteps - (dailyOffset ?: 0))
                else -> {
                    val hist = prefs().getInt(KEY_HISTORY_PREFIX + date, 0)
                    if (hist > 0) hist else 0
                }
            }
            if (steps > 0) {
                prefs().edit().putInt(KEY_HISTORY_PREFIX + date, steps).apply()
                enqueuePendingSync(date, steps)
            }
        }

        // Reset for new day
        val newOffset = rawSteps
        dailyOffset = newOffset
        offsetDate = today
        localStepCount = 0
        localStepCountDate = today
        lastKnownDbSteps = 0

        prefs().edit()
            .putInt(KEY_DAILY_OFFSET, newOffset)
            .putString(KEY_OFFSET_DATE, today)
            .putLong(KEY_OFFSET_TS_MS, System.currentTimeMillis())
            .putInt(KEY_LOCAL_STEPS, 0)
            .putString(KEY_LOCAL_STEPS_DATE, today)
            .putInt(KEY_DB_STEPS, 0)
            .apply()
        Log.d(TAG, "New day offset set: $newOffset")
    }

    /** Add a past-date entry to the pending sync queue (JSON array in prefs). */
    private fun enqueuePendingSync(date: String, steps: Int) {
        val p = prefs()
        val queueJson = p.getString(KEY_PENDING_QUEUE, "[]") ?: "[]"
        val queue = try { JSONArray(queueJson) } catch (_: Exception) { JSONArray() }
        // Prevent duplicates for the same date — update if exists
        var found = false
        for (i in 0 until queue.length()) {
            val entry = queue.optJSONObject(i) ?: continue
            if (entry.optString("date") == date) {
                entry.put("steps", maxOf(steps, entry.optInt("steps", 0)))
                found = true
                break
            }
        }
        if (!found) {
            queue.put(JSONObject().put("date", date).put("steps", steps))
        }
        // Cap queue to 14 days to prevent unbounded growth
        while (queue.length() > 14) queue.remove(0)
        p.edit().putString(KEY_PENDING_QUEUE, queue.toString()).apply()
        Log.d(TAG, "Enqueued pending sync: date=$date steps=$steps queueSize=${queue.length()}")
    }

    // ─── Local step persistence ────────────────────────────────────────────────

    private fun updateAndSaveLocalSteps(steps: Int, date: String) {
        // History wins — but never let a since-boot leak in history re-inflate today
        val historicalSteps = prefs().getInt(KEY_HISTORY_PREFIX + date, 0)
        val safeHistory = if (historicalSteps > MAX_DAILY_STEPS) 0 else historicalSteps
        if (historicalSteps > MAX_DAILY_STEPS) {
            prefs().edit().remove(KEY_HISTORY_PREFIX + date).apply()
        }
        val safeSteps = steps.coerceIn(0, MAX_DAILY_STEPS)
        val toSave = maxOf(safeSteps, safeHistory)

        if (toSave != localStepCount || date != localStepCountDate) {
            localStepCount = toSave
            localStepCountDate = date
            prefs().edit()
                .putInt(KEY_LOCAL_STEPS, toSave)
                .putString(KEY_LOCAL_STEPS_DATE, date)
                .apply()
            if (toSave > safeHistory) {
                prefs().edit().putInt(KEY_HISTORY_PREFIX + date, toSave).apply()
            }
            Log.d(TAG, "Local steps updated: $toSave for $date")
            updateNotification(toSave)
            maybeRefreshLiveShades(computeDisplaySteps())
        }
    }

    // ─── Notification ─────────────────────────────────────────────────────────

    /** Best known today total for shade + sync — session anchor when set, else local only. */
    private fun computeDisplaySteps(): Int {
        val session = computeSessionSteps(prefs(), rawSteps, lastSavedPedometerReading)
        if (session >= 0) return session
        val today = todayKey()
        return if (localStepCountDate == today) localStepCount.coerceIn(0, MAX_DAILY_STEPS) else 0
    }

    private fun displaySteps(): Int = computeDisplaySteps()

    /**
     * @return true when the health foreground service should keep running.
     * Throws if startForeground itself is rejected so the caller can post a
     * shortService notification before stopping.
     */
    private fun startForegroundNow(notification: Notification): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            if (hasHealthFgsPermission(this)) {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH,
                )
                return true
            }
            Log.w(TAG, "Missing health FGS runtime permission — posting short notification then stopping")
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SHORT_SERVICE,
            )
            stopForeground(STOP_FOREGROUND_REMOVE)
            return false
        }
        startForeground(NOTIFICATION_ID, notification)
        return true
    }

    private fun fallbackNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentTitle("STRON Tracker")
            .setContentText("Counting steps")
            .setOngoing(true)
            .setSilent(true)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Step Counter",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows your current step count while tracking is active"
                setShowBadge(false)
                enableVibration(false)
                setSound(null, null)
            }
            (getSystemService(NotificationManager::class.java)).createNotificationChannel(channel)
        }
    }

    private fun buildNotification(steps: Int): Notification {
        // Cap — never paint a since-boot leak into the shade.
        val safeSteps = steps.coerceIn(0, MAX_DAILY_STEPS)

        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(getNotificationIcon())
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setColor(0xFF086CFF.toInt())
        // No largeIcon — DecoratedCustomViewStyle would pin a second logo on the right.

        val storedPayload = StronNotificationLayout.readPayload(prefs())
        val payload = StronNotificationLayout.patchLiveSteps(
            storedPayload ?: StronNotificationLayout.defaultIdlePayload(safeSteps),
            safeSteps,
        )
        val title = when {
            payload.caseName.isBlank() || payload.caseName == "idle" ->
                payload.title.ifBlank { "STRON Tracker" }
            payload.title.isNotBlank() -> payload.title
            else -> "STRON Tracker"
        }
        val summary = StronNotificationLayout.collapsedSummary(payload)
        builder
            .setContentTitle(title)
            .setContentText(summary)
            .setStyle(androidx.core.app.NotificationCompat.DecoratedCustomViewStyle())
        try {
            val remoteViews = StronNotificationLayout.buildRemoteViews(this, payload)
            builder
                .setCustomContentView(remoteViews)
                .setCustomBigContentView(remoteViews)
        } catch (e: Exception) {
            Log.e(TAG, "custom notification views failed: ${e.message}")
            builder.setStyle(
                androidx.core.app.NotificationCompat.BigTextStyle().bigText(summary),
            )
        }

        return builder.build()
    }

    private fun getNotificationIcon(): Int {
        val vectorRes = resources.getIdentifier("notification_icon", "drawable", packageName)
        if (vectorRes != 0) return vectorRes
        return android.R.drawable.ic_menu_mylocation
    }

    private fun updateNotification(steps: Int) {
        val manager = getSystemService(NotificationManager::class.java)
        manager.notify(NOTIFICATION_ID, buildNotification(steps))
    }

    /** Throttled race/event shade refresh so sensor bursts don't spam NotificationManager. */
    private fun maybeRefreshLiveShades(steps: Int) {
        val now = SystemClock.elapsedRealtime()
        if (now - lastLiveShadeRefreshMs < LIVE_SHADE_THROTTLE_MS) return
        lastLiveShadeRefreshMs = now
        try {
            StronRaceLiveNotification.refreshFromLocalSteps(this, steps)
            StronEventLiveNotification.refreshFromLocalSteps(this, steps)
        } catch (e: Exception) {
            Log.w(TAG, "Live shade refresh failed: ${e.message}")
        }
    }

    /** 1s opponent-clock refresh while race state is present (no API POST). */
    private fun syncRaceShadeTimer() {
        if (StronRaceLiveNotification.hasActiveRace(this)) {
            startRaceShadeTimer()
        } else {
            stopRaceShadeTimer()
        }
    }

    private fun startRaceShadeTimer() {
        val handler = raceShadeHandler ?: Handler(Looper.getMainLooper()).also { raceShadeHandler = it }
        handler.removeCallbacks(raceShadeTick)
        handler.post(raceShadeTick)
        Log.d(TAG, "Race shade timer started")
    }

    private fun stopRaceShadeTimer() {
        raceShadeHandler?.removeCallbacks(raceShadeTick)
        Log.d(TAG, "Race shade timer stopped")
    }

    // ─── Server sync — mirrors Flutter _attemptBackgroundSync ─────────────────

    private fun startSyncTimer() {
        val interval = currentSyncIntervalMs()
        syncTimer?.cancel()
        syncTimer = Timer()
        syncTimer?.scheduleAtFixedRate(object : TimerTask() {
            override fun run() { attemptBackgroundSync() }
        }, interval, interval)
        Log.d(TAG, "Sync timer started interval=${interval}ms")
        syncRaceShadeTimer()
    }

    private fun forceRestartSyncTimer() {
        startSyncTimer()
    }

    private fun currentSyncIntervalMs(): Long {
        val live = StronRaceLiveNotification.hasActiveRace(this) ||
            StronEventLiveNotification.hasActivePayload(this)
        return if (live) SYNC_INTERVAL_LIVE_MS else SYNC_INTERVAL_MS
    }

    private fun attemptBackgroundSync() {
        val p = prefs()
        // ── Flush legacy single-slot pending (migration from old format) ─────
        val pendingDate = p.getString(KEY_PENDING_DATE, null)
        val pendingSteps = if (p.contains(KEY_PENDING_STEPS)) p.getInt(KEY_PENDING_STEPS, 0) else null
        if (pendingDate != null && pendingSteps != null) {
            if (syncPastSteps(pendingDate, pendingSteps)) {
                p.edit().remove(KEY_PENDING_DATE).remove(KEY_PENDING_STEPS).apply()
            }
        }
        // ── Flush pending queue (multi-day offline support) ──────────────────
        val queueJson = p.getString(KEY_PENDING_QUEUE, null)
        if (queueJson != null) {
            try {
                val queue = JSONArray(queueJson)
                val remaining = JSONArray()
                for (i in 0 until queue.length()) {
                    val entry = queue.optJSONObject(i) ?: continue
                    val date = entry.optString("date", "") 
                    val steps = entry.optInt("steps", 0)
                    if (date.isNotEmpty() && steps > 0) {
                        if (!syncPastSteps(date, steps)) {
                            remaining.put(entry) // Keep for next attempt
                        }
                    }
                }
                if (remaining.length() == 0) {
                    p.edit().remove(KEY_PENDING_QUEUE).apply()
                } else {
                    p.edit().putString(KEY_PENDING_QUEUE, remaining.toString()).apply()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Pending queue flush error: ${e.message}")
            }
        }
        // Sync current steps synchronously so managed-event hooks finish before shade refresh.
        syncCurrentStepsBlocking(computeDisplaySteps())
        // Native race progress update when JS is not running
        updateActiveRaceProgress(computeDisplaySteps())
        // Refresh live shade cards from prefs + local steps
        try {
            val shown = computeDisplaySteps()
            StronRaceLiveNotification.refreshFromLocalSteps(this, shown)
            StronEventLiveNotification.refreshFromLocalSteps(this, shown)
        } catch (e: Exception) {
            Log.w(TAG, "Live notif refresh failed: ${e.message}")
        }
        p.edit().putLong(KEY_LAST_SYNC_MS, System.currentTimeMillis()).apply()
    }

    /** POST /api/step-race/update using persisted race state + local steps. */
    private fun updateActiveRaceProgress(todaySteps: Int) {
        val stateRaw = StronRaceLiveNotification.readRaceStateJson(this) ?: return
        try {
            val state = JSONObject(stateRaw)
            val raceId = state.optString("raceId", "")
            if (raceId.isBlank()) return
            val startSteps = state.optInt("startSteps", 0)
            val targetSteps = state.optInt("targetSteps", 1000).coerceAtLeast(1)
            val startTimeMs = state.optLong("startTimeMs", System.currentTimeMillis())
            val walked = minOf(targetSteps, maxOf(0, todaySteps - startSteps))
            val lastPosted = state.optInt("lastPostedUserSteps", 0)
            val userSteps = maxOf(lastPosted, walked)
            val userTimeSeconds = maxOf(0, ((System.currentTimeMillis() - startTimeMs) / 1000L).toInt())
            val body = JSONObject().apply {
                put("raceId", raceId)
                put("userSteps", userSteps)
                put("userTimeSeconds", userTimeSeconds)
            }
            val code = postAuthenticated("/api/step-race/update", body)
            if (code == 200) {
                Log.d(TAG, "Updated race $raceId steps=$userSteps")
                if (userSteps > lastPosted) {
                    state.put("lastPostedUserSteps", userSteps)
                    StronRaceLiveNotification.persistRaceState(this, state.toString())
                }
                if (userSteps >= targetSteps) {
                    // Race finished — clear native state; JS will clear shade on next open
                    StronRaceLiveNotification.clearRaceState(this)
                    syncRaceShadeTimer()
                }
            } else if (code == 400) {
                Log.w(TAG, "step-race/update race not active — clearing native race state")
                StronRaceLiveNotification.clearRaceState(this)
                syncRaceShadeTimer()
            } else {
                Log.w(TAG, "step-race/update failed: HTTP $code")
            }
        } catch (e: Exception) {
            Log.e(TAG, "updateActiveRaceProgress error: ${e.message}")
        }
    }

    /** Prefer in-memory token; fall back to prefs (JS may update prefs while FGS runs). */
    private fun currentAccessToken(): String? =
        accessToken?.takeIf { it.isNotEmpty() }
            ?: prefs().getString(KEY_ACCESS_TOKEN, null)?.takeIf { it.isNotEmpty() }

    private fun currentRefreshToken(): String? =
        refreshToken?.takeIf { it.isNotEmpty() }
            ?: prefs().getString(KEY_REFRESH_TOKEN, null)?.takeIf { it.isNotEmpty() }

    private fun persistTokens(access: String?, refresh: String?) {
        accessToken = access?.takeIf { it.isNotEmpty() }
        refreshToken = refresh?.takeIf { it.isNotEmpty() }
        val editor = prefs().edit()
        if (accessToken != null) editor.putString(KEY_ACCESS_TOKEN, accessToken)
        else editor.remove(KEY_ACCESS_TOKEN)
        if (refreshToken != null) editor.putString(KEY_REFRESH_TOKEN, refreshToken)
        else editor.remove(KEY_REFRESH_TOKEN)
        editor.apply()
    }

    /**
     * Exchange refresh token for a new access token. Updates prefs so subsequent syncs work.
     */
    private fun refreshAccessToken(): Boolean {
        val url = apiUrl ?: prefs().getString(KEY_API_URL, null) ?: return false
        val rt = currentRefreshToken() ?: return false
        return try {
            val conn = URL("$url/api/auth/refresh").openConnection() as HttpURLConnection
            conn.apply {
                requestMethod = "POST"
                setRequestProperty("Content-Type", "application/json")
                connectTimeout = 10_000
                readTimeout = 10_000
                doOutput = true
            }
            val body = JSONObject().apply { put("refreshToken", rt) }.toString()
            conn.outputStream.bufferedWriter().use { it.write(body) }
            val code = conn.responseCode
            val responseText = try {
                (if (code in 200..299) conn.inputStream else conn.errorStream)
                    ?.bufferedReader()?.use { it.readText() }
            } catch (_: Exception) {
                null
            }
            conn.disconnect()
            if (code != 200 || responseText.isNullOrEmpty()) {
                Log.w(TAG, "Token refresh failed: HTTP $code")
                return false
            }
            val json = JSONObject(responseText)
            val newAccess = json.optString("accessToken", "")
            if (newAccess.isEmpty()) return false
            val newRefresh = json.optString("refreshToken", "").ifEmpty { rt }
            persistTokens(newAccess, newRefresh)
            Log.d(TAG, "Access token refreshed for FGS sync")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Token refresh error: ${e.message}")
            false
        }
    }

    /**
     * Authenticated POST. On 401, refresh once and retry.
     * @return HTTP status, or -1 on network/config failure
     */
    private fun postAuthenticated(path: String, body: JSONObject, allowRefresh: Boolean = true): Int {
        val url = apiUrl ?: prefs().getString(KEY_API_URL, null) ?: return -1
        val token = currentAccessToken()
        if (token.isNullOrEmpty()) {
            Log.w(TAG, "No access token for $path — skip sync (JS must push tokens)")
            return 401
        }
        return try {
            val conn = URL("$url$path").openConnection() as HttpURLConnection
            conn.apply {
                requestMethod = "POST"
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Authorization", "Bearer $token")
                connectTimeout = 10_000
                readTimeout = 10_000
                doOutput = true
            }
            conn.outputStream.bufferedWriter().use { it.write(body.toString()) }
            val code = conn.responseCode
            // Drain stream so connection can be reused / closed cleanly
            try {
                (if (code in 200..299) conn.inputStream else conn.errorStream)
                    ?.bufferedReader()?.use { it.readText() }
            } catch (_: Exception) { /* ignore */ }
            conn.disconnect()
            if (code == 401 && allowRefresh && refreshAccessToken()) {
                return postAuthenticated(path, body, allowRefresh = false)
            }
            code
        } catch (e: Exception) {
            Log.e(TAG, "POST $path error: ${e.message}")
            -1
        }
    }

    private fun syncCurrentSteps(steps: Int) {
        thread {
            syncCurrentStepsBlocking(steps)
        }
    }

    /** Blocking sync used by timer / onTaskRemoved so race/event refresh sees server apply. */
    private fun syncCurrentStepsBlocking(steps: Int): Boolean {
        val uid = userId ?: prefs().getString(KEY_USER_ID, null) ?: return false
        return try {
            val body = JSONObject().apply {
                put("uid", uid)
                put("todaysStepCount", steps)
                put("localDate", todayKey())
                put("utcTimestamp", utcTimestamp())
                put("timezone", ianaTimezone())
                put("source", "foreground_service")
            }
            val code = postAuthenticated("/api/user/sync-steps", body)
            if (code == 200) {
                lastKnownDbSteps = steps
                prefs().edit().putInt(KEY_DB_STEPS, steps).apply()
                Log.d(TAG, "Synced $steps steps to server")
                true
            } else {
                Log.w(TAG, "sync-steps failed: HTTP $code")
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Sync error: ${e.message}")
            false
        }
    }

    private fun syncPastSteps(date: String, steps: Int): Boolean {
        val uid = userId ?: prefs().getString(KEY_USER_ID, null) ?: return false
        return try {
            val body = JSONObject().apply {
                put("uid", uid)
                put("date", date)
                put("steps", steps)
                put("timezone", ianaTimezone())
                put("utcTimestamp", utcTimestamp())
                put("source", "midnight_transition")
            }
            val code = postAuthenticated("/api/user/sync-past-steps", body)
            if (code != 200) {
                Log.w(TAG, "sync-past-steps failed: HTTP $code")
            }
            code == 200
        } catch (e: Exception) {
            Log.e(TAG, "Past-steps sync error: ${e.message}")
            false
        }
    }

    // ─── SharedPreferences ────────────────────────────────────────────────────

    private fun prefs(): SharedPreferences =
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private fun loadStateFromPrefs() {
        val p = prefs()
        val today = todayKey()

        dailyOffset = if (p.contains(KEY_DAILY_OFFSET)) p.getInt(KEY_DAILY_OFFSET, 0) else null
        offsetDate  = p.getString(KEY_OFFSET_DATE, "") ?: ""
        lastSavedPedometerReading = p.getInt(KEY_LAST_READING, 0)
        lastKnownDbSteps = p.getInt(KEY_DB_STEPS, 0)
        lastElapsedRt    = p.getLong(KEY_LAST_ELAPSED_RT, 0L)
        userId  = p.getString(KEY_USER_ID, null)
        apiUrl  = p.getString(KEY_API_URL, null)
        accessToken = p.getString(KEY_ACCESS_TOKEN, null)
        refreshToken = p.getString(KEY_REFRESH_TOKEN, null)

        val savedDate = p.getString(KEY_LOCAL_STEPS_DATE, "") ?: ""
        if (savedDate == today) {
            localStepCount = p.getInt(KEY_LOCAL_STEPS, 0)
            localStepCountDate = today
        } else {
            localStepCount = 0
            localStepCountDate = today
        }

        // Validate stored offset date — if yesterday's, trigger midnight transition on first reading
        if (offsetDate.isNotEmpty() && offsetDate != today) {
            Log.d(TAG, "Offset date $offsetDate != today $today — will transition on first reading")
        }

        Log.d(TAG, "State loaded: offset=$dailyOffset offsetDate=$offsetDate localSteps=$localStepCount userId=$userId")
    }
}
