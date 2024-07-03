import sys
import os
from fastapi import FastAPI
from pydantic import BaseModel

sys.path.insert(0, os.path.abspath("hand"))

from demo import Hand

hand = Hand()
app = FastAPI()

IMG_DIR = "img"

if not os.path.exists(IMG_DIR):
    os.makedirs(IMG_DIR)


@app.get("/")
def read_root():
    return {
        "ok": True,
        "message": "Handwriting Generation API",
    }


def fileExists(filename):
    return os.path.isfile(os.path.join(IMG_DIR, filename))


def randomFileName():
    import random
    import string

    letters = string.ascii_lowercase
    name = "".join(random.choice(letters) for i in range(10))
    while fileExists(name):
        name = "".join(random.choice(letters) for i in range(10))
    return name


class GenData(BaseModel):
    text: str


@app.post("/gen")
def post_gen(data: GenData):
    filename = randomFileName()
    hand.write(
        filename="img/" + filename + ".svg", lines=[data.text], biases=[1], styles=[3]
    )
    return {
        "ok": True,
        "filename": filename,
    }


# start the server
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
