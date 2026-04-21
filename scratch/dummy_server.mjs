import http from 'http';
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Dummy server for TestSprite');
});
server.listen(8080, '127.0.0.1', () => {
  console.log('Dummy server for TestSprite listening on 8080');
});
