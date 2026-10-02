package com.stepwars.stepwarsnew_app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.net.Uri
import android.os.Build
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONArray
import org.json.JSONObject
import java.text.NumberFormat
import java.util.Locale
import kotlin.math.max
import kotlin.math.min

/**
 * Combined sticky notification for active managed events (ID 1003).
 * Does not replace the idle step-tracker or Step Race live shade.
 */
object StronEventLiveNotification {
    const val NOTIFICATION_ID = 1003
    const val CHANNEL_ID = "stron_events_live_channel"
    const val PREFS = "stron_foreground_prefs"
    const val KEY_EVENTS_JSON = "stron_events_live_payload_json"
    private const val TAG = "StronEventLiveNotif"
    private const val MAX_ROWS = 4

    data class EventRow(
        val title: String,
        val format: String,
        val progressLabel: String,
        val progressPercent: Int,
        val covered: Int = 0,
        val target: Int = 0,
        val unit: String = "steps",
        val lastLocalSteps: Int = 0,
        val eventKey: String = "",
    )

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Active Events",
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply {
            description = "Live managed event step/km progress"
            enableVibration(false)
            setShowBadge(false)
            lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
            setSound(null, null)
        }
        manager.createNotificationChannel(channel)
    }

    fun show(context: Context, rows: List<EventRow>) {
        if (rows.isEmpty()) {
            clear(context)
            return
        }
        ensureChannel(context)
        val limited = rows.take(MAX_ROWS)

        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            ?: Intent()
        launchIntent.action = Intent.ACTION_VIEW
        launchIntent.data = Uri.parse("stron://home")
        launchIntent.flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP

        val pending = PendingIntent.getActivity(
            context,
            NOTIFICATION_ID,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val compact = buildCompactViews(context, limited)
        val expanded = buildExpandedViews(context, limited)

        val summary = if (limited.size == 1) {
            "${limited[0].title} · ${limited[0].progressLabel}"
        } else {
            "${limited.size} active events"
        }

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(resolveSmallIcon(context))
            .setColor(Color.parseColor("#086CFF"))
            .setContentTitle("Active Events")
            .setContentText(summary)
            .setCustomContentView(compact)
            .setCustomBigContentView(expanded)
            .setContentIntent(pending)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
        StronNotificationBrand.largeIcon(context)?.let { builder.setLargeIcon(it) }

        NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, builder.build())
        persist(context, limited)
    }

    fun clear(context: Context) {
        NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .remove(KEY_EVENTS_JSON)
            .apply()
    }

    fun hasActivePayload(context: Context): Boolean {
        val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_EVENTS_JSON, null)
        return !raw.isNullOrBlank() && raw != "[]"
    }

    /** Recompute covered from local steps delta and re-post shade. */
    fun refreshFromLocalSteps(context: Context, localSteps: Int) {
        val rows = readRows(context) ?: return
        if (rows.isEmpty()) return
        val updated = rows.map { row ->
            if (row.target <= 0 || row.unit != "steps") return@map row
            val delta = max(0, localSteps - row.lastLocalSteps)
            val covered = min(row.target, row.covered + delta)
            val pct = if (row.target > 0) {
                ((covered.toDouble() / row.target) * 100).toInt().coerceIn(0, 100)
            } else {
                row.progressPercent
            }
            val fmt = NumberFormat.getInstance(Locale.US)
            row.copy(
                covered = covered,
                progressPercent = pct,
                progressLabel = "${fmt.format(covered)} / ${fmt.format(row.target)} steps",
                lastLocalSteps = localSteps,
            )
        }
        show(context, updated)
    }

    fun refreshFromPrefs(context: Context) {
        val rows = readRows(context) ?: return
        if (rows.isEmpty()) return
        show(context, rows)
    }

    private fun persist(context: Context, rows: List<EventRow>) {
        val arr = JSONArray()
        for (row in rows) {
            arr.put(
                JSONObject().apply {
                    put("title", row.title)
                    put("format", row.format)
                    put("progressLabel", row.progressLabel)
                    put("progressPercent", row.progressPercent)
                    put("covered", row.covered)
                    put("target", row.target)
                    put("unit", row.unit)
                    put("lastLocalSteps", row.lastLocalSteps)
                    put("eventKey", row.eventKey)
                },
            )
        }
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(KEY_EVENTS_JSON, arr.toString())
            .apply()
    }

    private fun readRows(context: Context): List<EventRow>? {
        val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_EVENTS_JSON, null) ?: return null
        return try {
            val arr = JSONArray(raw)
            val out = ArrayList<EventRow>(arr.length())
            for (i in 0 until arr.length()) {
                val o = arr.optJSONObject(i) ?: continue
                out.add(
                    EventRow(
                        title = o.optString("title", "Event"),
                        format = o.optString("format", ""),
                        progressLabel = o.optString("progressLabel", ""),
                        progressPercent = o.optInt("progressPercent", 0),
                        covered = o.optInt("covered", 0),
                        target = o.optInt("target", 0),
                        unit = o.optString("unit", "steps"),
                        lastLocalSteps = o.optInt("lastLocalSteps", 0),
                        eventKey = o.optString("eventKey", ""),
                    ),
                )
            }
            out
        } catch (e: Exception) {
            Log.w(TAG, "Failed to parse events payload: ${e.message}")
            null
        }
    }

    private fun buildCompactViews(context: Context, rows: List<EventRow>): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.notification_stron_events_live)
        views.setTextViewText(
            R.id.stron_events_header,
            if (rows.size == 1) "ACTIVE EVENT" else "ACTIVE EVENTS · ${rows.size}",
        )
        bindRow(
            views,
            R.id.stron_events_row1,
            R.id.stron_events_title1,
            R.id.stron_events_format1,
            R.id.stron_events_progress1,
            R.id.stron_events_bar1,
            rows.getOrNull(0),
            context,
        )
        // Compact shows only first row; hide extras if present in layout
        hideIfPresent(views, R.id.stron_events_row2)
        hideIfPresent(views, R.id.stron_events_row3)
        hideIfPresent(views, R.id.stron_events_row4)
        return views
    }

    private fun buildExpandedViews(context: Context, rows: List<EventRow>): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.notification_stron_events_live_big)
        views.setTextViewText(
            R.id.stron_events_big_header,
            if (rows.size == 1) "ACTIVE EVENT" else "ACTIVE EVENTS · ${rows.size}",
        )
        val rowIds = listOf(
            Triple(
                intArrayOf(R.id.stron_events_big_row1, R.id.stron_events_big_title1, R.id.stron_events_big_format1),
                intArrayOf(R.id.stron_events_big_progress1, R.id.stron_events_big_bar1),
                0,
            ),
            Triple(
                intArrayOf(R.id.stron_events_big_row2, R.id.stron_events_big_title2, R.id.stron_events_big_format2),
                intArrayOf(R.id.stron_events_big_progress2, R.id.stron_events_big_bar2),
                1,
            ),
            Triple(
                intArrayOf(R.id.stron_events_big_row3, R.id.stron_events_big_title3, R.id.stron_events_big_format3),
                intArrayOf(R.id.stron_events_big_progress3, R.id.stron_events_big_bar3),
                2,
            ),
            Triple(
                intArrayOf(R.id.stron_events_big_row4, R.id.stron_events_big_title4, R.id.stron_events_big_format4),
                intArrayOf(R.id.stron_events_big_progress4, R.id.stron_events_big_bar4),
                3,
            ),
        )
        for ((ids, prog, idx) in rowIds) {
            bindRow(
                views,
                ids[0],
                ids[1],
                ids[2],
                prog[0],
                prog[1],
                rows.getOrNull(idx),
                context,
            )
        }
        return views
    }

    private fun bindRow(
        views: RemoteViews,
        rowId: Int,
        titleId: Int,
        formatId: Int,
        progressId: Int,
        barId: Int,
        row: EventRow?,
        context: Context,
    ) {
        if (row == null) {
            views.setViewVisibility(rowId, View.GONE)
            return
        }
        views.setViewVisibility(rowId, View.VISIBLE)
        views.setTextViewText(titleId, row.title)
        views.setTextViewText(formatId, row.format.ifBlank { "LIVE" }.uppercase(Locale.US))
        views.setTextViewText(progressId, row.progressLabel)
        views.setImageViewBitmap(
            barId,
            drawProgressBar(context, row.progressPercent.coerceIn(0, 100), 520, 18),
        )
    }

    private fun hideIfPresent(views: RemoteViews, id: Int) {
        try {
            views.setViewVisibility(id, View.GONE)
        } catch (_: Exception) {
            // layout may not include id
        }
    }

    fun drawProgressBar(context: Context, percent: Int, widthPx: Int, heightPx: Int): Bitmap {
        val bmp = Bitmap.createBitmap(widthPx, heightPx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        val density = context.resources.displayMetrics.density
        val radius = heightPx / 2f
        val track = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#33FFFFFF") }
        val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#086CFF") }
        canvas.drawRoundRect(RectF(0f, 0f, widthPx.toFloat(), heightPx.toFloat()), radius, radius, track)
        val w = widthPx * (percent / 100f)
        if (w > 2f) {
            canvas.drawRoundRect(RectF(0f, 0f, w, heightPx.toFloat()), radius, radius, fill)
        }
        // keep density referenced to avoid unused warning in some AGP paths
        @Suppress("UNUSED_VARIABLE")
        val _d = density
        return bmp
    }

    private fun resolveSmallIcon(context: Context): Int {
        val res = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
        if (res != 0) return res
        return android.R.drawable.ic_menu_mylocation
    }
}
