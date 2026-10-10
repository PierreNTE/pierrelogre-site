import http.server, functools, re, sys
CSP = re.search(r'Content-Security-Policy "([^"]+)"', open('site/www/.htaccess').read()).group(1).replace(" upgrade-insecure-requests","")
class H(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js':'text/javascript', '.woff2':'font/woff2', '.svg':'image/svg+xml'}
    def end_headers(self):
        self.send_header('Content-Security-Policy', CSP)
        self.send_header('X-Content-Type-Options','nosniff')
        super().end_headers()
    def log_message(self,*a): pass
http.server.ThreadingHTTPServer(('127.0.0.1',8766), functools.partial(H, directory='site/www')).serve_forever()
