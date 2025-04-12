import eel
import screeninfo

screen = screeninfo.get_monitors()[0]

# Python code starts HERE
eel.init("web")

 # App starts HERE
if __name__ == "__main__":
    try:
        eel.start('index.html', size=(screen.width, screen.height))
    except (SystemExit, MemoryError, KeyboardInterrupt):
        pass
    
