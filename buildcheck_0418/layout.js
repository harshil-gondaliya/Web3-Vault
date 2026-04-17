import "./globals.css";
import ClientLayout from "./components/ClientLayout";

export const metadata = {
  title: "Web3 Vault - Secure Digital Assets",
  description: "Professional Web3 Vault interface",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
