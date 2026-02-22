const express = require("express");
const WebSocket = require("ws");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

const SECRET = "supersecretkey";
const DB_FILE = "database.json";

function loadDB() {
    return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    const db = loadDB();

    if (db.users[username])
        return res.status(400).send("Usuário já existe");

    const hash = await bcrypt.hash(password, 10);
    db.users[username] = { password: hash, trophies: 0 };
    saveDB(db);

    res.send("Registrado com sucesso");
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const db = loadDB();

    const user = db.users[username];
    if (!user)
        return res.status(400).send("Usuário não encontrado");

    const match = await bcrypt.compare(password, user.password);
    if (!match)
        return res.status(400).send("Senha incorreta");

    const token = jwt.sign({ username }, SECRET);

    res.json({
        token,
        trophies: user.trophies
    });
});

app.get("/ranking", (req, res) => {
    const db = loadDB();
    const ranking = Object.entries(db.users)
        .map(([username, data]) => ({
            username,
            trophies: data.trophies
        }))
        .sort((a, b) => b.trophies - a.trophies);

    res.json(ranking);
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () =>
    console.log("Servidor rodando na porta " + PORT)
);

const wss = new WebSocket.Server({ server });

let waiting = null;

wss.on("connection", (ws) => {

    ws.on("message", (message) => {
        const data = JSON.parse(message);

        if (data.type === "join") {
            ws.username = data.username;

            if (!waiting) {
                waiting = ws;
                ws.send(JSON.stringify({ type: "waiting" }));
            } else {
                ws.opponent = waiting;
                waiting.opponent = ws;

                ws.symbol = "X";
                waiting.symbol = "O";

                ws.send(JSON.stringify({ type: "start", symbol: "X" }));
                waiting.send(JSON.stringify({ type: "start", symbol: "O" }));

                waiting = null;
            }
        }

        if (data.type === "move" && ws.opponent) {
            ws.opponent.send(JSON.stringify({
                type: "move",
                index: data.index
            }));
        }

        if (data.type === "result") {
            const db = loadDB();

            if (data.winner && db.users[data.winner]) {
                db.users[data.winner].trophies += 30;
            }

            if (data.loser && db.users[data.loser]) {
                db.users[data.loser].trophies -= 15;
                if (db.users[data.loser].trophies < 0)
                    db.users[data.loser].trophies = 0;
            }

            saveDB(db);
        }
    });
});