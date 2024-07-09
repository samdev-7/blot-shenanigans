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
import Matter from "matter-js";
// import { flattenSVG } from "./blot/src/drawingToolkit/flatten-svg/index.js";

const BLOT_PATH = "COM3"; // change to the port your Blot is connected to
const SCALE_FACTOR = 0.2; // how big the drawing should be (0.2 is 20% of the svg size)
// Available space to draw
const WIDTH = 120;
const HEIGHT = 120;

// Modified from blot/headless-blot/server.js
const config = {
  MOCK_SERIAL: false, // set false to test without a Blot connected
  BAUD: 9600,
  BOARD_PIN: 7, // GPIO 7 on RPi
};

let port;
if (config.MOCK_SERIAL) {
  // simulates open serial port (no response back)
  SerialPortMock.binding.createPort(BLOT_PATH);
  port = new SerialPortMock({
    path: BLOT_PATH,
    baudRate: config.BAUD,
    autoOpen: false,
  });
} else {
  port = new SerialPort({
    path: BLOT_PATH,
    baudRate: config.BAUD,
    autoOpen: false,
  });
}

const comsBuffer = await createNodeSerialBuffer(port);
const haxidraw = await createHaxidraw(comsBuffer);

// Add penUp and penDown functions
haxidraw.penUp = async function () {
  await haxidraw.servo(1000);
};

haxidraw.penDown = async function () {
  await haxidraw.servo(1700);
};

// Utility function to pause execution
const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

let queue = [];

let physEngine = Matter.Engine.create({
  gravity: { x: 0, y: -1 },
});
let physLeftWall = Matter.Bodies.rectangle(-25, HEIGHT / 2, 50, HEIGHT, {
  isStatic: true,
});
let physRightWall = Matter.Bodies.rectangle(
  WIDTH + 25,
  HEIGHT / 2,
  50,
  HEIGHT,
  {
    isStatic: true,
  }
);
let physTopWall = Matter.Bodies.rectangle(WIDTH / 2, -25, WIDTH, 50, {
  isStatic: true,
  friction: 0.5,
});

Matter.Composite.add(physEngine.world, [
  physLeftWall,
  physRightWall,
  physTopWall,
]);

// https://github.com/lovasoa/graham-fast/
function graham_scan(points) {
  // The enveloppe is the points themselves
  if (points.length <= 3) return points;

  // Find the pivot
  var pivot = points[0];
  for (var i = 0; i < points.length; i++) {
    if (
      points[i][1] < pivot[1] ||
      (points[i][1] === pivot[1] && points[i][0] < pivot[0])
    )
      pivot = points[i];
  }

  // Attribute an angle to the points
  for (var i = 0; i < points.length; i++) {
    points[i]._graham_angle = Math.atan2(
      points[i][1] - pivot[1],
      points[i][0] - pivot[0]
    );
  }
  points.sort(function (a, b) {
    return a._graham_angle === b._graham_angle
      ? a[0] - b[0]
      : a._graham_angle - b._graham_angle;
  });

  // Adding points to the result if they "turn left"
  var result = [points[0]],
    len = 1;
  for (var i = 1; i < points.length; i++) {
    var a = result[len - 2],
      b = result[len - 1],
      c = points[i];
    while (
      (len === 1 && b[0] === c[0] && b[1] === c[1]) ||
      (len > 1 &&
        (b[0] - a[0]) * (c[1] - a[1]) <= (b[1] - a[1]) * (c[0] - a[0]))
    ) {
      len--;
      b = a;
      a = result[len - 2];
    }
    result[len++] = c;
  }
  result.length = len;
  return result;
}

// Watch for new SVG files in the img directory
chokidar.watch("img/*.svg").on("add", async (path) => {
  console.log("New file added", path);

  // Read the raw data
  const data = await fs.readFile(path);
  console.log("Read file", path, "with", data.length, "bytes");
  const document = createHTMLDocument();
  document.body.innerHTML = data;
  const svg = document.querySelector("svg");
  let lines;
  // Convert the SVG to a list of lines
  try {
    let rect = svg.querySelector("rect");
    // fix sizing
    svg.setAttribute("width", rect.getAttribute("width"));
    svg.setAttribute("height", rect.getAttribute("height"));
    // remove background rect
    svg.removeChild(rect);
    lines = flattenSVG(svg, { maxError: 0.001 }).map((pl) => pl.points);
    console.log("Loaded", path, "with", lines.flat().length, "points");
  } catch (e) {
    console.error(e);
    // await fs.rm(path);
    console.log("Deleted file due to error", path);
  }

  // remove the first line (for some reason it's always [0,0])
  lines.shift();
  // await fs.writeFile("lines.json", JSON.stringify(lines));

  // Flip vertically
  scale(lines, [1, -1]);

  // Scale it
  let { width: w, height: h } = bounds(lines);
  // console.log(w, h);
  scale(lines, SCALE_FACTOR);
  // console.log(Math.min(WIDTH / w, HEIGHT / h));
  w *= SCALE_FACTOR;
  h *= SCALE_FACTOR;

  // Move it to the origin (bottom left corner)
  toolkit.originate(lines);
  // console.log(w, h);

  // Move it to fit with the bottom left corner
  // translate(lines, [w / 2, h / 2]);
  // console.log(lines.flat().length);

  // Simplify the lines to reduce the number of points
  simplify(lines, 0.01);
  // console.log(lines.flat().length);

  // Convert the lines to a format that the Blot can understand
  lines = lines.map((line) =>
    line
      .map((pt) => [pt[0], pt[1]])
      .filter((pt) => !isNaN(pt[0]) && !isNaN(pt[1]))
  );

  console.log("Parsed", path, "with", lines.flat().length, "points");

  // Compute the convex hull
  let boundaryPoints = graham_scan(lines.flat());

  // Compute the normals of each boundary point
  let normals = boundaryPoints.map((pt, i) => {
    let next = boundaryPoints[(i + 1) % boundaryPoints.length];
    let prev =
      boundaryPoints[(i - 1 + boundaryPoints.length) % boundaryPoints.length];
    let dx = next[0] - prev[0];
    let dy = next[1] - prev[1];
    let len = Math.sqrt(dx * dx + dy * dy);
    return [dy / len, -dx / len];
  });

  // Offset the boundary points by the normals by 1 units
  boundaryPoints = boundaryPoints.map((pt, i) => {
    let normal = normals[i];
    return [pt[0] + 1 * normal[0], pt[1] + 1 * normal[1]];
  });

  /** @type {Matter.Body} */
  let physShape;

  let boundaryWidth = Math.abs(
    boundaryPoints.reduce((a, b) => Math.max(a, b[0]), -Infinity) -
      boundaryPoints.reduce((a, b) => Math.min(a, b[0]), Infinity)
  );

  // console.log("Boundary width", boundaryWidth);

  let minXPos = boundaryWidth / 2 + 5;
  let maxXPos = WIDTH - boundaryWidth / 2 - 5;

  let boundaryVertices = boundaryPoints.map((pt) => {
    return { x: pt[0], y: pt[1] };
  });

  // console.log(boundaryVertices);

  function addShape() {
    let xPos = Math.random() * (maxXPos - minXPos) + minXPos;
    physShape = Matter.Bodies.fromVertices(xPos, HEIGHT - 5, boundaryVertices, {
      friction: 0.3,
    });
    // console.log(
    //   xPos,
    //   physShape.position.x,
    //   physShape.position.y,
    //   physShape.vertices[0].x,
    //   physShape.vertices[0].y
    // );
    Matter.Body.setVelocity(physShape, { x: Math.random() * 5 - 2.5, y: 0 });
    Matter.Body.setAngularVelocity(physShape, Math.random() * 0.1 - 0.05);

    let centroid = physShape.vertices.reduce(
      (a, b) => {
        return { x: a.x + b.x, y: a.y + b.y };
      },
      { x: 0, y: 0 }
    );
    centroid = {
      x: centroid.x / physShape.vertices.length,
      y: centroid.y / physShape.vertices.length,
    };
    Matter.Body.setCentre(physShape, centroid);

    Matter.Composite.add(physEngine.world, physShape);
  }

  function inSpace() {
    return physShape.vertices.every((v) => {
      let tolerance = 0.1;
      if (
        !(
          v.x > -tolerance &&
          v.x < WIDTH + tolerance &&
          v.y > -tolerance &&
          v.y < HEIGHT + tolerance
        )
      )
        console.log(v.x, v.y);
      return (
        v.x > -tolerance &&
        v.x < WIDTH + tolerance &&
        v.y > -tolerance &&
        v.y < HEIGHT + tolerance
      );
    });
  }

  function sprint(retry = 0) {
    let ticks = 0;
    addShape();

    while (true) {
      ticks++;

      Matter.Engine.update(physEngine, 1000 / 60);
      let vel = Matter.Vector.magnitude(physShape.velocity);
      if ((vel < 1e-3 && ticks > 100) || ticks > 10000) {
        physShape.isStatic = true;
        break;
      }
    }

    let validPos = inSpace();

    if (!validPos && retry >= 5) {
      console.log("Failed to find a valid position");
      return false;
    }

    if (!validPos) {
      console.log("Out of bounds, retrying", retry);
      Matter.Composite.remove(physEngine.world, physShape);
      return sprint(retry + 1);
    }

    return true;
  }

  let sprintStart = Date.now();
  let full = !sprint();
  if (full) {
    console.log("The paper is full, stopping here");
    process.exit(1);
  }
  console.log("Computed position in", Date.now() - sprintStart, "ms");

  // move the boundary points to the center of the drawing
  boundaryPoints = boundaryPoints.map((pt) => [
    pt[0] + WIDTH / 2,
    pt[1] + HEIGHT / 2,
  ]);

  // move the lines to the center of the drawing
  lines = lines.map((line) =>
    line.map((pt) => [pt[0] + WIDTH / 2, pt[1] + HEIGHT / 2])
  );

  // The outline of the drawing
  let outline = [
    [0, 0],
    [WIDTH, 0],
    [WIDTH, HEIGHT],
    [0, HEIGHT],
    [0, 0],
  ];

  // Add the lines to the queue
  // queue.push([[...boundaryPoints, boundaryPoints[0]], ...lines, outline]);

  // await fs.rm(path);
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
