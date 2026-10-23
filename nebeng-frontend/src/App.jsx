import AppRouter from "./router/Router";
import { Toaster } from "react-hot-toast";
import { UserProvider } from "./context/UserContext";
import MobilePreviewFrame from "./components/MobilePreviewFrame";

function App() {
	return (
		<MobilePreviewFrame>
			<UserProvider>
				<Toaster
					position="top-right"
					toastOptions={{
						duration: 4000,
					}}
				/>
				<AppRouter />
			</UserProvider>
		</MobilePreviewFrame>
	);
}

export default App;