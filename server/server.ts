import express from 'express';
import next from 'next';

const port = parseInt(process.env.PORT || "2499", 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const server = express();

    server.use(express.json());
    server.use(express.urlencoded({ extended: true }));
    server.all('*', (req, res) => {
        return handle(req, res);
    });
    server.listen(port, (err?: any) => {
        if (err) throw err;
        console.log(`> Ready on http://localhost:${port}`);
    });
});
