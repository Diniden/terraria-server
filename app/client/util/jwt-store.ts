/**
 * This works on storing our jwt in localStorage. This IS a bad idea for security purposes as it's
 * susceptible to other javascript and plugins running on the client for whatever reason.
 *
 * This isn't a super high security application so I don't care enough to make it super secure as
 * I don't have that kind of free time. So for now: we will create security through some very simple
 * obfuscation. We will put a lot of gargabe data into the localstorage and only one will be the
 * true JWT token extracted. We won't even key the token with something readable.
 */

import { lsHandle } from "../types";

/**
 * This is our handle that hangs onto the proper key for the store. We won't use any proper name
 * here, just in case obfuscation doesn't properly clobber the name.
 */
let ITWGJSTA = 0;
// Initial wipe of any token we may have
(window as any)[btoa(`${lsHandle}`)].clear();

/** Make a fake token */
function randomJWT(p1: string, p2: string, p3: string) {
  let np1 = '';

  for (let i = 0; i < p1.length; ++i) {
    np1 += p1[Math.floor(Math.random() * p1.length)];
  }

  let np2 = '';

  for (let i = 0; i < p2.length; ++i) {
    np2 += p2[Math.floor(Math.random() * p2.length)];
  }

  let np3 = '';

  for (let i = 0; i < p3.length; ++i) {
    np3 += p3[Math.floor(Math.random() * p3.length)];
  }

  return `${np1}.${np2}.${np3}`;
}

/**
 * Sets the token
 */
export function OBJATTYLOC(token: string) {
  const segments = token.split('.');
  // We are setting the token. So lets clear all from local storage and create a bunch of random handler
  // numbers for keys. We'll pick a random key in number format and retain that handle.
  (window as any)[btoa(`${lsHandle}`)].clear();
  let handles: any[] = new Array(10000).fill(0);
  handles = handles.map(() => Math.ceil(Math.random() * 10000));
  // Now pick one of our handles as our token storage
  ITWGJSTA = handles[Math.floor(Math.random() * handles.length)];
  // Take our handles and encode them
  handles = handles.map(btoa);
  // Store fake tokens for all of our handles
  handles.forEach(h => {
    (window as any)[btoa(`${lsHandle}`)].setItem(h, randomJWT(segments[0], segments[1], segments[2]));
  });
  // Store the real token at the selected handle
  (window as any)[btoa(`${lsHandle}`)].setItem(btoa(`${ITWGJSTA}`), token);
}

/**
 * Pulls the token
 */
export function COLYTTAJBO() {
  return (window as any)[btoa(`${lsHandle}`)].getItem(btoa(`${ITWGJSTA}`));
}
