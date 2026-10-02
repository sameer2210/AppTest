package com.stepwars.stepwarsnew_app

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory

/**
 * Outer notification brand only:
 * - smallIcon = white silhouette (notification_icon) tinted by setColor circle
 * - largeIcon = white silhouette on blue badge (stron_notification_logo)
 * Custom RemoteViews must not include another logo.
 */
object StronNotificationBrand {
    @Volatile
    private var cached: Bitmap? = null

    fun largeIcon(context: Context): Bitmap? {
        cached?.let { if (!it.isRecycled) return it }
        val res = context.resources.getIdentifier(
            "stron_notification_logo",
            "drawable",
            context.packageName,
        )
        if (res == 0) return null
        return try {
            val bmp = BitmapFactory.decodeResource(context.resources, res) ?: return null
            cached = bmp
            bmp
        } catch (_: Exception) {
            null
        }
    }
}
