import { createHaxidraw } from "./blot/src/haxidraw/createHaxidraw.js";
import { createNodeSerialBuffer } from "./blot/src/haxidraw/createNodeSerialBuffer.js";
import { SerialPort, SerialPortMock } from "serialport";
import { floatsToBytes } from "./blot/src/haxidraw/converters.js";

// Modified from blot/headless-blot/server.js
const config = {
  MOCK_SERIAL: false, // set false to test without a Blot connected
  BAUD: 9600,
  BOARD_PIN: 7, // GPIO 7 on RPi
};

let port;
const path = "COM3";
if (config.MOCK_SERIAL) {
  // simulates open serial port (no response back)
  SerialPortMock.binding.createPort(path);
  port = new SerialPortMock({
    path,
    baudRate: config.BAUD,
    autoOpen: false,
  });
} else {
  port = new SerialPort({
    path,
    baudRate: config.BAUD,
    autoOpen: false,
  });
}

const comsBuffer = await createNodeSerialBuffer(port);
const haxidraw = await createHaxidraw(comsBuffer);

haxidraw.penUp = async function () {
  await haxidraw.servo(1000);
};

haxidraw.penDown = async function () {
  await haxidraw.servo(1700);
};

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

process.on("SIGINT", async function () {
  await haxidraw.penUp();

  process.exit();
});

await haxidraw.penUp();
await haxidraw.goTo(0, 0);

await haxidraw.penDown();
await sleep(1000);
await haxidraw.goTo(0, 0);
await haxidraw.goTo(0, 100);
await haxidraw.goTo(100, 100);
await haxidraw.goTo(100, 0);
await haxidraw.goTo(0, 0);
await haxidraw.penUp();

process.exit();
