import { createHaxidraw } from "./blot/src/haxidraw/createHaxidraw.js";
import { createNodeSerialBuffer } from "./blot/src/haxidraw/createNodeSerialBuffer.js";
import { SerialPort, SerialPortMock } from "serialport";
import * as chokidar from "chokidar";
import * as fs from "fs/promises";
import { flattenSVG } from "flatten-svg";
import { createHTMLDocument, createSVGWindow } from "svgdom";
import {
  scale,
  translate,
} from "./blot/src/drawingToolkit/affineTransformations.js";
import { bounds } from "./blot/src/drawingToolkit/bounds.js";
import { toolkit } from "./blot/src/drawingToolkit/toolkit.js";
import { simplify } from "./blot/src/drawingToolkit/simplify.js";
// import { flattenSVG } from "./blot/src/drawingToolkit/flatten-svg/index.js";

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

const width = 110;
const height = 110;

chokidar.watch("img/*.svg").on("add", async (path) => {
  console.log("New file added", path);

  const data = await fs.readFile(path);
  console.log("Read file", path, "with", data.length, "bytes");
  const document = createHTMLDocument();
  document.body.innerHTML = data;
  const svg = document.querySelector("svg");
  let lines;
  try {
    let rect = svg.querySelector("rect");
    // fix sizing
    svg.setAttribute("width", rect.getAttribute("width"));
    svg.setAttribute("height", rect.getAttribute("height"));
    // remove background rect
    svg.removeChild(rect);
    lines = flattenSVG(svg, { maxError: 0.001 }).map((pl) => pl.points);
    console.log("Loaded", path, "with", lines.flat().length / 2, "points");
  } catch (e) {
    console.error(e);
    await fs.rm(path);
    console.log("Deleted file due to error", path);
  }

  lines.shift();
  // save lines to a file
  // await fs.writeFile("lines.json", JSON.stringify(lines));

  scale(lines, [1, -1]);
  let { width: w, height: h } = bounds(lines);
  console.log(w, h);
  let factor = Math.min(width / w, height / h);
  scale(lines, factor);
  console.log(Math.min(width / w, height / h));
  w *= factor;
  h *= factor;
  toolkit.originate(lines);
  console.log(w, h);
  translate(lines, [w / 2, h / 2]);
  console.log(lines.flat().length);
  simplify(lines, 0.01);
  console.log(lines.flat().length);
  lines = lines.map((line) =>
    line
      .map((pt) => [pt[0], pt[1]])
      .filter((pt) => !isNaN(pt[0]) && !isNaN(pt[1]))
  );
  queue.push(lines);
  console.log("Processed", path, "with", lines.flat().length / 2, "points");
  await fs.rm(path);
  console.log("Deleted file", path);
});

async function main() {
  if (queue.length === 0) {
    setTimeout(main, 1000);
    return;
  }

  console.log("Drawing", queue.length, "lines");

  const lines = queue.shift();
  await haxidraw.penUp();
  await sleep(50);

  for (let i = 0; i < lines.length; i++) {
    console.log("Drawing line", i);
    let line = lines[i];
    console.log("goto", line[0]);
    await haxidraw.goTo(...line[0]);
    await haxidraw.penDown();
    await sleep(100);
    for (let j = 1; j < line.length; j++) {
      console.log("goto", line[j]);
      await haxidraw.goTo(...line[j]);
    }
    await haxidraw.penUp();
    await sleep(75);
  }

  main();
}

main();

// haxidraw.goTo(0, 110);
