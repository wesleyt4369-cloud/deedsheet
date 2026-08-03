import ErrorBoundary from "./components/ErrorBoundary";

export const metadata = {
  title: "DeedSheet — CMA reports in two minutes",
  description:
    "Turn your comps into a branded comparative market analysis, presentation and listing copy in minutes.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
