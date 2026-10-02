package com.stepwars.stepwarsnew_app

import android.content.Context
import android.content.SharedPreferences
import android.view.View
import android.widget.RemoteViews
import java.text.NumberFormat
import java.util.Locale
import kotlin.math.roundToInt

/**
 * Custom step-counter notification layouts — parity with Flutter StronNotificationLayout.
 */
object StronNotificationLayout {
    private const val KEY_CASE = "stron_notif_case"
    private const val KEY_STEPS = "stron_notif_steps"
    private const val KEY_CALORIES = "stron_notif_calories"
    private const val KEY_DISTANCE = "stron_notif_distance"
    private const val KEY_TITLE = "stron_notif_title"
    private const val KEY_SUBTITLE = "stron_notif_subtitle"
    private const val KEY_CTA = "stron_notif_cta"
    private const val KEY_EVENT_EMOJI = "stron_notif_event_emoji"
    private const val KEY_COL_STEPS = "stron_notif_col_steps"
    private const val KEY_COL_CALORIES = "stron_notif_col_calories"
    private const val KEY_COL_DISTANCE = "stron_notif_col_distance"

    private const val DISTANCE_KM_PER_STEP = 0.00075
    private const val CALORIES_PER_STEP = 0.04

    data class Payload(
        val caseName: String,
        val steps: String,
        val calories: String,
        val distance: String,
        val title: String,
        val subtitle: String,
        val cta: String,
        val eventEmoji: String,
        val colSteps: String,
        val colCalories: String,
        val colDistance: String,
    )

    fun defaultIdlePayload(steps: Int = 0): Payload {
        val safe = steps.coerceIn(0, StronStepService.MAX_DAILY_STEPS)
        val formatted = NumberFormat.getInstance(Locale.US).format(safe)
        val distance = formatKm(safe * DISTANCE_KM_PER_STEP)
        return Payload(
            caseName = "idle",
            steps = formatted,
            calories = "0",
            distance = distance,
            title = "STRON Tracker",
            subtitle = "👣 $formatted   🔥 0 Days   📍 $distance",
            cta = "",
            eventEmoji = "🏃",
            colSteps = "👣 $formatted",
            colCalories = "🔥 0 Days",
            colDistance = "📍 $distance",
        )
    }

    fun collapsedSummary(payload: Payload): String {
        val steps = payload.colSteps.ifBlank { "👣 ${payload.steps.ifBlank { "0" }}" }
        val mid = payload.colCalories.ifBlank { "🔥 0 Days" }
        val dist = normalizeDistanceLabel(payload.colDistance.ifBlank { "📍 0 m" })
        return "$steps   $mid   $dist"
    }

    fun readPayload(prefs: android.content.SharedPreferences): Payload? {
        val rawCase = prefs.getString(KEY_CASE, null) ?: return null
        val fallback = defaultIdlePayload(0)
        return Payload(
            caseName = rawCase.ifBlank { "idle" },
            steps = prefs.getString(KEY_STEPS, null)?.ifBlank { null } ?: fallback.steps,
            calories = prefs.getString(KEY_CALORIES, null)?.ifBlank { null } ?: fallback.calories,
            distance = prefs.getString(KEY_DISTANCE, null)?.ifBlank { null } ?: fallback.distance,
            title = prefs.getString(KEY_TITLE, null)?.ifBlank { null } ?: fallback.title,
            subtitle = prefs.getString(KEY_SUBTITLE, null)?.ifBlank { null } ?: fallback.subtitle,
            cta = prefs.getString(KEY_CTA, "") ?: "",
            eventEmoji = prefs.getString(KEY_EVENT_EMOJI, null)?.ifBlank { null } ?: fallback.eventEmoji,
            colSteps = prefs.getString(KEY_COL_STEPS, null)?.ifBlank { null } ?: fallback.colSteps,
            colCalories = prefs.getString(KEY_COL_CALORIES, null)?.ifBlank { null } ?: fallback.colCalories,
            colDistance = prefs.getString(KEY_COL_DISTANCE, null)?.ifBlank { null } ?: fallback.colDistance,
        )
    }

    fun writePayload(
        editor: SharedPreferences.Editor,
        payload: Map<String, String>,
    ) {
        val caseName = (payload["case"] ?: payload["caseName"] ?: "idle").ifBlank { "idle" }
        val fallback = defaultIdlePayload(
            (payload["steps"] ?: "0").replace(",", "").toIntOrNull() ?: 0,
        )
        fun put(key: String, value: String?, default: String) {
            editor.putString(key, value?.ifBlank { null } ?: default)
        }
        editor.putString(KEY_CASE, caseName)
        put(KEY_STEPS, payload["steps"], fallback.steps)
        put(KEY_CALORIES, payload["calories"], fallback.calories)
        put(KEY_DISTANCE, payload["distance"], fallback.distance)
        put(KEY_TITLE, payload["title"], fallback.title)
        put(KEY_SUBTITLE, payload["subtitle"], fallback.subtitle)
        editor.putString(KEY_CTA, payload["cta"] ?: "")
        put(KEY_EVENT_EMOJI, payload["eventEmoji"], fallback.eventEmoji)
        put(KEY_COL_STEPS, payload["colSteps"], fallback.colSteps)
        put(KEY_COL_CALORIES, payload["colCalories"], fallback.colCalories)
        put(KEY_COL_DISTANCE, payload["colDistance"], fallback.colDistance)
    }

    /** Zeroed idle payload — used after since-boot leak cleanup / account switch. */
    fun writeZeroIdlePayload(editor: SharedPreferences.Editor) {
        val zero = defaultIdlePayload(0)
        writePayload(
            editor,
            mapOf(
                "case" to zero.caseName,
                "steps" to zero.steps,
                "calories" to zero.calories,
                "distance" to zero.distance,
                "title" to zero.title,
                "subtitle" to zero.subtitle,
                "cta" to zero.cta,
                "eventEmoji" to zero.eventEmoji,
                "colSteps" to zero.colSteps,
                "colCalories" to zero.colCalories,
                "colDistance" to zero.colDistance,
            ),
        )
    }

    fun patchLiveSteps(payload: Payload, steps: Int): Payload {
        // Trust the current display reading — do not ratchet up from a stale payload.
        val effectiveSteps = steps.coerceIn(0, StronStepService.MAX_DAILY_STEPS)
        val effectiveFormatted = NumberFormat.getInstance(Locale.US).format(effectiveSteps)
        val effectiveDistance = formatKm(effectiveSteps * DISTANCE_KM_PER_STEP)

        // Idle notification middle column is STREAK (set by JS) — don't overwrite with calories.
        if (payload.caseName.isBlank() || payload.caseName == "idle") {
            return payload.copy(
                steps = effectiveFormatted,
                distance = effectiveDistance,
                colSteps = "👣 $effectiveFormatted",
                colDistance = "📍 $effectiveDistance",
            )
        }

        val calories = (effectiveSteps * CALORIES_PER_STEP).roundToInt()
        val formattedCalories = NumberFormat.getInstance(Locale.US).format(calories)
        return payload.copy(
            steps = effectiveFormatted,
            calories = formattedCalories,
            distance = effectiveDistance,
            colSteps = "👣 $effectiveFormatted",
            colCalories = "🔥 $formattedCalories",
            colDistance = "📍 $effectiveDistance",
        )
    }

    private fun formatKm(km: Double): String {
        return if (km < 1.0) {
            "${(km * 1000).roundToInt()} m"
        } else {
            // Always use '.' decimal separator (never locale comma).
            String.format(Locale.US, "%.1f km", km)
        }
    }

    /** Harden against older payloads that stored "14,2 km". */
    private fun normalizeDistanceLabel(value: String): String =
        value.replace(',', '.')

    fun buildRemoteViews(context: Context, payload: Payload): RemoteViews {
        return if (payload.caseName.isBlank() || payload.caseName == "idle") {
            buildIdleViews(context, payload)
        } else {
            buildEventViews(context, payload)
        }
    }

    private fun buildIdleViews(context: Context, payload: Payload): RemoteViews {
        val fallback = defaultIdlePayload(payload.steps.replace(",", "").toIntOrNull() ?: 0)
        val views = RemoteViews(context.packageName, R.layout.notification_stron_idle)
        
        val stepCount = payload.steps.ifBlank { fallback.steps }
        views.setTextViewText(R.id.stron_col_steps, stepCount)
        
        val title = if (payload.title.isNotBlank() && payload.title != "STRON Tracker") {
            payload.title
        } else {
            "STRON Tracker"
        }
        views.setTextViewText(R.id.stron_notif_title, title)

        val isProTheme = payload.caseName.contains("pro", ignoreCase = true) ||
            title.contains("pro", ignoreCase = true)

        if (isProTheme) {
            views.setInt(R.id.stron_steps_block, "setBackgroundResource", R.drawable.notification_stron_left_dark)
            views.setInt(R.id.stron_content_block, "setBackgroundResource", R.drawable.notification_stron_right_blue)
            views.setTextColor(R.id.stron_steps_header, 0xFF8E8E93.toInt())
            views.setTextColor(R.id.stron_notif_subtitle, 0xFFC3DCFF.toInt())
        } else {
            views.setInt(R.id.stron_steps_block, "setBackgroundResource", R.drawable.notification_stron_left_blue)
            views.setInt(R.id.stron_content_block, "setBackgroundResource", R.drawable.notification_stron_right_dark)
            views.setTextColor(R.id.stron_steps_header, 0xE6FFFFFF.toInt())
            views.setTextColor(R.id.stron_notif_subtitle, 0xFF4FA0FF.toInt())
        }

        val subtitle = when {
            payload.subtitle.isNotBlank() && !payload.subtitle.startsWith("👣") -> payload.subtitle
            payload.cta.isNotBlank() -> payload.cta
            else -> "Keep moving towards your daily goal"
        }
        views.setTextViewText(R.id.stron_notif_subtitle, subtitle)

        return views
    }

    private fun buildEventViews(context: Context, payload: Payload): RemoteViews {
        return buildIdleViews(context, payload)
    }
}
