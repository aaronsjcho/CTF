#!/bin/zsh

# install depot_tools
git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git ~/depot_tools
echo "
export PATH=\$HOME/depot_tools:\$PATH
export NINJA_SUMMARIZE_BUILD=1" >>~/.zshrc
source ~/.zshrc

# get v8
mkdir ~/v8
cp attachment/d8_strip_global.patch ~/v8
cp attachment/add_hole.patch ~/v8
cp dcheck.diff ~/v8
git clone https://chromium.googlesource.com/v8/v8.git ~/v8/v8
cd ~/v8/v8
git checkout 63cb7fb817e60e5633fb622baf18c59da7a0a682

# sync submodules
cd ..
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
cd v8
./build/install-build-deps.sh

# install gdb plugin
echo "
source $HOME/v8/v8/tools/gdbinit" >>~/.gdbinit

# build v8
gn gen out/debug --args='target_os="linux" target_cpu="x64" v8_enable_sandbox=true is_component_build=false v8_optimized_debug=false'
git apply ../d8_strip_global.patch ../add_hole.patch ../dcheck.diff
autoninja -C out/debug d8
