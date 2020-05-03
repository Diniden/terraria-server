// For our obfuscation purposes, give localstorage a random name
export const lsHandle = Math.ceil(Math.random() * 100000);
(window as any)[btoa(`${lsHandle}`)] = window.localStorage;
