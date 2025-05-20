import eel
import screeninfo
import subprocess
import platform
import threading
import time
import json
import requests
import socket
import struct
import copy

screen = screeninfo.get_monitors()[0]
print(screen)
# Python code starts HERE
eel.init("web")

adoptedDevicesDict = {} # Global dictionary for all adopted devices
device_status_cache = {} # Cache for device status to avoid excessive pings
status_cache_timeout = 30 # Seconds before status cache expires
matrix_configuration = {
    "rows": 0,
    "columns": 0,
    "cells": []
} # Store the current matrix configuration

# Dictionary to store WLED controllers for each device
wled_controllers = {}

# Global streaming state
streaming_state = {
    "is_streaming": False,
    "streaming_thread": None,
    "stop_event": None,
    "fps": 60,
    "selected_device_id": None,
    "stats": {
        "frames_streamed": 0,
        "successful_frames": 0,
        "failed_frames": 0,
        "start_time": None
    }
}

# Store device grid data on the Python side
device_grids_data = {}

def apply_gamma_correction(color, gamma):
    """
    Apply gamma correction to an RGB tuple.

    Args:
        color (tuple): (R, G, B)
        gamma (float): Gamma correction factor

    Returns:
        list: Gamma-corrected [R, G, B]
    """
    return [
        int(255 * ((channel / 255) ** gamma)) for channel in color
    ]

class WLEDController:
    def __init__(self, ip_address, width, height, protocol="http", debug=False):
        """
        Initialize the WLED controller.
        
        Args:
            ip_address (str): IP address of the WLED device
            width (int): Width of the LED grid
            height (int): Height of the LED grid
            protocol (str): Protocol to use for sending data ("http", "ddp")
            debug (bool): Enable debug mode for more verbose output
        """
        self.ip_address = ip_address
        self.width = width
        self.height = height
        self.protocol = protocol
        self.debug = debug
        self.base_url = f"http://{ip_address}/json"
        self.api_url = f"http://{ip_address}/json/state"
        self.led_count = width * height
        
        # DDP settings
        self.ddp_port = 4048  # Default DDP port
        self.ddp_socket = None
        
        # Check if WLED is reachable
        try:
            response = requests.get(f"http://{ip_address}/", timeout=2)
            if response.status_code == 200:
                print(f"Successfully connected to WLED device at {ip_address}")
                
                # Get WLED info if possible
                try:
                    info_response = requests.get(self.base_url, timeout=2)
                    if info_response.status_code == 200:
                        info = info_response.json()
                        if 'leds' in info and 'count' in info['leds']:
                            wled_led_count = info['leds']['count']
                            if wled_led_count != self.led_count:
                                print(f"Warning: WLED reports {wled_led_count} LEDs, but grid is {width}x{height} = {self.led_count} LEDs")
                except Exception as e:
                    if self.debug:
                        print(f"Could not get WLED info: {e}")
            else:
                print(f"Connected to {ip_address}, but received status code {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"Warning: Could not connect to WLED device: {e}")
            print("Will attempt to send data anyway.")
        
        # Initialize DDP socket if using DDP
        if protocol == "ddp":
            self.init_ddp_socket()

        self.last_heartbeat_time = time.time()
        self.heartbeat_interval = 2.0  # Send heartbeat every 2 seconds if no data is sent
    
    def init_ddp_socket(self):
        """Initialize the UDP socket for DDP protocol."""
        try:
            self.ddp_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            print(f"Initialized DDP socket for {self.ip_address}:{self.ddp_port}")
            
            # Turn on the LEDs if they're off
            try:
                info_response = requests.get(self.base_url, timeout=2)
                if info_response.status_code == 200:
                    info = info_response.json()
                    if 'state' in info and 'on' in info['state'] and not info['state']['on']:
                        print("WLED is off, turning it on...")
                        requests.post(self.api_url, json={"on": True})
            except Exception as e:
                if self.debug:
                    print(f"Could not check/set WLED state: {e}")
        except Exception as e:
            print(f"Failed to initialize DDP socket: {e}")
            self.ddp_socket = None
    
    
    def send_frame_ddp(self, pixel_data):
        """
        Send a frame of pixel data to the WLED device using DDP protocol.
        Based on the TypeScript implementation.
        
        Args:
            pixel_data (list): List of RGB values for each LED
            
        Returns:
            bool: True if successful, False otherwise
        """
        if not self.ddp_socket:
            self.init_ddp_socket()
            if not self.ddp_socket:
                print("Failed to initialize DDP socket")
                return False
    
        try:
            # Flatten the pixel data into a byte array
            data_bytes = bytearray()
            for pixel in pixel_data:
                # Ensure RGB values are in the correct range
                r = max(0, min(255, pixel[0]))
                g = max(0, min(255, pixel[1]))
                b = max(0, min(255, pixel[2]))
                data_bytes.extend([r, g, b])
        
            # Create DDP header (10 bytes) based on TypeScript implementation
            # Byte 0: Version (0x01)
            # Byte 1: Reserved (0x00)
            # Byte 2: Data type (0x01 for RGB data)
            # Byte 3: Output ID (0x01 for default output)
            # Bytes 4-7: Offset (32-bit, big-endian)
            # Bytes 8-9: Data length (16-bit, big-endian)
        
            version = 0x01
            reserved = 0x00
            data_type = 0x01
            output_id = 0x01
            offset = 0
            length = len(data_bytes)
        
            # Create the header using big-endian byte order
            header = bytearray([version, reserved, data_type, output_id])
            header.extend(struct.pack(">I", offset))  # 32-bit big-endian offset
            header.extend(struct.pack(">H", length))  # 16-bit big-endian length
        
            # Combine header and data
            packet = header + data_bytes
        
            # Send the packet
            self.ddp_socket.sendto(packet, (self.ip_address, self.ddp_port))
        
            # Also send a small heartbeat to keep the connection alive
            # This is a tiny packet that won't affect performance but keeps the connection active
            self.last_heartbeat_time = time.time()
        
            if self.debug:
                print(f"Sent DDP packet: {len(packet)} bytes (header: 10 bytes, data: {length} bytes)")
        
            return True
        except Exception as e:
            print(f"Failed to send DDP packet: {e}")
            return False

def get_wled_controller(device_info):
    """
    Get or create a WLED controller for a device
    
    Args:
        device_info (dict): Device information including IP, grid dimensions
        
    Returns:
        WLEDController: The controller for the device
    """
    device_id = f"{device_info['name']}_{device_info['ip']}"
    
    # If controller already exists, return it
    if device_id in wled_controllers:
        return wled_controllers[device_id]
    
    # Create a new controller
    controller = WLEDController(
        ip_address=device_info['ip'],
        width=device_info['gridColumns'],
        height=device_info['gridRows'],
        protocol="ddp",  # Use DDP protocol for faster updates
        debug=False
    )
    
    # Store the controller for future use
    wled_controllers[device_id] = controller
    
    return controller

def convert_pixel_data_to_rgb(pixel_data, apply_gamma=True, gamma=2.8):
    """
    Convert pixel data from our format to RGB list format for WLED
    
    Args:
        pixel_data (dict): Pixel data in our format
        apply_gamma (bool): Whether to apply gamma correction
        gamma (float): Gamma correction factor
        
    Returns:
        list: List of RGB values for each LED
    """
    rgb_data = []
    
    # Process each cell in the pixel data
    for cell in pixel_data['cells']:
        # Convert hex color to RGB
        color = cell['color']
        if color.startswith('#'):
            color = color[1:]  # Remove the # if present
        
        # Convert hex to RGB
        r = int(color[0:2], 16)
        g = int(color[2:4], 16)
        b = int(color[4:6], 16)
        
        # Apply gamma correction if requested
        if apply_gamma:
            r, g, b = apply_gamma_correction((r, g, b), gamma)
        
        # Add to RGB data list
        rgb_data.append([r, g, b])
    
    return rgb_data

@eel.expose
def adopt_device(device_info):
    # Create a unique key for the device using name and IP
    device_key = f"{device_info['name']}_{device_info['ip']}"
    
    # Check if device is already adopted
    if device_key in adoptedDevicesDict:
        print(f"Device: {device_info['name']} ({device_info['ip']}) already adopted.")
        return {"success": False, "message": "Device already adopted"}
    
    # If not already adopted, add it to the dictionary
    adoptedDevicesDict[device_key] = device_info
    print(f"Device: {device_info['name']} ({device_info['ip']}) adopted with grid size {device_info['gridRows']}x{device_info['gridColumns']}.")
    print(adoptedDevicesDict)
    
    # Initialize WLED controller for this device
    try:
        get_wled_controller(device_info)
        print(f"WLED controller initialized for {device_info['name']} ({device_info['ip']})")
    except Exception as e:
        print(f"Failed to initialize WLED controller: {e}")
    
    # Initialize device grid data
    initialize_device_grid_data(device_info)
    
    return {"success": True, "message": "Device successfully added to collection"}

@eel.expose
def get_adopted_devices():
    # Return list of adopted devices with their info
    return list(adoptedDevicesDict.values())

@eel.expose
def check_device_status(device_info):
    """Check if a device is online by pinging it"""
    # Get the IP address from device_info
    if isinstance(device_info, dict) and 'ip' in device_info:
        ip = device_info['ip']
    else:
        # If device_info is not a dict or doesn't have an IP, return offline
        return False
    
    # Check cache first
    cache_key = ip
    current_time = time.time()
    
    if cache_key in device_status_cache:
        last_check_time, status = device_status_cache[cache_key]
        # If cache is still valid, return cached status
        if current_time - last_check_time < status_cache_timeout:
            return status
    
    # Determine the ping command based on the operating system
    ping_param = "-n" if platform.system().lower() == "windows" else "-c"
    ping_count = "1"  # Just ping once for speed
    
    # Run the ping command with a timeout
    try:
        # Use subprocess with a timeout to avoid hanging
        if platform.system().lower() == "windows":
            # Windows ping
            result = subprocess.run(
                ["ping", ping_param, ping_count, ip],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=1,  # 1 second timeout
                text=True
            )
            success = "TTL=" in result.stdout
        else:
            # Unix/Linux/Mac ping
            result = subprocess.run(
                ["ping", ping_param, ping_count, ip],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=1,  # 1 second timeout
                text=True
            )
            success = result.returncode == 0
        
        # Cache the result
        device_status_cache[cache_key] = (current_time, success)
        
        return success
    except (subprocess.TimeoutExpired, subprocess.SubprocessError):
        # If ping times out or fails, device is considered offline
        device_status_cache[cache_key] = (current_time, False)
        return False

@eel.expose
def save_matrix_configuration(config):
    """Save the current matrix configuration"""
    global matrix_configuration
    
    # Validate rows and columns (limit to 20)
    if config.get("rows", 0) > 20:
        config["rows"] = 20
    
    if config.get("columns", 0) > 20:
        config["columns"] = 20
    
    matrix_configuration = config
    print("Matrix configuration saved:")
    print(json.dumps(config, indent=2))
    return {"success": True, "message": "Matrix configuration saved"}

@eel.expose
def get_matrix_configuration():
    """Get the current matrix configuration"""
    return matrix_configuration

@eel.expose
def send_data_to_devices(pixel_data, device_id=None):
    """Send pixel data to a specific device or all devices in the matrix"""
    # If device_id is provided, send only to that device
    if device_id and device_id != "all":
        # Find the device in the adopted devices
        device = None
        for d in adoptedDevicesDict.values():
            if d.get('name') == device_id or f"{d.get('name')}_{d.get('ip')}" == device_id:
                device = d
                break
        
        if device:
            # Check if device is online
            device_status = check_device_status(device)
            if device_status:
                # Convert pixel data to RGB format
                rgb_data = convert_pixel_data_to_rgb(pixel_data, apply_gamma=True, gamma=2.8)
                
                # Get WLED controller for this device
                controller = get_wled_controller(device)
                
                # Send data to the device
                success = controller.send_frame_ddp(rgb_data)
                
                return {
                    "success": success,
                    "message": f"Data sent to device {device['name']}" if success else f"Failed to send data to {device['name']}",
                    "online": 1,
                    "offline": 0
                }
            else:
                print(f"Device offline: {device['name']} ({device['ip']})")
                return {
                    "success": False,
                    "message": f"Device {device['name']} is offline",
                    "online": 0,
                    "offline": 1
                }
        else:
            return {
                "success": False,
                "message": f"Device with ID {device_id} not found",
                "online": 0,
                "offline": 0
            }
    
    # Otherwise, send to all devices in the matrix
    online_devices = 0
    offline_devices = 0
    success_count = 0
    
    # Check each cell in the matrix
    for cell in matrix_configuration.get("cells", []):
        if cell.get("assigned") and cell.get("deviceName"):
            # Check if device is online
            device_status = check_device_status(cell["deviceName"])
            if device_status:
                online_devices += 1
                
                # Convert pixel data to RGB format
                rgb_data = convert_pixel_data_to_rgb(pixel_data, apply_gamma=True, gamma=2.8)
                
                # Get WLED controller for this device
                controller = get_wled_controller(cell["deviceName"])
                
                # Send data to the device
                if controller.send_frame_ddp(rgb_data):
                    success_count += 1
                
            else:
                offline_devices += 1
                print(f"Device offline: {cell['deviceName']['name']} ({cell['deviceName']['ip']})")
    
    # Return status information
    return {
        "success": success_count > 0,
        "message": f"Data sent to {success_count} devices. {offline_devices} devices offline.",
        "online": online_devices,
        "offline": offline_devices
    }

# New functions for device grid data management
def initialize_device_grid_data(device_info):
    """Initialize grid data for a device on the Python side"""
    device_id = f"{device_info['name']}_{device_info['ip']}"
    
    # If device already has grid data, don't overwrite it
    if device_id in device_grids_data:
        return
    
    # Create new grid data for this device
    rows = device_info['gridRows']
    columns = device_info['gridColumns']
    grid_data = []
    
    # Initialize each cell with default color
    for i in range(rows * columns):
        grid_data.append({
            "index": i,
            "color": "#ffffff"  # Default color
        })
    
    # Store in device grids data
    device_grids_data[device_id] = {
        "rows": rows,
        "columns": columns,
        "cells": grid_data
    }
    
    print(f"Initialized grid data for device {device_id}")

@eel.expose
def get_device_grid_data(device_id):
    """Get grid data for a specific device"""
    if device_id in device_grids_data:
        return device_grids_data[device_id]
    return None

@eel.expose
def update_device_grid_data(device_id, grid_data):
    """Update grid data for a specific device"""
    if device_id in device_grids_data:
        device_grids_data[device_id] = grid_data
        return True
    return False

@eel.expose
def paint_cell(device_id, index, color):
    """Paint a cell in a device's grid"""
    if device_id in device_grids_data:
        grid_data = device_grids_data[device_id]
        if 0 <= index < len(grid_data["cells"]):
            grid_data["cells"][index]["color"] = color
            return True
    return False

@eel.expose
def fill_cells(device_id, color):
    """Fill all cells in a device's grid with a color"""
    if device_id == "all":
        # Fill all devices
        for d_id in device_grids_data:
            for cell in device_grids_data[d_id]["cells"]:
                cell["color"] = color
        return True
    elif device_id == "matrix":
        # Fill all devices in the matrix
        for cell in matrix_configuration.get("cells", []):
            if cell.get("assigned") and cell.get("deviceName"):
                d_id = f"{cell['deviceName']['name']}_{cell['deviceName']['ip']}"
                if d_id in device_grids_data:
                    for pixel in device_grids_data[d_id]["cells"]:
                        pixel["color"] = color
        return True
    elif device_id in device_grids_data:
        # Fill specific device
        for cell in device_grids_data[device_id]["cells"]:
            cell["color"] = color
        return True
    return False

@eel.expose
def clear_cells(device_id):
    """Clear all cells in a device's grid (set to default color)"""
    return fill_cells(device_id, "#ffffff")

# New functions for streaming management
@eel.expose
def start_streaming(device_id, fps):
    """Start streaming pixel data to devices"""
    global streaming_state
    
    # If already streaming, stop first
    if streaming_state["is_streaming"]:
        stop_streaming()
    
    # Update streaming state
    streaming_state["is_streaming"] = True
    streaming_state["fps"] = max(1, min(120, fps))
    streaming_state["selected_device_id"] = device_id
    streaming_state["stats"] = {
        "frames_streamed": 0,
        "successful_frames": 0,
        "failed_frames": 0,
        "start_time": time.time()
    }
    
    # Create stop event for the thread
    streaming_state["stop_event"] = threading.Event()
    
    # Create and start streaming thread
    streaming_state["streaming_thread"] = threading.Thread(
        target=streaming_thread_function,
        args=(device_id, streaming_state["fps"], streaming_state["stop_event"]),
        daemon=True
    )
    streaming_state["streaming_thread"].start()
    
    # Notify UI that streaming has started
    eel.updateStreamingStatus(True, f"Streaming: Active ({fps} fps)")
    
    print(f"Started streaming at {fps} fps for device {device_id}")
    return True

@eel.expose
def stop_streaming():
    """Stop streaming pixel data to devices"""
    global streaming_state
    
    if not streaming_state["is_streaming"]:
        return False
    
    # Signal the thread to stop
    if streaming_state["stop_event"]:
        streaming_state["stop_event"].set()
    
    # Wait for the thread to finish
    if streaming_state["streaming_thread"]:
        streaming_state["streaming_thread"].join(timeout=2.0)
    
    # Calculate streaming statistics
    duration = time.time() - streaming_state["stats"]["start_time"]
    frames = streaming_state["stats"]["frames_streamed"]
    actual_fps = round(frames / max(1, duration))
    
    # Update streaming state
    streaming_state["is_streaming"] = False
    streaming_state["streaming_thread"] = None
    streaming_state["stop_event"] = None
    
    # Notify UI that streaming has stopped
    eel.updateStreamingStatus(False, "Streaming: Inactive")
    
    # Return streaming stats
    stats = {
        "frames_streamed": frames,
        "duration": duration,
        "actual_fps": actual_fps,
        "successful_frames": streaming_state["stats"]["successful_frames"],
        "failed_frames": streaming_state["stats"]["failed_frames"]
    }
    
    print(f"Stopped streaming. Sent {frames} frames ({actual_fps} fps avg)")
    return stats

def streaming_thread_function(device_id, fps, stop_event):
    """Thread function for streaming pixel data to devices"""
    interval = 1.0 / fps
    last_frame_time = 0
    
    while not stop_event.is_set():
        current_time = time.time()
        elapsed = current_time - last_frame_time
        
        # If it's time to send a new frame
        if elapsed >= interval:
            last_frame_time = current_time
            
            # Stream the frame
            stream_frame(device_id)
            
            # Update streaming stats on the UI every second
            if int(current_time) != int(last_frame_time):
                update_streaming_ui_stats()
        
        # Sleep a small amount to prevent CPU hogging
        time.sleep(max(0.001, interval / 10))

def stream_frame(device_id):
    """Stream a single frame of pixel data to the selected device(s)"""
    global streaming_state
    
    # Increment frames streamed counter
    streaming_state["stats"]["frames_streamed"] += 1
    
    if device_id == "matrix":
        # Stream to all devices in the matrix
        success = stream_to_matrix()
    elif device_id == "all":
        # Stream to all adopted devices
        success = stream_to_all_devices()
    else:
        # Stream to specific device
        success = stream_to_device(device_id)
    
    # Update success/failure stats
    if success:
        streaming_state["stats"]["successful_frames"] += 1
    else:
        streaming_state["stats"]["failed_frames"] += 1
    
    return success

def stream_to_device(device_id):
    """Stream pixel data to a specific device"""
    if device_id not in device_grids_data:
        return False
    
    # Find the device in the adopted devices
    device = None
    for d in adoptedDevicesDict.values():
        if f"{d.get('name')}_{d.get('ip')}" == device_id:
            device = d
            break
    
    if not device:
        return False
    
    try:
        # Get the pixel data for this device
        pixel_data = {
            "rows": device_grids_data[device_id]["rows"],
            "columns": device_grids_data[device_id]["columns"],
            "cells": device_grids_data[device_id]["cells"]
        }
        
        # Convert to RGB format
        rgb_data = convert_pixel_data_to_rgb(pixel_data)
        
        # Get WLED controller for this device
        controller = get_wled_controller(device)
        
        # Send data to the device
        return controller.send_frame_ddp(rgb_data)
    except Exception as e:
        print(f"Error streaming to device {device_id}: {e}")
        return False

def stream_to_matrix():
    """Stream pixel data to all devices in the matrix"""
    success_count = 0
    device_count = 0
    
    # Check each cell in the matrix
    for cell in matrix_configuration.get("cells", []):
        if cell.get("assigned") and cell.get("deviceName"):
            device_count += 1
            device_id = f"{cell['deviceName']['name']}_{cell['deviceName']['ip']}"
            
            if stream_to_device(device_id):
                success_count += 1
    
    return success_count > 0 if device_count > 0 else False

def stream_to_all_devices():
    """Stream pixel data to all adopted devices"""
    success_count = 0
    
    # Stream to each adopted device
    for device in adoptedDevicesDict.values():
        device_id = f"{device['name']}_{device['ip']}"
        if stream_to_device(device_id):
            success_count += 1
    
    return success_count > 0 if adoptedDevicesDict else False

def update_streaming_ui_stats():
    """Update the UI with current streaming statistics"""
    if not streaming_state["is_streaming"]:
        return
    
    # Calculate current stats
    duration = time.time() - streaming_state["stats"]["start_time"]
    frames = streaming_state["stats"]["frames_streamed"]
    actual_fps = round(frames / max(1, duration))
    target_fps = streaming_state["fps"]
    
    # Update UI with current stats
    status_text = f"Streaming: Active ({target_fps} fps target, {actual_fps} fps actual)"
    eel.updateStreamingStatus(True, status_text)

# Function to periodically clean the status cache
def clean_status_cache():
    while True:
        time.sleep(60)  # Check every minute
        current_time = time.time()
        # Remove entries older than the timeout
        for ip in list(device_status_cache.keys()):
            last_check_time, _ = device_status_cache[ip]
            if current_time - last_check_time > status_cache_timeout:
                del device_status_cache[ip]

# Start the cache cleaning thread
cache_cleaning_thread = threading.Thread(target=clean_status_cache, daemon=True)
cache_cleaning_thread.start()

# Add this function to the Python backend
@eel.expose
def remove_device(device_info):
    """Remove a device from the collection"""
    global adoptedDevicesDict
    
    # Create a unique key for the device using name and IP
    device_key = f"{device_info['name']}_{device_info['ip']}"
    
    # Check if device exists in the dictionary
    if device_key in adoptedDevicesDict:
        # Remove from the dictionary
        del adoptedDevicesDict[device_key]
        
        # Remove from WLED controllers if it exists
        if device_key in wled_controllers:
            del wled_controllers[device_key]
        
        # Remove from device grids data if it exists
        if device_key in device_grids_data:
            del device_grids_data[device_key]
        
        print(f"Device: {device_info['name']} ({device_info['ip']}) removed from collection.")
        return {"success": True, "message": "Device successfully removed from collection"}
    else:
        print(f"Device: {device_info['name']} ({device_info['ip']}) not found in collection.")
        return {"success": False, "message": "Device not found in collection"}

# App starts HERE
if __name__ == "__main__":
    try:
        eel.start('index.html', size=(int(screen.width/1.5), int(screen.height/1.5)))
    except (SystemExit, MemoryError, KeyboardInterrupt):
        # Make sure to stop streaming if the app is closed
        if streaming_state["is_streaming"]:
            stop_streaming()
        pass
