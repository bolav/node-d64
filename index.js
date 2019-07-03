const D64lib = require('./d64');

const D64 = D64lib.read('Pyramid.d64');

D64.print_directory()
const fn = D64.files[0].filename;
console.log(fn);

const file_contents = D64.load(fn);

const fs = require('fs');
fs.writeFile("tmp", file_contents, function (err) {
    if (err) {
        return console.log(err);
    }

    console.log("The file was saved!");
});
