import sys
import os

sys.path.insert(0, os.path.abspath("hand"))

from demo import Hand


hand = Hand()
hand.write(
    filename="test.svg",
    lines=["hello world"],
)
