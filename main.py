import eel
import screeninfo

screen = screeninfo.get_monitors()[0]
print(screen)
# Python code starts HERE
eel.init("web")

 # App starts HERE
if __name__ == "__main__":
    try:
        eel.start('index.html', size=(screen.width/1.5, screen.height/1.5))
    except (SystemExit, MemoryError, KeyboardInterrupt):
        pass
    
