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

// module aliases
var Engine = Matter.Engine,
  Render = Matter.Render,
  Runner = Matter.Runner,
  Body = Matter.Body,
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
  canvas: document.getElementById("pcanvas"),
  engine: engine,
});

boundaryPoints = boundaryPoints.map((p) => {
  return { x: p[0], y: p[1] };
});

let normals = boundaryPoints.map((p, i) => {
  let next = boundaryPoints[(i + 1) % boundaryPoints.length];
  let normal = Vector.normalise(Vector.perp(Vector.sub(next, p)));
  return normal;
});

normals = normals.map((n) => {
  return { x: -n.x, y: -n.y };
});

// draw normals
ctx.strokeStyle = "blue";
ctx.beginPath();
boundaryPoints.forEach((p, i) => {
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + normals[i].x * 10, p.y + normals[i].y * 10);
});
ctx.stroke();

// move each point by the normal 10 units
boundaryPoints = boundaryPoints.map((p, i) => {
  return Vector.add(p, Vector.mult(normals[i], 10));
});

console.log(boundaryPoints);

ctx.strokeStyle = "green";

ctx.beginPath();
boundaryPoints.forEach((points) => {
  //   console.log(points);
  // draw a point at each point
  ctx.lineTo(points.x, points.y);
});
ctx.closePath();
ctx.stroke();

// create a renderer
var render = Render.create({
  canvas: document.getElementById("pcanvas"),
  engine: engine,
  options: {
    width: 1200,
    height: 1200,
  },
});
// create two boxes and a ground
// var boxA = Bodies.rectangle(400, 300, 80, 80, { friction: 1 });
// var boxB = Bodies.rectangle(440, 500, 80, 80, { friction: 1 });
// var boxC = Bodies.rectangle(520, 400, 80, 80, { friction: 1 });
var topWall = Bodies.rectangle(600, -25, 1200, 50, {
  isStatic: true,
  friction: 0.5,
});
// var bottomWall = Bodies.rectangle(400, 600, 750, 50, { isStatic: true });
var leftWall = Bodies.rectangle(-25, 600, 50, 1200, { isStatic: true });
var rightWall = Bodies.rectangle(1200 + 25, 600, 50, 1200, { isStatic: true });

// find the width of the text from the boundary points and set textWidth
let textWidth = Math.abs(
  boundaryPoints.reduce((a, b) => Math.max(a, b.x), -Infinity) -
    boundaryPoints.reduce((a, b) => Math.min(a, b.x), Infinity)
);
console.log(textWidth);
function randomX() {
  return Math.random() * (textMaxX - textMinX) + textMinX;
}

let textMinX = 0 + textWidth / 2 + 50;
let textMaxX = 1200 - textWidth / 2 - 50;

console.log(textMinX, textMaxX);

var text;

console.log(textWidth);

// add all of the bodies to the world
Composite.add(engine.world, [
  //   boxA,
  //   boxB,
  //   boxC,
  //   text,
  topWall,
  //   bottomWall,
  leftWall,
  rightWall,
]);

// run the renderer
Render.run(render);

// create runner
var runner = Runner.create();

let ticks = 0;

// Runner.run(runner, engine);

let running = false;

let count = 0;

function addText() {
  text = Bodies.fromVertices(randomX(), 1150, boundaryPoints, {
    friction: 0.3,
  });
  Body.setVelocity(text, { x: Math.random() * 50 - 25, y: 0 });
  Body.setAngularVelocity(text, Math.random() - 0.5);

  let centroid = text.vertices.reduce(
    (a, b) => {
      return { x: a.x + b.x, y: a.y + b.y };
    },
    { x: 0, y: 0 }
  );
  centroid = {
    x: centroid.x / text.vertices.length,
    y: centroid.y / text.vertices.length,
  };
  Body.setCentre(text, centroid);

  Composite.add(engine.world, [text]);
  count++;
}

function inSpace(body) {
  let vertices = body.vertices;
  return vertices.every((v) => {
    return v.x >= 0 - 1 && v.x <= 1200 + 1 && v.y >= 0 - 1 && v.y <= 1200 + 1;
  });
}

function sprint(iter = 0) {
  let start = Date.now();
  let ticks = 0;
  addText();

  while (true) {
    ticks++;
    Runner.tick(runner, engine, 1000 / 60);
    // let velA = Vector.magnitude(boxA.velocity);
    // let velB = Vector.magnitude(boxB.velocity);
    // let velC = Vector.magnitude(boxC.velocity);
    let velText = Vector.magnitude(text.velocity);
    if ((Math.max(velText) < 1e-3 && ticks > 100) || ticks > 10000) {
      text.isStatic = true;
      break;
    }
  }

  console.log(count, "took", Date.now() - start, "ms. ticks", ticks);

  // if (count > 10) {
  //   Composite.remove(engine.world, text);d
  //   return false;
  // }

  if (!inSpace(text)) {
    console.log("out of space retrying after", iter);
    Composite.remove(engine.world, text);
    count--;
    if (iter > 10) {
      console.log("out of space", iter);
      return false;
    }
    return sprint(iter + 1);
  }

  return {
    x: text.position.x,
    y: text.position.y,
    angle: text.angle,
  };
}

window.addEventListener("keydown", (e) => {
  if (e.key === " ") {
    if (!running) {
      Runner.run(runner, engine);
    } else {
      Runner.stop(runner);
    }
    running = !running;
    return;
  }
  if (e.key === "a") {
    addText();
  }
  if (e.key === "s") {
    sprint();
  }
  if (e.key === "d") {
    let shapes = [];
    let startTime = Date.now();
    let vertices;
    while (true) {
      vertices = sprint();
      if (vertices === false) {
        break;
      } else {
        shapes.push(vertices);
      }
    }

    shapes = Composite.allBodies(engine.world).map((body) => {
      return {
        x: body.position.x,
        y: body.position.y,
        angle: body.angle,
        vertices: body.vertices,
      };
    });

    console.log("total time", Date.now() - startTime);
    console.log(shapes);

    // find the centroid of boundaryPoints
    let center = boundaryPoints.reduce(
      (a, b) => {
        return { x: a.x + b.x, y: a.y + b.y };
      },
      { x: 0, y: 0 }
    );
    center = {
      x: center.x / boundaryPoints.length,
      y: center.y / boundaryPoints.length,
    };

    console.log(center);
    // originate pointArrays
    let originated = pointArrays.map((point) => {
      return { x: point[0] - center.x, y: point[1] - center.y };
    });
    console.log(originated);

    let originatedBoundary = boundaryPoints.map((point) => {
      return { x: point.x - center.x, y: point.y - center.y };
    });

    let canvas = document.getElementById("rcanvas");
    /** @type {CanvasRenderingContext2D} */
    let ctx = canvas.getContext("2d");

    // draw a circle at the origin
    ctx.beginPath();
    ctx.arc(0, 0, 0.1, 0, 2 * Math.PI);
    ctx.stroke();

    shapes.forEach((shape) => {
      console.log("shape", shape);
      // move to the center of the shape
      let transformed = originated.map((point) => {
        return { x: point.x + shape.x, y: point.y + shape.y };
      });
      let transformedBoundary = originatedBoundary.map((point) => {
        return { x: point.x + shape.x, y: point.y + shape.y };
      });
      let transformedCenter = { x: shape.x, y: shape.y };

      // rotate by the angle around the center
      transformed = transformed.map((point) => {
        let angle = shape.angle;
        return {
          x:
            Math.cos(angle) * (point.x - transformedCenter.x) -
            Math.sin(angle) * (point.y - transformedCenter.y) +
            transformedCenter.x,
          y:
            Math.sin(angle) * (point.x - transformedCenter.x) +
            Math.cos(angle) * (point.y - transformedCenter.y) +
            transformedCenter.y,
        };
      });
      transformedBoundary = transformedBoundary.map((point) => {
        let angle = shape.angle;
        return {
          x:
            Math.cos(angle) * (point.x - transformedCenter.x) -
            Math.sin(angle) * (point.y - transformedCenter.y) +
            transformedCenter.x,
          y:
            Math.sin(angle) * (point.x - transformedCenter.x) +
            Math.cos(angle) * (point.y - transformedCenter.y) +
            transformedCenter.y,
        };
      });

      console.log(transformed);

      // draw on canvas as small circles
      ctx.strokeStyle = "black";
      transformed.forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 0.1, 0, 2 * Math.PI);
        ctx.stroke();
      });
      // draw the boundary
      ctx.strokeStyle = "green";
      ctx.beginPath();
      transformedBoundary.forEach((points) => {
        //   console.log(points);
        // draw a point at each point
        ctx.lineTo(points.x, points.y);
      });
      ctx.closePath();
      ctx.stroke();

      // draw the center
      ctx.strokeStyle = "red";
      ctx.beginPath();
      ctx.arc(transformedCenter.x, transformedCenter.y, 1, 0, 2 * Math.PI);
      ctx.stroke();

      // draw the vertices
      ctx.strokeStyle = "blue";
      ctx.beginPath();
      shape.vertices.forEach((points) => {
        //   console.log(points);
        // draw a point at each point
        ctx.lineTo(points.x, points.y);
      });
      ctx.closePath();
      ctx.stroke();
    });
  }
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
