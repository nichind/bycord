# !/bin/bash

host=localhost 
port=9975

SCRIPT=$(readlink -f "$0")
SCRIPTPATH=$(dirname "$SCRIPT")
python_executable=$(which python3.11)
cd $SCRIPTPATH
echo "Starting bycord on $host:$port with $python_executable" 
$python_executable -m venv $SCRIPTPATH/.venv
source .venv/bin/activate
$python_executable -m pip install --upgrade pip
$python_executable -m pip install -r requirements.txt
sudo kill -9 `sudo lsof -t -i:$port`
$python_executable -m uvicorn app:app --host $host --port $port --reload --ws wsproto