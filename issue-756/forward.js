import { connect, createServer } from "node:net";

function createProxy(port, remoteHost) {
    const server = createServer((client) => {
        const server = connect({ host: remoteHost, port: 5555 }, () => {
            client.on("data", (data) => server.write(data));
            client.on("close", () => server.end());

            server.on("data", (data) => client.write(data));
            server.on("close", () => client.end());
        });
    });
    server.listen(port);
}

createProxy(6555, "192.168.50.101");
createProxy(6562, "192.168.50.96");
