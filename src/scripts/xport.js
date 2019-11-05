import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

const container = document.getElementById('xterm-container');
const host = window.location.host;
const pathname = window.location.pathname;
const protocol = window.location.protocol;
let wspotocol = "ws://";
if (protocol.indexOf("https") >= 0) {
    wspotocol = "wss://";
}

let wsurl = wspotocol + host + pathname;
if (wsurl.charAt(wsurl.length - 1) == "/") {
    wsurl = wsurl + "ws";
} else {
    wsurl = wsurl + "/ws";
}

console.log("connect to websocket address:", wsurl);

const ws = new WebSocket(wsurl);

const options = {
    cursorStyle: "underline",
    cursorBlink: true,
    tabStopWidth: 4,
};

const term = new Terminal(options);
const fitAddon = new FitAddon();
term.loadAddon(fitAddon);
term.open(container);

// Make the terminal's size and geometry fit the size of #terminal-container
fitAddon.fit();
window.onresize = () => {
    fitAddon.fit();
};

term.onTitleChange((t) => {
    document.title = t;
});

function wsSend(str) {
    if (ws.readyState !== WebSocket.OPEN) {
        let msg = "wsSend failed: websocket not open\n";
        console.error(msg);
        term.write(msg);
        return false;
    }

    ws.send(str);

    return true;
}

function sendTermSize(rowsx, colsx) {
    let info = {
        rows: rowsx,
        cols: colsx,
    };

    let s = JSON.stringify(info);
    wsSend('\x03' + s);
}

term.onData(data => {
    // console.log(e);
    if (ws.readyState !== WebSocket.OPEN) {
        console.error("onData failed: websocket not open");
        return;
    }

    wsSend("\0" + data);
});

term.onResize(e => {
    console.log("onResize");
    sendTermSize(e.rows, e.cols);
});

ws.onopen = () => {
    console.log("websocket open");
    sendTermSize(term.rows, term.cols);
};

ws.onmessage = (evt) => {
    let data = evt.data;

    const reader = new FileReader();
    // This fires after the blob has been read/loaded.
    reader.addEventListener('loadend', (e) => {
        const buffer = e.srcElement.result;
        let bytes = new Uint8Array(buffer);
        let op = bytes[0];
        if (op == 0) {
            term.write(bytes.slice(1));
        }
    });

    // Start reading the blob as text.
    reader.readAsArrayBuffer(data);
};

ws.onclose = () => {
    console.log("websocket closed");
};

let keepaliveInterval;

function keepalive() {
    if (!wsSend("\x01" + "ka")) {
        clearInterval(keepaliveInterval);
    }
}

keepaliveInterval = setInterval(() => {
    keepalive();
}, 5 * 1000);
