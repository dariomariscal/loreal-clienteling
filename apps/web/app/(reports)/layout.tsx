/**
 * Route group for print-ready report pages. Renders without the app sidebar /
 * topbar so /reports/executive can be both previewed on screen and sent to
 * window.print() without any extraneous chrome.
 */
export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
