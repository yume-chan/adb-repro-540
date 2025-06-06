import { AdbServerClient, Adb } from "@yume-chan/adb";
import { WritableStream, MaybeConsumable, tryClose } from "@yume-chan/stream-extra";

export class WebSocketAdbConnector {
    constructor(wsUrl) {
        this.wsUrl = wsUrl;
    }

    async connect() {
        const ws = new WebSocket(this.wsUrl);

        ws.onerror = (error) => {
            console.log(error)
            ws.close()
            throw error
        };
        ws.binaryType = "arraybuffer";

        // 等待连接建立
        const connected = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error("WebSocket connection timeout"));
                ws.close();
            }, 1000); // 5秒超时

            ws.addEventListener("open", () => {
                clearTimeout(timeout);
                resolve();
            });

            ws.addEventListener("error", (e) => {
                clearTimeout(timeout);
                reject(new Error("WebSocket connection failed"));
                ws.close();
            });
        });

        // ReadableStream 管理
        const readable = new ReadableStream({
            start: (controller) => {
                const onMessage = (event) => {
                    if (event.data instanceof ArrayBuffer) {
                        controller.enqueue(new Uint8Array(event.data));
                    }
                };

                const onError = (e) => {
                    controller.error(new Error("WebSocket error"));
                    ws.close();
                };

                const onClose = () => {
                    tryClose(controller);
                };

                ws.addEventListener("message", onMessage);
                ws.addEventListener("error", onError);
                ws.addEventListener("close", onClose);

                // 返回清理函数
                return () => {
                    ws.removeEventListener("message", onMessage);
                    ws.removeEventListener("error", onError);
                };
            },
            cancel: () => {
                ws.close();
            }
        });

        // WritableStream 管理
        const writable = new MaybeConsumable.WritableStream({
            write: async (chunk) => {
                await connected;
                if (ws.readyState !== WebSocket.OPEN) {
                    throw new Error("WebSocket not open");
                }
                ws.send(chunk);
            },
            abort: () => {
                ws.close();
            }
        });

        return {
            readable,
            writable,
            closed: new Promise((resolve) => {
                const onClose = () => resolve();
                ws.addEventListener("close", onClose);

                // 返回清理函数
                return () => ws.removeEventListener("close", onClose);
            }),
            close: () => {
                if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                    ws.close();
                }
            }
        };
    }
}

const connector = new WebSocketAdbConnector("ws://localhost:8080");
const client = await new AdbServerClient(connector);

const devices = await client.getDevices(); // 1秒超时
const device = devices[0];
console.log(device);

// const observer = await client.trackDevices();

let transport = await client.createTransport(device);
let adb = new Adb(transport);

// const result = await adb.subprocess.shellProtocol.spawnWaitText("ls");
// console.log(result);

const sync = await adb.sync();
console.log("---------", "sync", sync);

let data = [];
try {
    let stream = sync.read("/data/local/tmp/shizuku_starter");
    console.log("---------", "stream", stream);

    await stream.pipeTo(
        new WritableStream({
            write: (v) => {
                console.log("---------", "[WritableStream]", "write", v);
                data.push(v);
            },
        })
    );
} catch (e) {
    sync.dispose();
    throw e;
}
sync.dispose();
console.log(new Blob(data));
