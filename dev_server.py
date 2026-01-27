# dev_server.py
# Simple local dev web server that disables browser caching
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Force browser to revalidate on every request
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

if __name__ == "__main__":
    PORT = 8000
    server = ThreadingHTTPServer(("0.0.0.0", PORT), NoCacheHandler)
    print(f"Serving (no-cache) on http://localhost:{PORT}")
    server.serve_forever()
