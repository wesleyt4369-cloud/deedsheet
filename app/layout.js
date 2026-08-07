import ErrorBoundary from "./components/ErrorBoundary";

export const metadata = {
  title: "DeedSheet — CMA reports in two minutes",
  description:
    "Turn your comps into a branded comparative market analysis, presentation and listing copy in minutes.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

// Custom scrollbars everywhere — the browser defaults look unfinished on a dark UI.
const globalCss = `
  * { scrollbar-width: thin; scrollbar-color: rgba(168,133,60,.5) transparent; }

  ::-webkit-scrollbar { width: 11px; height: 11px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background-color: rgba(168,133,60,.42);
    border-radius: 999px;
    border: 3px solid transparent;
    background-clip: content-box;
    transition: background-color .15s ease;
  }
  ::-webkit-scrollbar-thumb:hover { background-color: rgba(168,133,60,.72); background-clip: content-box; }
  ::-webkit-scrollbar-thumb:active { background-color: rgba(168,133,60,.9); background-clip: content-box; }
  ::-webkit-scrollbar-corner { background: transparent; }

  /* On parchment surfaces the brass reads too light — darken it there */
  .ds-onlight { scrollbar-color: rgba(107,98,82,.55) transparent; }
  .ds-onlight ::-webkit-scrollbar-thumb { background-color: rgba(107,98,82,.42); background-clip: content-box; }
  .ds-onlight ::-webkit-scrollbar-thumb:hover { background-color: rgba(107,98,82,.7); background-clip: content-box; }

  /* Text selection in brand colours */
  ::selection { background: rgba(168,133,60,.32); }
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: globalCss }} />
      </head>
      <body style={{ margin: 0 }}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
