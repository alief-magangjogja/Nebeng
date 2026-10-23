<?php

namespace App\Services;

use App\Models\Notification;

class NotificationService
{
    /**
     * Kirim notifikasi ke satu user.
     */
    public static function send($userId, string $title, string $message, string $category = 'system', ?string $link = null)
    {
        if (!$userId) {
            return null;
        }

        return Notification::create([
            'user_id' => $userId,
            'category' => $category,
            'title' => $title,
            'message' => $message,
            'link' => $link,
        ]);
    }

    /**
     * Kirim notifikasi yang sama ke banyak user sekaligus (mis. semua admin).
     */
    public static function sendToMany(array $userIds, string $title, string $message, string $category = 'system', ?string $link = null)
    {
        foreach ($userIds as $userId) {
            self::send($userId, $title, $message, $category, $link);
        }
    }
}