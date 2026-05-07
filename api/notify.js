export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { playerIds, title, message, senderPhotoUrl, data } = req.body;

  if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
    return res.status(400).json({ error: 'playerIds required' });
  }

  const isMessage = data?.type === 'message';

  const payload = {
    app_id: process.env.ONESIGNAL_APP_ID,

    // ✅ NEW: include_subscription_ids (replaces deprecated include_player_ids)
    include_subscription_ids: playerIds,

    // ── Title & body ──────────────────────────────────────────────────────────
    headings: { en: title || 'Zylo' },
    contents: { en: message || 'You have a new message' },

    // ── Extra data (for tap handling in Flutter) ──────────────────────────────
    data: data || {},

    // ── Android styling ───────────────────────────────────────────────────────
    android_channel_id: 'messages',
    priority: 10,
    android_accent_color: 'FF6C63FF',
    small_icon: 'ic_stat_notify',

    // ── Sender profile picture as large icon ──────────────────────────────────
    ...(senderPhotoUrl && {
      large_icon: senderPhotoUrl,
    }),

    // ── Android action buttons ────────────────────────────────────────────────
    ...(isMessage && {
      buttons: [
        { id: 'reply', text: 'Reply', icon: 'ic_menu_revert' },
        { id: 'mark_read', text: 'Mark as Read', icon: 'ic_menu_agenda' },
      ],
    }),

    // ── Group all Zylo notifs together ────────────────────────────────────────
    android_group: 'zylo_messages',
    android_group_message: { en: '$[notif_count] new messages' },

    // ── iOS ───────────────────────────────────────────────────────────────────
    ios_badgeType: 'Increase',
    ios_badgeCount: 1,

    // ── TTL: 3 days ───────────────────────────────────────────────────────────
    ttl: 259200,
  };

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${process.env.ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('OneSignal error:', result);
      return res.status(500).json({ error: 'OneSignal failed', details: result });
    }

    return res.status(200).json({ success: true, id: result.id });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
