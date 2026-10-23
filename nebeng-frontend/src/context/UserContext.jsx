import { createContext, useContext, useEffect, useState, useCallback } from "react";

const UserContext = createContext(null);

export function UserProvider({ children }) {
	const [user, setUser] = useState(() => {
		try {
			const saved = localStorage.getItem("user");
			return saved ? JSON.parse(saved) : null;
		} catch {
			return null;
		}
	});
	const [loadingUser, setLoadingUser] = useState(!user);

	const fetchUser = useCallback(async () => {
		const token = localStorage.getItem("token");

		// Tidak ada token (halaman publik seperti Login/Register) -> skip fetch
		if (!token) {
			setLoadingUser(false);
			return;
		}

		try {
			const res = await fetch("http://127.0.0.1:8000/api/profile", {
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
			});

			if (!res.ok) throw new Error("Gagal mengambil data user");

			const data = await res.json();
			setUser(data);
			try {
				localStorage.setItem("user", JSON.stringify(data));
			} catch {}
		} catch (err) {
			console.error("Fetch user error:", err);
		} finally {
			setLoadingUser(false);
		}
	}, []);

	// Fetch SEKALI saat provider pertama kali mount
	useEffect(() => {
		fetchUser();
	}, [fetchUser]);

	const clearUser = useCallback(() => {
		setUser(null);
		try {
			localStorage.removeItem("user");
		} catch {}
	}, []);

	return <UserContext.Provider value={{ user, loadingUser, refetchUser: fetchUser, clearUser }}>{children}</UserContext.Provider>;
}

// Hook supaya komponen lain tinggal panggil useUser()
export function useUser() {
	const ctx = useContext(UserContext);
	if (!ctx) throw new Error("useUser harus dipakai di dalam <UserProvider>");
	return ctx;
}
