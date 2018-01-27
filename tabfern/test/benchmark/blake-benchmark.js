// blake-benchmark.js
// blake2s-js is window.BLAKE2s
// blakejs is window.BlakeJS

'use strict';

// Rename them since their names are too similar
var both = window.BlakeJS;
var sonly = window.BLAKE2s;

function logToPage(msg)
{
    $('#results').append(msg + '\n');
} //logToPage

// make test data: an array of strings

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz:/%#.;,'.split('');
const MAXSTRLEN = 128;

const NDATA = 1024;
let Data = Array(NDATA);

let rng = new window.seedrandom(42);

// Modified from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(rng() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

for(let idx=0; idx<NDATA; ++idx) {
    Data[idx] = '';
    let strlen = getRandomInt(1, MAXSTRLEN);
    for(let charidx=0; charidx<strlen; ++charidx) {
        Data[idx] = Data[idx] + ALPHABET[getRandomInt(0,ALPHABET.length)];
    }
}

// https://stackoverflow.com/a/12646864/2877364 by
// https://stackoverflow.com/users/310500/laurens-holst
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Pull the things in random order
let Indices = _.range(NDATA);
shuffleArray(Indices);

// Save the outputs and check them at the end
let sonly_output = Array(NDATA);
let both_output = Array(NDATA);

// set up the test suites

var suite = new Benchmark.Suite;

suite
.add('blake2s-js ("sonly")',()=>{
    for(let idx=0; idx<NDATA; ++idx) {
        let blake = new sonly(32);
        let databuf = new Uint8Array(Buffer.from(Data[Indices[idx]], 'utf8'));
        blake.update(databuf);
        sonly_output[idx] = blake.hexDigest();
    }
})
.add('blakejs ("both")',()=>{
    for(let idx=0; idx< NDATA; ++idx) {
        both_output[idx] = both.blake2sHex(Data[Indices[idx]]);
            // which actually does all the things sonly does, but wrapped
            // in one function for convenience.
    }
})
.on('cycle', function(event) {
  logToPage(String(event.target));
})
.on('complete', function() {
    let msg = 'Fastest is ' + this.filter('fastest').map('name');
    logToPage(msg);

    for(let idx=0; idx<NDATA; ++idx) {
        if(sonly_output[idx] !== both_output[idx]) {
            logToPage(`${idx} mismatch: sonly ${sonly_output[idx]} !== ${both_output[idx]} both`);
        }
    }
    logToPage('done.');
})

$(()=>{
    logToPage('Hello, world!');
    $('#go-btn').on('click',()=>{
        logToPage('Running...');
        suite.run({ 'async': true });
    });
});

// vi: set ts=4 sts=4 sw=4 et ai fo-=ro: //
