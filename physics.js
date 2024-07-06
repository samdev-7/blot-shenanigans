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

// run the engine
let start = Date.now();
while (true) {
  ticks++;
  console.log(ticks);
  Runner.tick(runner, engine, 1000 / 60);
  let velA = Vector.magnitude(boxA.velocity);
  let velB = Vector.magnitude(boxB.velocity);
  if ((Math.max(velA, velB) < 1e-12 && ticks > 100) || ticks > 1000) {
    break;
  }
}
console.log("took", Date.now() - start, "ms.", "ticks", ticks);

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
