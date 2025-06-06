import { AdbServerNodeTcpConnector } from '@yume-chan/adb-server-node-tcp'
import { Adb, AdbServerClient } from '@yume-chan/adb'

async function createAdb(transportId) {
    const connector = new AdbServerNodeTcpConnector({
        host: "127.0.0.1",
        port: 5037,
    });
    const adbServerClient = new AdbServerClient(connector);
    //const device: AdbServerClient.DeviceSelector = {"serial": serial};
    const device = { "transportId": transportId };
    const transport = await adbServerClient.createTransport(device);
    return new Adb(transport);
}

console.log(await createAdb(3n));
console.log(await createAdb(7n));
