import ErrorBoundary from "./components/ErrorBoundary";

export const metadata = {
  title: "DeedSheet — CMA reports in two minutes",
  description:
    "Turn your comps into a branded comparative market analysis, presentation and listing copy in minutes.",
};

// Without this, phones render the page at a fake 980px width and scale it down —
// which is what made text oversized and layouts look off-centre.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
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
