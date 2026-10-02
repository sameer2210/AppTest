package com.stepwars.stepwarsnew_app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.DashPathEffect
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.RectF
import android.net.Uri
import android.os.Build
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import java.io.File
import java.text.NumberFormat
import java.util.Locale
import kotlin.math.max
import kotlin.math.min

/**
 * Separate ongoing notification for live Step Race — does NOT replace the step tracker shade.
 * Visual parity with Ongoing-Step-Race (faces + dashed track + lead delta).
 */
object StronRaceLiveNotification {
    const val NOTIFICATION_ID = 1002
    const val CHANNEL_ID = "stron_step_race_live_channel"

    /** Must match [StronStepService.PREFS_NAME] so FGS can refresh shade after sync. */
    const val PREFS = "stron_foreground_prefs"
    const val KEY_RACE_JSON = "stron_race_live_payload_json"
    /** Computational state for native race updates when JS is dead. */
    const val KEY_RACE_STATE_JSON = "stron_race_active_state_json"

    data class Payload(
        val raceTitle: String,
        val leadLabel: String,
        val leadDiff: String,
        val isLeading: Boolean,
        val statusLine: String,
        val userStepsLabel: String,
        val opponentName: String,
        val opponentStepsLabel: String,
        val youLine: String,
        val oppLine: String,
        val userProgress: Int,
        val oppProgress: Int,
        val youAvatarPath: String = "",
        val oppAvatarPath: String = "",
        val goalLabel: String = "1,000 step goal",
        val userStepsValue: String = "0",
        val oppStepsValue: String = "0",
    )

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Step Race Live",
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "Live Step Race lead and progress"
            enableVibration(false)
            setShowBadge(false)
            lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
            setSound(null, null)
        }
        manager.createNotificationChannel(channel)
    }

    fun show(context: Context, payload: Payload) {
        ensureChannel(context)

        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            ?: Intent()
        launchIntent.action = Intent.ACTION_VIEW
        launchIntent.data = Uri.parse("stron://ongoing-step-race")
        launchIntent.flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP

        val pending = PendingIntent.getActivity(
            context,
            NOTIFICATION_ID,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val compact = buildCompactViews(context, payload)
        val expanded = buildExpandedViews(context, payload)
        val accent = if (payload.isLeading) Color.parseColor("#2DE441") else Color.parseColor("#FF5C5C")

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(resolveSmallIcon(context))
            .setColor(accent)
            .setContentTitle(payload.raceTitle)
            .setContentText("${payload.leadLabel} ${payload.leadDiff}")
            .setCustomContentView(compact)
            .setCustomBigContentView(expanded)
            .setContentIntent(pending)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
        StronNotificationBrand.largeIcon(context)?.let { builder.setLargeIcon(it) }

        NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, builder.build())

        // Persist for FGS refresh when app is killed
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(
                KEY_RACE_JSON,
                listOf(
                    payload.raceTitle,
                    payload.leadLabel,
                    payload.leadDiff,
                    if (payload.isLeading) "1" else "0",
                    payload.statusLine,
                    payload.userStepsLabel,
                    payload.opponentName,
                    payload.opponentStepsLabel,
                    payload.youLine,
                    payload.oppLine,
                    payload.userProgress.toString(),
                    payload.oppProgress.toString(),
                    payload.youAvatarPath,
                    payload.oppAvatarPath,
                    payload.goalLabel,
                    payload.userStepsValue,
                    payload.oppStepsValue,
                ).joinToString("\u0001"),
            )
            .apply()
    }

    fun clear(context: Context) {
        NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .remove(KEY_RACE_JSON)
            .remove(KEY_RACE_STATE_JSON)
            .apply()
    }

    fun hasActiveRace(context: Context): Boolean {
        val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_RACE_STATE_JSON, null)
        return !raw.isNullOrBlank()
    }

    fun persistRaceState(context: Context, json: String) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(KEY_RACE_STATE_JSON, json)
            .apply()
    }

    fun clearRaceState(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .remove(KEY_RACE_STATE_JSON)
            .apply()
    }

    fun readRaceStateJson(context: Context): String? =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_RACE_STATE_JSON, null)

    /**
     * Rebuild race shade from stored UI payload + race state using current local steps.
     */
    fun refreshFromLocalSteps(context: Context, localSteps: Int) {
        val stateRaw = readRaceStateJson(context) ?: run {
            refreshFromPrefs(context)
            return
        }
        try {
            val state = org.json.JSONObject(stateRaw)
            val startSteps = state.optInt("startSteps", 0)
            val targetSteps = state.optInt("targetSteps", 1000).coerceAtLeast(1)
            val oppPace = state.optInt("opponentPaceSeconds", 600).coerceAtLeast(1)
            val startTimeMs = state.optLong("startTimeMs", System.currentTimeMillis())
            val opponentName = state.optString("opponentName", "Opponent")
            val youAvatar = state.optString("youAvatarPath", "")
            val oppAvatar = state.optString("oppAvatarPath", "")

            val walked = max(0, localSteps - startSteps)
            val userSteps = min(targetSteps, walked)
            val elapsedSec = max(0, ((System.currentTimeMillis() - startTimeMs) / 1000L).toInt())
            val oppSteps = min(
                targetSteps,
                ((elapsedSec.toDouble() / oppPace) * targetSteps).toInt(),
            )
            val lead = userSteps - oppSteps
            val isLeading = userSteps >= oppSteps
            val nf = NumberFormat.getInstance(Locale.US)
            val leadLabel = when {
                lead == 0 -> "TIED"
                isLeading -> "YOUR LEAD"
                else -> "OPPONENT LEAD"
            }
            val leadDiff = when {
                lead == 0 -> "0"
                isLeading -> "+${nf.format(kotlin.math.abs(lead))}"
                else -> "-${nf.format(kotlin.math.abs(lead))}"
            }
            val userPct = ((userSteps.toDouble() / targetSteps) * 100).toInt().coerceIn(0, 100)
            val oppPct = ((oppSteps.toDouble() / targetSteps) * 100).toInt().coerceIn(0, 100)
            val title = if (targetSteps == 1000) "1K STEPS RACE" else "${nf.format(targetSteps)} STEPS RACE"
            val oppShort = opponentName.split(" ").firstOrNull()?.takeIf { it.isNotBlank() } ?: "Opp"

            show(
                context,
                Payload(
                    raceTitle = title,
                    leadLabel = leadLabel,
                    leadDiff = leadDiff,
                    isLeading = isLeading,
                    statusLine = if (isLeading) {
                        if (lead == 0) "It's neck and neck!" else "You're ahead right now!"
                    } else {
                        "You're trailing right now!"
                    },
                    userStepsLabel = "${nf.format(userSteps)} steps",
                    opponentName = opponentName,
                    opponentStepsLabel = "${nf.format(oppSteps)} steps",
                    youLine = "You · ${nf.format(userSteps)}",
                    oppLine = "$oppShort · ${nf.format(oppSteps)}",
                    userProgress = userPct,
                    oppProgress = oppPct,
                    youAvatarPath = youAvatar,
                    oppAvatarPath = oppAvatar,
                    goalLabel = "${nf.format(targetSteps)} step goal",
                    userStepsValue = nf.format(userSteps),
                    oppStepsValue = nf.format(oppSteps),
                ),
            )
        } catch (_: Exception) {
            refreshFromPrefs(context)
        }
    }

    fun refreshFromPrefs(context: Context) {
        val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_RACE_JSON, null) ?: return
        val p = raw.split("\u0001")
        if (p.size < 12) return
        show(
            context,
            Payload(
                raceTitle = p[0],
                leadLabel = p[1],
                leadDiff = p[2],
                isLeading = p[3] == "1",
                statusLine = p.getOrElse(4) { "" },
                userStepsLabel = p.getOrElse(5) { "0 steps" },
                opponentName = p.getOrElse(6) { "Opponent" },
                opponentStepsLabel = p.getOrElse(7) { "0 steps" },
                youLine = p.getOrElse(8) { "You · 0" },
                oppLine = p.getOrElse(9) { "Opp · 0" },
                userProgress = p.getOrElse(10) { "0" }.toIntOrNull() ?: 0,
                oppProgress = p.getOrElse(11) { "0" }.toIntOrNull() ?: 0,
                youAvatarPath = p.getOrElse(12) { "" },
                oppAvatarPath = p.getOrElse(13) { "" },
                goalLabel = p.getOrElse(14) { "1,000 step goal" },
                userStepsValue = p.getOrElse(15) {
                    p.getOrElse(5) { "0 steps" }.replace(" steps", "").trim().ifBlank { "0" }
                },
                oppStepsValue = p.getOrElse(16) {
                    p.getOrElse(7) { "0 steps" }.replace(" steps", "").trim().ifBlank { "0" }
                },
            ),
        )
    }

    private fun buildCompactViews(context: Context, payload: Payload): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.notification_stron_race_live)
        val leadColor = if (payload.isLeading) "#FF2DE441" else "#FFFF5C5C"
        views.setTextViewText(R.id.stron_race_title, payload.raceTitle)
        views.setTextViewText(R.id.stron_race_lead_chip, payload.leadDiff)
        views.setTextColor(R.id.stron_race_lead_chip, Color.parseColor(leadColor))
        views.setTextViewText(R.id.stron_race_you_name, "You")
        views.setTextViewText(R.id.stron_race_you_steps, payload.userStepsValue)
        views.setTextViewText(R.id.stron_race_opp_name, payload.opponentName)
        views.setTextViewText(R.id.stron_race_opp_steps, payload.oppStepsValue)
        return views
    }

    private fun buildExpandedViews(context: Context, payload: Payload): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.notification_stron_race_live_big)
        val leadColor = if (payload.isLeading) "#FF2DE441" else "#FFFF5C5C"
        views.setTextViewText(R.id.stron_race_big_title, payload.raceTitle)
        views.setTextViewText(R.id.stron_race_big_lead_label, payload.leadLabel)
        views.setTextViewText(R.id.stron_race_big_lead_diff, payload.leadDiff)
        views.setTextViewText(R.id.stron_race_big_status, payload.statusLine)
        views.setTextColor(R.id.stron_race_big_lead_label, Color.parseColor(leadColor))
        views.setTextColor(R.id.stron_race_big_lead_diff, Color.parseColor(leadColor))
        views.setTextViewText(R.id.stron_race_you_label, "You")
        views.setTextViewText(R.id.stron_race_you_steps, payload.userStepsValue)
        views.setTextViewText(R.id.stron_race_opp_name, payload.opponentName)
        views.setTextViewText(R.id.stron_race_opp_steps, payload.oppStepsValue)
        views.setTextViewText(R.id.stron_race_big_goal, payload.goalLabel)
        views.setImageViewBitmap(
            R.id.stron_race_big_track,
            drawTrackBitmap(context, payload.userProgress, payload.oppProgress, 840, 96),
        )
        return views
    }

    private fun bindAvatar(
        context: Context,
        views: RemoteViews,
        viewId: Int,
        path: String,
        sizeDp: Int,
    ) {
        val file = path.takeIf { it.isNotBlank() }?.let { File(it.removePrefix("file://")) }
        if (file != null && file.exists()) {
            val bmp = decodeAvatarBitmap(file)
            if (bmp != null) {
                views.setImageViewBitmap(viewId, toCircularBitmap(bmp, sizeDp))
                return
            }
        }
        // Neutral face placeholder — never the brand logo (avoids looking like dual logos).
        val placeholder = resolveAvatarPlaceholderRes(context)
        if (placeholder != 0) {
            views.setImageViewResource(viewId, placeholder)
        }
    }

    /** Prefer ImageDecoder for WebP/alpha avatars; fall back to BitmapFactory. */
    private fun decodeAvatarBitmap(file: File): Bitmap? {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val source = android.graphics.ImageDecoder.createSource(file)
                return android.graphics.ImageDecoder.decodeBitmap(source) { decoder, _, _ ->
                    decoder.isMutableRequired = true
                    decoder.allocator = android.graphics.ImageDecoder.ALLOCATOR_SOFTWARE
                }
            }
        } catch (_: Exception) {
            /* fall through */
        }
        return try {
            BitmapFactory.decodeFile(file.absolutePath)
        } catch (_: Exception) {
            null
        }
    }

    /** Center-crop into a circle with soft fill — matches in-app avatar ring look. */
    private fun toCircularBitmap(source: Bitmap, sizeDp: Int): Bitmap {
        val size = (sizeDp * 3).coerceAtLeast(96) // ~xxhdpi
        val scale = max(
            size.toFloat() / source.width.coerceAtLeast(1),
            size.toFloat() / source.height.coerceAtLeast(1),
        )
        val scaledW = (source.width * scale).toInt().coerceAtLeast(size)
        val scaledH = (source.height * scale).toInt().coerceAtLeast(size)
        val scaled = Bitmap.createScaledBitmap(source, scaledW, scaledH, true)
        val left = ((scaledW - size) / 2).coerceAtLeast(0)
        val top = ((scaledH - size) / 2).coerceAtLeast(0)
        val cropW = size.coerceAtMost(scaled.width - left)
        val cropH = size.coerceAtMost(scaled.height - top)
        val cropped = Bitmap.createBitmap(scaled, left, top, cropW, cropH)

        val out = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(out)
        val r = size / 2f
        // Soft plate behind transparent bitmoji (same family as in-app #0D244F).
        val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#0D244F") }
        canvas.drawCircle(r, r, r, bgPaint)

        val layer = canvas.saveLayer(0f, 0f, size.toFloat(), size.toFloat(), null)
        val maskPaint = Paint(Paint.ANTI_ALIAS_FLAG)
        canvas.drawCircle(r, r, r, maskPaint)
        val cutPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            isFilterBitmap = true
            xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_IN)
        }
        val dx = ((size - cropW) / 2f)
        val dy = ((size - cropH) / 2f)
        canvas.drawBitmap(cropped, dx, dy, cutPaint)
        canvas.restoreToCount(layer)

        if (scaled !== source && !scaled.isRecycled) scaled.recycle()
        if (cropped !== scaled && !cropped.isRecycled) cropped.recycle()
        return out
    }

    /** Dashed track + you (blue) / opponent (coral) dots + finish flag — Home LiveVsMeter style. */
    fun drawTrackBitmap(
        context: Context,
        userProgress: Int,
        oppProgress: Int,
        widthPx: Int,
        heightPx: Int,
    ): Bitmap {
        val bmp = Bitmap.createBitmap(widthPx, heightPx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        val density = context.resources.displayMetrics.density
        val pad = 14f * density
        val flagGap = 18f * density
        val cy = heightPx / 2f
        val trackH = 7f * density
        val left = pad
        val right = widthPx - pad - flagGap
        val trackW = (right - left).coerceAtLeast(1f)

        // Soft track pill
        val pillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#33FFFFFF")
        }
        canvas.drawRoundRect(
            RectF(left - 2f, cy - trackH / 2f, right + 2f, cy + trackH / 2f),
            trackH,
            trackH,
            pillPaint,
        )

        val trackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#E6FFFFFF")
            style = Paint.Style.STROKE
            strokeWidth = trackH * 0.72f
            strokeCap = Paint.Cap.ROUND
            pathEffect = DashPathEffect(floatArrayOf(12f * density, 8f * density), 0f)
        }
        canvas.drawLine(left, cy, right, cy, trackPaint)

        fun drawDot(pct: Int, color: Int) {
            val x = left + trackW * (pct.coerceIn(0, 100) / 100f)
            val r = 9f * density
            val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply { this.color = color }
            val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                this.color = Color.WHITE
                style = Paint.Style.STROKE
                strokeWidth = 2.5f * density
            }
            canvas.drawCircle(x, cy, r, fill)
            canvas.drawCircle(x, cy, r, stroke)
        }

        // Opponent under / user on top when overlapping
        drawDot(oppProgress, Color.parseColor("#FF5C5C"))
        drawDot(userProgress, Color.parseColor("#397EFF"))

        // Finish flag (pole + checkered tip)
        val fx = right + 6f * density
        val pole = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.WHITE
            strokeWidth = 2.2f * density
        }
        canvas.drawLine(fx, cy - 12f * density, fx, cy + 10f * density, pole)
        val flagPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE }
        val fw = 11f * density
        val fh = 8f * density
        canvas.drawRect(RectF(fx, cy - 12f * density, fx + fw, cy - 12f * density + fh), flagPaint)
        val dark = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#FF041538") }
        val cell = fw / 2f
        canvas.drawRect(
            RectF(fx + cell, cy - 12f * density, fx + fw, cy - 12f * density + fh / 2f),
            dark,
        )
        canvas.drawRect(
            RectF(fx, cy - 12f * density + fh / 2f, fx + cell, cy - 12f * density + fh),
            dark,
        )

        return bmp
    }

    private fun resolveSmallIcon(context: Context): Int {
        val res = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
        if (res != 0) return res
        return android.R.drawable.ic_menu_mylocation
    }

    private fun resolveAvatarPlaceholderRes(context: Context): Int =
        context.resources.getIdentifier(
            "notification_avatar_placeholder",
            "drawable",
            context.packageName,
        )

    fun formatSignedDiff(diff: Int): String {
        val abs = NumberFormat.getInstance(Locale.US).format(kotlin.math.abs(diff))
        return if (diff > 0) "+$abs" else if (diff < 0) "-$abs" else "0"
    }
}
