const bus = document.getElementById("bus");
const gameArea = document.getElementById("gameArea");
let positionX = 140;
let positionY = 20;

document.addEventListener("keydown", moveBus);

function moveBus(e) {
  const step = 10;
  if (e.key === "ArrowLeft" && positionX > 0) {
    positionX -= step;
  } else if (e.key === "ArrowRight" && positionX < 280) {
    positionX += step;
  } else if (e.key === "ArrowUp" && positionY < 400) {
    positionY += step;
  } else if (e.key === "ArrowDown" && positionY > 0) {
    positionY -= step;
  }
  bus.style.left = positionX + "px";
  bus.style.bottom = positionY + "px";
}
