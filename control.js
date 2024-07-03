import { createHaxidraw } from "./blot/src/haxidraw/createHaxidraw.js";
import { createNodeSerialBuffer } from "./blot/src/haxidraw/createNodeSerialBuffer.js";
import { SerialPort, SerialPortMock } from "serialport";
import * as chokidar from "chokidar";
import * as fs from "fs/promises";
import { flattenSVG } from "flatten-svg";
import { Window } from "svgdom";

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

// process.on("SIGINT", async function () {
//   await haxidraw.penUp();
//   await haxidraw.goTo([0, 0]);

//   process.exit();
// });

let queue = [];

chokidar.watch("img/*.svg").on("add", async (path) => {
  console.log("New file added", path);
  if (!path.endsWith(".svg")) {
    return;
  }

  // read the file
  const data = (await fs.readFile(path)).toString();
  // const dom = new JSDOM(data);
  // const window = new Window();
  // svg.createSVGPoint();
  // console.log(data);
  // console.log(flattenSVG(svg));
});
