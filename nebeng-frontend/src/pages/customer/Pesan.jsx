import React, { useState, useEffect, useRef, useCallback } from "react";
import CustomerLayout from "../../components/dashboard/CustomerLayout";
import { Search, Send, Camera, Image as ImageIcon, Smile, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

export default function Pesan() {
	const location = useLocation();
	const navigate = useNavigate();
	const [selectedChat, setSelectedChat] = useState(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [inputMessage, setInputMessage] = useState("");
	const [chatList, setChatList] = useState([]);
	const [messages, setMessages] = useState([]);
	const [user, setUser] = useState(null);
	const quickReplies = ["Iya, sudah sesuai", "Pickup address sudah benar", "Bisa ubah jam keberangkatan?", "Tolong konfirmasi order saya"];

	// mitraId (dan nama-nya sebagai fallback tampilan) yang dikirim dari
	// halaman lain (mis. PerjalananCustomer.jsx) lewat navigate(..., { state })
	// supaya begitu halaman Pesan dibuka, percakapan dengan mitra tsb
	// langsung terbuka otomatis, bukan cuma menampilkan daftar kosong.
	const targetMitraId = location.state?.mitraId ?? null;
	const targetMitraName = location.state?.mitraName ?? null;

	// Ref supaya auto-open cuma dijalankan sekali per kunjungan halaman,
	// biar tidak "menarik paksa" user kembali ke chat itu kalau dia
	// sudah pindah-pindah membuka chat lain secara manual.
	const autoOpenHandledRef = useRef(false);

	// Ref untuk auto-scroll chat
	const chatEndRef = useRef(null);

	// ================= CARI DALAM PERCAKAPAN =================
	const [chatSearchOpen, setChatSearchOpen] = useState(false);
	const [chatSearchQuery, setChatSearchQuery] = useState("");

	// ================= KIRIM GAMBAR (kamera / galeri) =================
	// Tombol sekarang buka MODAL pilihan dulu: "Galeri" atau "Kamera".
	// Dua <input type="file"> tersembunyi terpisah karena "capture" cuma
	// berlaku untuk salah satu (kamera) - kalau digabung satu input, HP
	// jadi bingung mau langsung buka kamera atau kasih pilihan galeri.
	const galleryInputRef = useRef(null);
	const cameraInputRef = useRef(null);
	const [showAttachMenu, setShowAttachMenu] = useState(false);
	const [attachedImage, setAttachedImage] = useState(null);
	const [attachedImagePreview, setAttachedImagePreview] = useState(null);
	const [sendingImage, setSendingImage] = useState(false);
	// Guard pakai ref (bukan cuma state) supaya klik ganda yang KELEWAT
	// cepat (sebelum React sempat re-render tombol jadi disabled) tetap
	// ke-block. State-nya sendiri (sendingImage) dipakai buat visual
	// tombol saja.
	const isSendingRef = useRef(false);

	// Deteksi HP vs desktop: di HP, <input capture> sudah cukup (browser
	// HP yang buka kamera native). Di desktop, atribut "capture" DIABAIKAN
	// browser (spesnya memang cuma untuk device dengan kamera fisik +
	// dukungan file picker native) - jadi untuk desktop kita buka webcam
	// beneran sendiri lewat getUserMedia + preview + tombol jepret.
	const isMobileDevice = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

	// ================= WEBCAM DESKTOP =================
	const [showWebcamModal, setShowWebcamModal] = useState(false);
	const [webcamError, setWebcamError] = useState(null);
	const videoRef = useRef(null);
	const streamRef = useRef(null);

	const stopWebcamStream = () => {
		streamRef.current?.getTracks().forEach((track) => track.stop());
		streamRef.current = null;
	};

	const closeWebcamModal = () => {
		stopWebcamStream();
		setShowWebcamModal(false);
		setWebcamError(null);
	};

	useEffect(() => {
		if (!showWebcamModal) return;

		navigator.mediaDevices
			.getUserMedia({ video: { facingMode: "user" } })
			.then((stream) => {
				streamRef.current = stream;
				if (videoRef.current) videoRef.current.srcObject = stream;
			})
			.catch(() => {
				setWebcamError("Tidak bisa mengakses kamera. Pastikan izin kamera browser sudah diizinkan.");
			});

		return () => stopWebcamStream();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [showWebcamModal]);

	const captureWebcamPhoto = () => {
		const video = videoRef.current;
		if (!video) return;

		const canvas = document.createElement("canvas");
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		canvas.getContext("2d").drawImage(video, 0, 0);

		canvas.toBlob(
			(blob) => {
				if (!blob) return;
				const file = new File([blob], `webcam-${Date.now()}.jpg`, { type: "image/jpeg" });
				setAttachedImage(file);
				setAttachedImagePreview(URL.createObjectURL(blob));
				closeWebcamModal();
			},
			"image/jpeg",
			0.9,
		);
	};

	const openGallery = () => {
		setShowAttachMenu(false);
		galleryInputRef.current?.click();
	};

	const openCamera = () => {
		setShowAttachMenu(false);
		if (isMobileDevice) {
			cameraInputRef.current?.click();
		} else {
			setShowWebcamModal(true);
		}
	};

	const handleImageSelected = (e) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setAttachedImage(file);
		setAttachedImagePreview(URL.createObjectURL(file));
		// reset value supaya milih file yang SAMA persis dua kali berturut-turut tetap trigger onChange
		e.target.value = "";
	};

	const removeAttachedImage = () => {
		setAttachedImage(null);
		setAttachedImagePreview(null);
	};

	const scrollToBottom = () => {
		chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	const handleQuickReply = (text) => {
		setInputMessage(text);
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages.length, selectedChat?.id]);

	// Tutup & kosongkan pencarian-dalam-percakapan setiap kali pindah chat,
	// supaya tidak "kebawa" menampilkan hasil pencarian dari chat sebelumnya.
	useEffect(() => {
		setChatSearchOpen(false);
		setChatSearchQuery("");
	}, [selectedChat?.id]);

	// Batalkan gambar terlampir kalau pindah chat, supaya tidak kekirim ke
	// percakapan yang salah.
	useEffect(() => {
		removeAttachedImage();
		setShowAttachMenu(false);
		closeWebcamModal();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedChat?.id]);

	const fetchConversations = useCallback(async () => {
		if (!user) return;

		const res = await fetch("http://127.0.0.1:8000/api/conversations", {
			headers: {
				Authorization: `Bearer ${localStorage.getItem("token")}`,
			},
		});

		const data = await res.json();

		const formatted = data.map((conv) => {
			const lastMessage = conv.messages && conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null;

			const otherUser = user.id === conv.customer_id ? conv.mitra : conv.customer;

			return {
				id: conv.id,
				mitraId: otherUser?.id ?? null,
				name: otherUser?.name || "User",
				msg: lastMessage?.message || "Belum ada pesan",
				time: lastMessage
					? new Date(lastMessage.created_at).toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						})
					: "",
				avatar: otherUser?.avatar ? `http://127.0.0.1:8000/storage/${otherUser.avatar}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser?.id}`,
				online: false,
				unread: conv.unread_count || 0,
			};
		});

		setChatList(formatted);
	}, [user]);

	useEffect(() => {
		fetch("http://127.0.0.1:8000/api/user", {
			headers: {
				Authorization: `Bearer ${localStorage.getItem("token")}`,
			},
		})
			.then((res) => res.json())
			.then((data) => setUser(data));
	}, []);

	useEffect(() => {
		if (!user) return;

		const load = async () => {
			await fetchConversations();
		};

		load();

		// optional cleanup placeholder if you later add cancellation:
		return () => {};
	}, [user, fetchConversations]);

	const loadMessages = async (conversationId) => {
		const res = await fetch(`http://127.0.0.1:8000/api/conversations/${conversationId}/messages`, {
			headers: {
				Authorization: `Bearer ${localStorage.getItem("token")}`,
			},
		});

		const data = await res.json();

		const sorted = data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

		setMessages(sorted);
	};

	const openChat = useCallback((chat) => {
		setSelectedChat(chat);
		loadMessages(chat.id);

		// mark messages as read
		fetch(`http://127.0.0.1:8000/api/conversations/${chat.id}/mark-read`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${localStorage.getItem("token")}`,
			},
		});

		// update unread di UI
		setChatList((prev) => prev.map((c) => (c.id === chat.id ? { ...c, unread: 0 } : c)));
	}, []);

	// Auto-buka percakapan dengan mitra tertentu kalau halaman ini dibuka
	// membawa state `mitraId` (contoh: dari tombol chat di halaman
	// Perjalanan/Order dengan mitra tersebut).
	useEffect(() => {
		if (!targetMitraId || autoOpenHandledRef.current) return;
		if (chatList.length === 0) return;

		const targetChat = chatList.find((c) => c.mitraId === targetMitraId);

		if (targetChat) {
			autoOpenHandledRef.current = true;
			openChat(targetChat);
		}
	}, [targetMitraId, chatList, openChat]);

	useEffect(() => {
		if (!selectedChat) return;

		const interval = setInterval(() => {
			loadMessages(selectedChat.id);
			fetchConversations();
		}, 2000);

		return () => clearInterval(interval);
	}, [selectedChat, fetchConversations]);

	// Kalau halaman ini dibuka dari tombol "Chat Mitra" di halaman lain
	// (Riwayat, Detail Pesanan, dll), langsung buka percakapan yang sudah
	// disiapkan itu - jangan biarkan user mencari sendiri di daftar.
	useEffect(() => {
		const targetId = location.state?.conversationId;
		if (!targetId || chatList.length === 0) return;

		const target = chatList.find((c) => c.id === targetId);
		if (target) {
			setSelectedChat(target);
			loadMessages(target.id);

			fetch(`http://127.0.0.1:8000/api/conversations/${target.id}/mark-read`, {
				method: "POST",
				headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
			});
			setChatList((prev) => prev.map((c) => (c.id === target.id ? { ...c, unread: 0 } : c)));
		}

		// Bersihkan state supaya tidak terpicu ulang kalau user membuka
		// percakapan lain lalu kembali ke halaman ini.
		navigate(location.pathname, { replace: true, state: {} });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [chatList, location.state]);

	// Fungsionalitas Pencarian (daftar kontak, sisi kiri)
	const filteredChat = chatList.filter((chat) => chat.name.toLowerCase().includes(searchQuery.toLowerCase()));

	// Pesan yang ditampilkan di jendela chat - kalau kolom cari-dalam-percakapan
	// sedang dipakai, saring dulu ke pesan yang teksnya cocok saja, SEBELUM
	// dikelompokkan per tanggal di bawah.
	const visibleMessages = chatSearchQuery.trim() ? messages.filter((m) => m.message?.toLowerCase().includes(chatSearchQuery.trim().toLowerCase())) : messages;

	// Fungsionalitas Kirim Pesan (teks dan/atau gambar terlampir)
	const handleSendMessage = async (e) => {
		e.preventDefault();

		// Guard ganda: cek + kunci ref-nya SEBELUM apa pun lain dieksekusi,
		// supaya klik/enter berkali-kali yang numpuk (karena user ngira
		// "macet") tidak masing-masing lolos jadi request terpisah.
		if (isSendingRef.current) return;
		if (!inputMessage.trim() && !attachedImage) return;

		isSendingRef.current = true;
		setSendingImage(true);

		// Simpan dulu isinya, lalu LANGSUNG kosongkan kolom + preview -
		// biar kerasa instan/gak "macet" di mata user, tanpa perlu nunggu
		// network selesai dulu baru dibersihkan.
		const messageText = inputMessage;
		const imageToSend = attachedImage;
		const imageLocalPreviewUrl = attachedImagePreview;
		setInputMessage("");
		removeAttachedImage();

		// ================= OPTIMISTIC UPDATE =================
		// Bubble sementara langsung nongol di layar SEBELUM server sempat
		// jawab - itu yang bikin kerasa instan. ID negatif + timestamp
		// dipakai supaya gampang dicari lagi nanti untuk ditukar/dicabut,
		// dan tidak akan pernah nabrak id asli dari database (yang selalu
		// bilangan bulat positif).
		const tempId = `temp-${Date.now()}`;
		const optimisticMessage = {
			id: tempId,
			conversation_id: selectedChat.id,
			sender_id: user.id,
			message: messageText,
			image: imageToSend ? imageLocalPreviewUrl : null,
			created_at: new Date().toISOString(),
			_optimistic: true, // dipakai buat tandain "masih dikirim" kalau nanti mau kasih indikator
			_localImage: !!imageToSend, // gambar ini masih blob URL lokal, bukan path server
		};

		setMessages((prev) => [...prev, optimisticMessage].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));

		try {
			let data;

			if (imageToSend) {
				const formData = new FormData();
				formData.append("conversation_id", selectedChat.id);
				if (messageText.trim()) formData.append("message", messageText);
				formData.append("image", imageToSend);

				const res = await fetch("http://127.0.0.1:8000/api/messages", {
					method: "POST",
					headers: {
						Authorization: `Bearer ${localStorage.getItem("token")}`,
					},
					body: formData,
				});
				data = await res.json();
			} else {
				const res = await fetch("http://127.0.0.1:8000/api/messages", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${localStorage.getItem("token")}`,
					},
					body: JSON.stringify({
						conversation_id: selectedChat.id,
						message: messageText,
					}),
				});
				data = await res.json();
			}

			// Tukar bubble sementara dengan data ASLI dari server (id, jam,
			// dan path gambar final - bukan blob lokal lagi).
			setMessages((prev) => {
				const updated = prev.map((m) => (m.id === tempId ? data : m));
				return updated.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
			});

			setChatList((prev) =>
				prev.map((c) =>
					c.id === selectedChat.id
						? {
								...c,
								msg: data.message || (data.image ? "📷 Gambar" : c.msg),
								time: new Date(data.created_at).toLocaleTimeString([], {
									hour: "2-digit",
									minute: "2-digit",
								}),
							}
						: c,
				),
			);
		} catch (err) {
			console.error("Gagal mengirim pesan:", err);
			// Cabut lagi bubble sementaranya (gagal terkirim) + kembalikan
			// isi ketikan supaya tidak hilang percuma.
			setMessages((prev) => prev.filter((m) => m.id !== tempId));
			setInputMessage(messageText);
		} finally {
			isSendingRef.current = false;
			setSendingImage(false);
		}
	};

	return (
		<CustomerLayout>
			{/* Sebelumnya tinggi dihitung manual "h-[calc(100vh-120px)]" (nebak
			    tinggi header ~120px). Sekarang parent (<main> di CustomerLayout)
			    sudah punya tinggi pasti dari struktur flex kolom h-dvh, jadi
			    cukup "h-full" - otomatis pas & tidak perlu angka tebakan lagi. */}
			<div className="w-full max-w-screen-xl mx-auto px-4 py-6 h-full">
				<div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex overflow-hidden h-full">
					{/* SISI KIRI: Daftar Pesan */}
					<div className={`w-full lg:w-[400px] flex flex-col border-r border-gray-50 transition-all duration-300 ${selectedChat ? "hidden lg:flex" : "flex"}`}>
						<div className="p-6 border-b border-gray-50 bg-indigo-900 text-white">
							<h1 className="text-xl font-black tracking-tight mb-4">Pesan</h1>
							<div className="relative group">
								<Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${searchQuery ? "text-white" : "text-indigo-300"}`} />
								<input
									type="text"
									placeholder="Cari percakapan..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/10 rounded-xl text-sm text-white placeholder:text-indigo-200 focus:outline-none focus:bg-white/20 transition-all focus:ring-1 focus:ring-white/30"
								/>
							</div>
						</div>

						<div className="flex-1 overflow-y-auto no-scrollbar">
							{filteredChat.length > 0 ? (
								filteredChat.map((chat) => (
									<div
										key={chat.id}
										onClick={() => openChat(chat)}
										className={`flex items-center gap-4 p-5 cursor-pointer transition-all border-b border-gray-50/50 hover:bg-indigo-50/30 ${selectedChat?.id === chat.id ? "bg-indigo-50 border-l-4 border-l-indigo-600 scale-[1.01]" : ""}`}
									>
										<div className="relative shrink-0">
											{chat.isBot ? (
												<div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 text-blue-600">
													<Smile size={24} />
												</div>
											) : (
												<img src={chat.avatar} alt={chat.name} className="w-12 h-12 rounded-full object-cover border border-gray-100 shadow-sm" />
											)}
											{chat.online && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm animate-pulse"></div>}
										</div>

										<div className="flex-1 min-w-0">
											<div className="flex justify-between items-center mb-1">
												<h3 className={`text-sm font-bold truncate ${selectedChat?.id === chat.id ? "text-indigo-900" : "text-gray-800"}`}>{chat.name}</h3>
												<span className="text-[10px] text-gray-400 font-medium">{chat.time}</span>
											</div>
											<p className="text-xs text-gray-400 truncate leading-relaxed">{chat.msg}</p>
										</div>

										{chat.unread > 0 && <div className="w-5 h-5 bg-pink-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-sm shadow-pink-200 shrink-0 animate-bounce">{chat.unread}</div>}
									</div>
								))
							) : (
								<div className="p-10 text-center text-gray-400 text-sm italic">Kontak tidak ditemukan.</div>
							)}
						</div>
					</div>

										{/* SISI KANAN: Chat Window */}
					<div className={`flex-1 flex flex-col min-w-0 bg-gray-50/30 transition-all duration-500 ${!selectedChat ? "hidden lg:flex items-center justify-center" : "flex"}`}>
						{selectedChat ? (
							<>
								{/* Header Chat */}
								<div className="sticky top-0 z-20 bg-white border-b border-gray-50 shadow-sm shrink-0">
									<div className="p-4 flex items-center justify-between gap-2">
										<div className="flex items-center gap-3 min-w-0 flex-1">
											<button onClick={() => setSelectedChat(null)} className="p-2 lg:hidden text-gray-400 hover:text-indigo-900 transition-colors shrink-0">
												<ChevronLeft />
											</button>
											<div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden border border-indigo-50 shrink-0">
												{selectedChat.isBot ? <Smile className="text-indigo-600" /> : <img src={selectedChat.avatar} className="w-full h-full object-cover" />}
											</div>
											<div className="min-w-0">
												<h3 className="text-sm font-bold text-gray-800 truncate">{selectedChat.name}</h3>
											</div>
										</div>
										<div className="flex items-center gap-1 text-gray-400 shrink-0">
											<button
												onClick={() => setChatSearchOpen((v) => !v)}
												title="Cari di percakapan"
												className={`p-2 rounded-lg transition-colors ${chatSearchOpen ? "bg-indigo-50 text-indigo-600" : "hover:bg-gray-100"}`}
											>
												<Search size={18} />
											</button>
										</div>
									</div>

									{chatSearchOpen && (
										<div className="px-4 pb-3 flex items-center gap-2">
											<div className="relative flex-1">
												<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
												<input
													type="text"
													autoFocus
													value={chatSearchQuery}
													onChange={(e) => setChatSearchQuery(e.target.value)}
													placeholder="Cari pesan dalam percakapan ini..."
													className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
												/>
											</div>
											<button
												onClick={() => {
													setChatSearchOpen(false);
													setChatSearchQuery("");
												}}
												className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
											>
												<X size={18} />
											</button>
										</div>
									)}
								</div>

								{/* Messages Area */}
								<div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
									{chatSearchQuery.trim() && visibleMessages.length === 0 ? (
										<div className="flex justify-center pt-10">
											<p className="text-xs text-gray-400 italic text-center">Tidak ada pesan yang cocok dengan &quot;{chatSearchQuery}&quot;.</p>
										</div>
									) : (
										/* Render Dynamic Messages Grouped By Date */
										Object.entries(
											visibleMessages.reduce((groups, m) => {
												const dateObj = new Date(m.created_at);
												const today = new Date();
												const yesterday = new Date(today);
												yesterday.setDate(yesterday.getDate() - 1);

												let label = dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
												if (dateObj.toDateString() === today.toDateString()) {
													label = "Hari ini";
												} else if (dateObj.toDateString() === yesterday.toDateString()) {
													label = "Kemarin";
												}

												if (!groups[label]) groups[label] = [];
												groups[label].push(m);
												return groups;
											}, {}),
										).map(([dateLabel, msgs]) => (
											<React.Fragment key={dateLabel}>
												<div className="flex justify-center my-4">
													<span className="text-[10px] bg-white border border-gray-100 px-3 py-1 rounded-full text-gray-400 font-bold uppercase tracking-widest shadow-sm">{dateLabel}</span>
												</div>
												{msgs.map((m) => {
													const timeStr = new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
													const imageOnly = m.image && !m.message;
													// Bubble optimistic (baru ditekan, belum dibalas server) pakai
													// blob URL lokal apa adanya; yang sudah beneran dari server
													// perlu di-prefix path storage-nya.
													const imageSrc = m.image ? (m._localImage ? m.image : `http://127.0.0.1:8000/storage/${m.image}`) : null;
													return (
														<div key={m.id} className={`flex ${m.sender_id === user.id ? "flex-row-reverse ml-auto" : ""} items-end gap-2 max-w-[80%] ${m._optimistic ? "opacity-70" : ""}`}>
															<div
																className={`rounded-2xl shadow overflow-hidden ${m.sender_id === user.id ? "bg-indigo-900 text-white rounded-br-none" : "bg-white border border-gray-100 rounded-bl-none"} ${imageOnly ? "p-0" : "p-2"}`}
															>
																{m.image && (
																	<a href={imageSrc} target="_blank" rel="noopener noreferrer" className="relative block">
																		<img
																			src={imageSrc}
																			alt="Gambar terkirim"
																			className={`w-56 max-w-full max-h-72 object-cover block ${imageOnly ? "" : "rounded-xl mb-1"}`}
																		/>
																		{imageOnly && (
																			<span className="absolute bottom-1.5 right-1.5 text-[10px] font-semibold text-white bg-black/50 px-1.5 py-0.5 rounded-md">
																				{timeStr}
																			</span>
																		)}
																	</a>
																)}
																{m.message && <p className={`text-sm ${m.image ? "px-1" : "px-2"}`}>{m.message}</p>}
																{!imageOnly && <p className="text-[10px] mt-1 opacity-70 text-right px-2 pb-1">{timeStr}</p>}
															</div>
														</div>
													);
												})}
											</React.Fragment>
										))
									)}
									<div ref={chatEndRef} />
								</div>

								{/* Quick Reply Options */}
								<div className="px-6 py-3 bg-white border-t border-gray-100 flex gap-2 overflow-x-auto no-scrollbar min-w-0">
									{quickReplies.map((reply, index) => (
										<button key={index} type="button" onClick={() => handleQuickReply(reply)} className="text-xs bg-indigo-50 text-indigo-700 px-3 py-2 rounded-full hover:bg-indigo-100 transition-all border border-indigo-100 shrink-0 whitespace-nowrap">
											{reply}
										</button>
									))}
								</div>

								{/* Preview gambar yang akan dikirim */}
								{attachedImagePreview && (
									<div className="px-6 pt-3 bg-white">
										<div className="relative inline-block">
											<img src={attachedImagePreview} alt="Preview gambar" className="h-20 w-20 rounded-xl object-cover border border-gray-200" />
											<button
												type="button"
												onClick={removeAttachedImage}
												className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center shadow-md"
											>
												<X size={13} />
											</button>
										</div>
									</div>
								)}

								{/* Input Chat */}
								<form onSubmit={handleSendMessage} className="p-6 bg-white border-t border-gray-50">
									<div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-200 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
										{/* 2 input file tersembunyi: galeri (tanpa capture) & kamera (capture=environment) */}
										<input ref={galleryInputRef} type="file" accept="image/*" onChange={handleImageSelected} className="hidden" />
										<input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageSelected} className="hidden" />
										<button
											type="button"
											onClick={() => setShowAttachMenu(true)}
											title="Kirim gambar"
											className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
										>
											<Camera size={20} />
										</button>
										<input
											type="text"
											value={inputMessage}
											onChange={(e) => setInputMessage(e.target.value)}
											placeholder="Tulis pesan..."
											className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-gray-400 text-gray-700"
										/>
										<button
											type="submit"
											disabled={(!inputMessage.trim() && !attachedImage) || sendingImage}
											className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-lg ${(inputMessage.trim() || attachedImage) && !sendingImage ? "bg-indigo-900 text-white shadow-indigo-200 hover:bg-indigo-800" : "bg-gray-200 text-gray-400"}`}
										>
											<Send size={18} />
										</button>
									</div>
								</form>
							</>
						) : (
							<div className="flex flex-col items-center justify-center text-center p-12 group">
								<div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
									<Send size={40} />
								</div>
								<h2 className="text-xl font-black text-gray-800 mb-2 tracking-tight">
									{targetMitraId ? `Menyiapkan chat dengan ${targetMitraName || "mitra"}...` : "Mulai Percakapan"}
								</h2>
								<p className="text-sm text-gray-400 max-w-xs leading-relaxed">
									{targetMitraId
										? "Mohon tunggu sebentar, percakapan sedang dibuka."
										: "Pilih salah satu pesan di samping untuk memulai obrolan dengan mitra."}
								</p>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* MODAL PILIH SUMBER GAMBAR: Galeri / Kamera */}
			{showAttachMenu && (
				<div
					className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200"
					onClick={() => setShowAttachMenu(false)}
				>
					<div
						className="bg-white rounded-[2rem] p-6 w-full max-w-xs shadow-2xl border border-gray-100 space-y-3"
						onClick={(e) => e.stopPropagation()}
					>
						<h3 className="text-center text-sm font-black text-indigo-900 mb-1">Kirim Gambar</h3>
						<button
							onClick={openCamera}
							className="w-full flex items-center gap-3 p-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100 transition-all text-left"
						>
							<div className="w-10 h-10 rounded-xl bg-indigo-900 text-white flex items-center justify-center shrink-0">
								<Camera size={20} />
							</div>
							<span className="text-sm font-bold text-indigo-900">Ambil Foto (Kamera)</span>
						</button>
						<button
							onClick={openGallery}
							className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-all text-left"
						>
							<div className="w-10 h-10 rounded-xl bg-gray-700 text-white flex items-center justify-center shrink-0">
								<ImageIcon size={20} />
							</div>
							<span className="text-sm font-bold text-gray-700">Pilih dari Galeri</span>
						</button>
						<button
							onClick={() => setShowAttachMenu(false)}
							className="w-full py-3 rounded-2xl text-gray-400 font-bold text-xs uppercase tracking-wider hover:bg-gray-50 transition-all"
						>
							Batal
						</button>
					</div>
				</div>
			)}

			{/* MODAL WEBCAM (desktop) - preview live + tombol jepret */}
			{showWebcamModal && (
				<div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
					<div className="bg-white rounded-[2rem] p-6 w-full max-w-md shadow-2xl border border-gray-100 space-y-4">
						<h3 className="text-center text-sm font-black text-indigo-900">Ambil Foto dari Webcam</h3>

						{webcamError ? (
							<div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center space-y-3">
								<p className="text-xs text-red-600 font-medium">{webcamError}</p>
								<button
									onClick={() => {
										closeWebcamModal();
										galleryInputRef.current?.click();
									}}
									className="text-xs font-black text-indigo-900 underline"
								>
									Pilih file dari galeri sebagai gantinya
								</button>
							</div>
						) : (
							<div className="rounded-2xl overflow-hidden bg-black aspect-video">
								<video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
							</div>
						)}

						<div className="flex gap-3">
							<button
								onClick={closeWebcamModal}
								className="flex-1 py-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xs uppercase tracking-wider transition-all"
							>
								Batal
							</button>
							{!webcamError && (
								<button
									onClick={captureWebcamPhoto}
									className="flex-1 py-3.5 rounded-2xl bg-indigo-900 hover:bg-indigo-800 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
								>
									<Camera size={16} /> Jepret
								</button>
							)}
						</div>
					</div>
				</div>
			)}
		</CustomerLayout>
	);
}

function ChevronLeft() {
	return (
		<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
		</svg>
	);
}