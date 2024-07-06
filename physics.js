// module aliases
var Engine = Matter.Engine,
  Render = Matter.Render,
  Runner = Matter.Runner,
  Bodies = Matter.Bodies,
  Vertices = Matter.Vertices,
  Vector = Matter.Vector,
  Composite = Matter.Composite;

// create an engine
var engine = Engine.create({
  gravity: {
    y: -1,
  },
  timing: {
    timeScale: 1,
  },
});

// create a renderer
var render = Render.create({
  element: document.body,
  engine: engine,
});

// create two boxes and a ground
var boxA = Bodies.rectangle(400, 300, 80, 80, { friction: 1 });
var boxB = Bodies.rectangle(440, 500, 80, 80, { friction: 1 });
var circleA = Bodies.rectangle(520, 400, 80, 80, { friction: 1 });
var topWall = Bodies.rectangle(400, 0, 750, 50, {
  isStatic: true,
});
var bottomWall = Bodies.rectangle(400, 600, 750, 50, { isStatic: true });
var leftWall = Bodies.rectangle(0, 300, 50, 550, { isStatic: true });
var rightWall = Bodies.rectangle(800, 300, 50, 550, { isStatic: true });

// add all of the bodies to the world
Composite.add(engine.world, [
  boxA,
  circleA,
  boxB,
  topWall,
  bottomWall,
  leftWall,
  rightWall,
]);

// run the renderer
Render.run(render);

// create runner
var runner = Runner.create();

let ticks = 0;

// Runner.run(runner, engine);

window.addEventListener("keydown", (e) => {
  let start = Date.now();
  while (true) {
    ticks++;
    // console.log("tick");
    Runner.tick(runner, engine, 1000 / 60);
    let velA = Vector.magnitude(boxA.velocity);
    let velB = Vector.magnitude(boxB.velocity);
    let velC = Vector.magnitude(circleA.velocity);
    if ((Math.max(velA, velB, velC) < 1e-12 && ticks > 100) || ticks > 1000) {
      break;
    }
  }

  console.log("took", Date.now() - start, "ms.", "ticks", ticks);
});

// run the engine

// setTimeout(
//   () =>
//     setInterval(() => {
//       let velA = Vector.magnitude(boxA.velocity);
//       let velB = Vector.magnitude(boxB.velocity);
//       if (Math.max(velA, velB) < 1e-6) {
//         Runner.stop(runner);
//         return;
//       }
//       console.log("boxA", velA);
//       console.log("boxB", velB);
//     }, 100),
//   1000
// );

// https://stackoverflow.com/questions/25384052/convert-svg-path-d-attribute-to-a-array-of-points
let pathStr = document
  .querySelector("svg")
  .querySelector("path")
  .getAttribute("d");
let commands = pathStr.split(/(?=[LMC])/);

let pointArrays = commands.map(function (d) {
  var pointsArray = d.slice(1, d.length).split(",");
  var pairsArray = [];
  for (var i = 0; i < pointsArray.length; i += 2) {
    pairsArray.push(+pointsArray[i], +pointsArray[i + 1]);
  }
  return pairsArray;
});
pointArrays.shift();

console.log(pointArrays);

const canvas = document.getElementById("canvas");
/** @type {CanvasRenderingContext2D} */
const ctx = canvas.getContext("2d");

pointArrays.forEach((points) => {
  //   console.log(points);
  // draw a point at each point
  ctx.beginPath();
  ctx.arc(points[0], points[1], 0.1, 0, 2 * Math.PI);
  ctx.stroke();
});

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

let boundaryPoints = graham_scan(pointArrays);
console.log(boundaryPoints);

ctx.strokeStyle = "red";

ctx.beginPath();
boundaryPoints.forEach((points) => {
  //   console.log(points);
  // draw a point at each point
  ctx.lineTo(points[0], points[1]);
});
ctx.closePath();
ctx.stroke();
