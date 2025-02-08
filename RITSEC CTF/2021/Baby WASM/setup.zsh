#!/bin/zsh

tar -xzf attachment/v8.debug.tar.gz -C .
tar -xzf attachment/v8.release.tar.gz -C .

# install depot_tools
git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git ~/depot_tools
echo "
export PATH=\$HOME/depot_tools:\$PATH
export NINJA_SUMMARIZE_BUILD=1" >>~/.zshrc
source ~/.zshrc

# get v8
mkdir ~/v8
cp attachment/v8.diff ~/v8
git clone https://chromium.googlesource.com/v8/v8.git ~/v8/v8
cd ~/v8/v8
git checkout 0d81cd72688512abcbe1601015baee390c484a6a
git apply ../v8.diff

# sync submodules
pushd ..
echo 'solutions = [
  {
    "name": "v8",
    "url": "https://chromium.googlesource.com/v8/v8.git",
    "deps_file": "DEPS",
    "managed": False,
    "custom_deps": {},
  },
]' >.gclient
gclient sync -D

# install dependencies
popd
./build/install-build-deps.sh
sudo apt install -y ninja-build

# install gdb plugin
echo "
source $HOME/v8/v8/tools/gdbinit" >>~/.gdbinit

# build v8
gn gen out/debug --args='target_os="linux" target_cpu="x64" is_component_build=false v8_optimized_debug=false'
autoninja -C out/debug d8
