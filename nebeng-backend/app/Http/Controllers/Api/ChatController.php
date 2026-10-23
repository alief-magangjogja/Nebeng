<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ChatController extends Controller
{
    // ===============================
    // BUKA/MULAI PERCAKAPAN DENGAN USER TERTENTU
    // ===============================
    // Dipakai oleh tombol "Chat" di halaman Riwayat/Detail Pesanan supaya
    // customer/mitra langsung diarahkan ke percakapan yang BENAR (bukan
    // cuma dilempar ke daftar pesan generik lalu harus dicari manual).
    public function openWith(Request $request, $otherUserId)
    {
        $user = $request->user();
        $other = User::findOrFail($otherUserId);

        if ($user->role === 'mitra' && $other->role === 'customer') {
            $conversation = Conversation::firstOrCreate([
                'customer_id' => $other->id,
                'mitra_id' => $user->id,
            ]);
        } elseif ($user->role === 'customer' && $other->role === 'mitra') {
            $conversation = Conversation::firstOrCreate([
                'customer_id' => $user->id,
                'mitra_id' => $other->id,
            ]);
        } else {
            return response()->json([
                'message' => 'Percakapan hanya bisa dibuat antara customer dan mitra.'
            ], 400);
        }

        return response()->json([
            'conversation_id' => $conversation->id,
        ]);
    }
    // ===============================
    // LIST CONVERSATIONS
    // ===============================
    public function conversations(Request $request)
    {
        $user = $request->user();

        $conversations = Conversation::with([
            'customer',
            'mitra',
            'messages' => function($q){
                $q->orderBy('created_at','asc'); // urutan pesan lama -> baru
            }
        ])
        ->where(function ($q) use ($user) {
            // WAJIB dibungkus closure - tanpa ini, orWhere() lepas bisa
            // "bocor" dan menggabung dengan kondisi lain yang mungkin
            // ditambahkan di kemudian hari (mis. filter/scope tambahan),
            // yang berisiko menampilkan percakapan milik user lain.
            $q->where('customer_id', $user->id)
              ->orWhere('mitra_id', $user->id);
        })
        ->get();

        $conversations->map(function($conv) use ($user){

            $conv->unread_count = Message::where('conversation_id', $conv->id)
                ->whereNull('read_at')
                ->where('sender_id','!=',$user->id)
                ->count();

            return $conv;
        });

        return response()->json($conversations);
    }


    // ===============================
    // GET MESSAGES
    // ===============================
    public function messages(Request $request, $conversationId)
    {
        // WAJIB: pastikan user yang login benar-benar salah satu pihak di
        // percakapan ini. Tanpa ini, siapa pun yang login bisa membaca
        // isi chat pribadi ANTAR ORANG LAIN hanya dengan menebak/mengetahui
        // conversation_id - termasuk chat soal nomor rekening untuk refund.
        $conversation = Conversation::findOrFail($conversationId);

        if ($conversation->customer_id !== $request->user()->id && $conversation->mitra_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $messages = Message::with('sender')
            ->where('conversation_id',$conversationId)
            ->orderBy('created_at','asc') // penting untuk urutan chat
            ->get();

        return response()->json($messages);
    }


    // ===============================
    // SEND MESSAGE
    // ===============================
    // Sekarang bisa menerima pesan teks saja, gambar saja, atau
    // keduanya sekaligus (teks jadi caption untuk gambarnya).
    // - Teks biasa (tanpa gambar): tetap dikirim sebagai JSON, TIDAK ada
    //   perubahan perilaku untuk kasus ini.
    // - Ada gambar: frontend kirim sebagai multipart/form-data dengan
    //   field "image" (file) - disimpan ke disk "public", sama seperti
    //   pola payment_proof/refund_proof di OrderController.
    public function sendMessage(Request $request)
    {
        $request->validate([
            'conversation_id' => 'required|exists:conversations,id',
            'message' => 'nullable|string',
            'image' => 'nullable|image|max:4096',
        ]);

        if (!$request->filled('message') && !$request->hasFile('image')) {
            return response()->json([
                'message' => 'Pesan tidak boleh kosong. Isi teks atau lampirkan gambar.'
            ], 422);
        }

        // WAJIB: pastikan pengirim benar-benar salah satu pihak di
        // percakapan ini. Tanpa ini, siapa pun bisa menyusupkan pesan ke
        // percakapan pribadi ANTAR ORANG LAIN, berpura-pura jadi pihak
        // ketiga yang tidak diundang.
        $conversation = Conversation::findOrFail($request->conversation_id);

        if ($conversation->customer_id !== Auth::id() && $conversation->mitra_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('chat_images', 'public');
        }

        $message = Message::create([
            'conversation_id' => $request->conversation_id,
            'sender_id' => Auth::id(),
            'message' => $request->message ?? '',
            'image' => $imagePath,
        ]);

        // load sender supaya langsung tersedia di frontend
        $message->load('sender');

        return response()->json($message);
    }


    // ===============================
    // MARK AS READ
    // ===============================
    public function markAsRead(Request $request,$conversationId)
    {
        // WAJIB: sama seperti messages() - cegah user memanipulasi status
        // baca percakapan yang bukan miliknya.
        $conversation = Conversation::findOrFail($conversationId);

        if ($conversation->customer_id !== $request->user()->id && $conversation->mitra_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        Message::where('conversation_id',$conversationId)
            ->whereNull('read_at')
            ->where('sender_id','!=',$request->user()->id)
            ->update([
                'read_at'=>now()
            ]);

        return response()->json(['status'=>'ok']);
    }
}