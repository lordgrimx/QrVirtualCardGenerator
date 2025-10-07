const { createServer } = require('http');
const next = require('next');
const { parse } = require('url');

const dev = false; // Production mode
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Memory optimization için Next.js config
const app = next({ 
  dev, 
  hostname, 
  port,
  // Memory optimizasyonları
  conf: {
    compress: true,
    generateEtags: true,
    poweredByHeader: false,
  }
});
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      // URL'i parse et
      const parsedUrl = parse(req.url, true);
      
      // Next.js handler'a ilet
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
  .listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Environment: ${process.env.NODE_ENV}`);
    console.log(`> API URL: ${process.env.NEXT_PUBLIC_API_URL}`);
  });
});

