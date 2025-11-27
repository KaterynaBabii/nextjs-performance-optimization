#!/bin/bash
# System Information Collection Script
# Collects hardware and software information for reproducibility documentation

echo "=========================================="
echo "System Information Collection"
echo "Date: $(date)"
echo "=========================================="
echo ""

echo "=== Operating System ==="
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "OS: Linux"
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo "Distribution: $NAME"
        echo "Version: $VERSION"
    fi
    echo "Kernel: $(uname -r)"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "OS: macOS"
    sw_vers
    echo "Kernel: $(uname -r)"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    echo "OS: Windows"
    systeminfo | findstr /B /C:"OS Name" /C:"OS Version"
fi
echo ""

echo "=== CPU Information ==="
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "Model: $(lscpu | grep 'Model name' | cut -d: -f2 | xargs)"
    echo "Cores: $(nproc)"
    echo "Architecture: $(lscpu | grep 'Architecture' | cut -d: -f2 | xargs)"
    echo "CPU MHz: $(lscpu | grep 'CPU max MHz' | cut -d: -f2 | xargs)"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    sysctl -n machdep.cpu.brand_string
    sysctl -n hw.ncpu
    sysctl -n hw.physicalcpu
    sysctl -n hw.logicalcpu
    sysctl -n machdep.cpu.features
fi
echo ""

echo "=== Memory Information ==="
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    free -h
    echo "Total RAM: $(free -h | grep Mem | awk '{print $2}')"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    sysctl hw.memsize | awk '{printf "Total RAM: %.2f GB\n", $2/1024/1024/1024}'
    vm_stat | head -n 5
fi
echo ""

echo "=== Disk Information ==="
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    df -h / | tail -n 1
elif [[ "$OSTYPE" == "darwin"* ]]; then
    df -h / | tail -n 1
fi
echo ""

echo "=== Network Information ==="
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "Interface: $(ip route get 8.8.8.8 2>/dev/null | awk '{print $5; exit}')"
    echo "IP Address: $(hostname -I | awk '{print $1}')"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Interface: $(route get default | grep interface | awk '{print $2}')"
    echo "IP Address: $(ipconfig getifaddr $(route get default | grep interface | awk '{print $2}'))"
fi
echo ""

echo "=== Node.js Information ==="
if command -v node &> /dev/null; then
    echo "Node.js version: $(node --version)"
    echo "NPM version: $(npm --version)"
else
    echo "Node.js not found"
fi
echo ""

echo "=== Python Information ==="
if command -v python3 &> /dev/null; then
    echo "Python version: $(python3 --version)"
    echo "Python path: $(which python3)"
elif command -v python &> /dev/null; then
    echo "Python version: $(python --version)"
    echo "Python path: $(which python)"
else
    echo "Python not found"
fi
echo ""

echo "=== Browser Information ==="
if command -v google-chrome &> /dev/null; then
    echo "Chrome version: $(google-chrome --version)"
elif command -v chromium-browser &> /dev/null; then
    echo "Chromium version: $(chromium-browser --version)"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    if [ -d "/Applications/Google Chrome.app" ]; then
        echo "Chrome version: $(/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --version)"
    fi
fi
echo ""

echo "=== Load Testing Tools ==="
if command -v k6 &> /dev/null; then
    echo "k6 version: $(k6 version)"
else
    echo "k6 not installed"
fi

if command -v artillery &> /dev/null; then
    echo "Artillery version: $(artillery --version)"
else
    echo "Artillery not installed"
fi
echo ""

echo "=== Performance Testing Tools ==="
if command -v lighthouse &> /dev/null; then
    echo "Lighthouse version: $(lighthouse --version)"
else
    echo "Lighthouse not installed"
fi
echo ""

echo "=== GPU Information (if available) ==="
if command -v nvidia-smi &> /dev/null; then
    nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader
elif [[ "$OSTYPE" == "darwin"* ]]; then
    system_profiler SPDisplaysDataType | grep -A 5 "Chipset Model"
fi
echo ""

echo "=========================================="
echo "Collection complete"
echo "=========================================="

